"""
services/vector_store.py — FAISS index manager.

One FAISS index per session_id, persisted to:
    data/faiss/<session_id>.index     — the FAISS binary
    data/faiss/<session_id>.meta.json — chunk metadata (text, filename, page)

The directory is created on module import so it always exists before the first
upload request.

NOTE (deployment): On Render/Railway FREE tiers the filesystem is ephemeral.
All FAISS data will be lost on container restart or redeploy.
To make indexes durable you MUST attach a persistent disk/volume.
See README.md § "Deployment Notes".
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path

import faiss
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ensure persistence directory exists at import time
# ---------------------------------------------------------------------------
FAISS_DIR = Path("data/faiss")
os.makedirs(FAISS_DIR, exist_ok=True)

EMBEDDING_DIM = 384  # all-MiniLM-L6-v2

# ---------------------------------------------------------------------------
# In-memory cache: session_id -> (faiss.Index, list[dict])
# Avoids re-loading from disk on every request within the same process.
# ---------------------------------------------------------------------------
_index_cache: dict[str, tuple[faiss.Index, list[dict]]] = {}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _index_path(session_id: str) -> Path:
    return FAISS_DIR / f"{session_id}.index"


def _meta_path(session_id: str) -> Path:
    return FAISS_DIR / f"{session_id}.meta.json"


def _load_or_create(session_id: str) -> tuple[faiss.Index, list[dict]]:
    """Return the (index, metadata) for a session, loading from disk if needed."""
    if session_id in _index_cache:
        return _index_cache[session_id]

    idx_path = _index_path(session_id)
    meta_path = _meta_path(session_id)

    if idx_path.exists() and meta_path.exists():
        index = faiss.read_index(str(idx_path))
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)
        logger.info("Loaded FAISS index for session %s (%d vectors)", session_id, index.ntotal)
    else:
        # Inner product index works with normalised embeddings as cosine similarity
        index = faiss.IndexFlatIP(EMBEDDING_DIM)
        metadata = []
        logger.info("Created new FAISS index for session %s", session_id)

    _index_cache[session_id] = (index, metadata)
    return index, metadata


def _save(session_id: str) -> None:
    """Persist index + metadata to disk."""
    index, metadata = _index_cache[session_id]
    faiss.write_index(index, str(_index_path(session_id)))
    with open(_meta_path(session_id), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False)
    logger.debug("Saved FAISS index for session %s", session_id)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def add_chunks(
    session_id: str,
    chunks: list[dict],
    vectors: np.ndarray,
) -> None:
    """
    Add pre-embedded chunks to the session index.

    Args:
        session_id: Identifies whose index to write to.
        chunks:     List of chunk metadata dicts (text, source_filename, page_number, …).
        vectors:    np.ndarray of shape (N, 384), dtype float32, normalised.
    """
    if len(chunks) != vectors.shape[0]:
        raise ValueError("chunks and vectors must have the same length")

    index, metadata = _load_or_create(session_id)
    index.add(vectors)
    metadata.extend(chunks)
    _save(session_id)
    logger.info(
        "Added %d chunks to session %s (total: %d)",
        len(chunks),
        session_id,
        index.ntotal,
    )


def search(
    session_id: str,
    query_vector: np.ndarray,
    k: int = 8,
    document_ids: list[int] | None = None,
) -> list[dict]:
    """
    Retrieve the top-k most similar chunks for a query vector.

    Args:
        session_id:   Whose index to search.
        query_vector: Shape (384,), normalised float32.
        k:            Number of results to return.
        document_ids: Optional allow-list of document DB IDs to filter by.
                      Pass None to search all documents in the session.

    Returns:
        List of chunk metadata dicts (with added "score" key), ordered by
        descending similarity.
    """
    if session_id not in _index_cache:
        _load_or_create(session_id)

    index, metadata = _index_cache[session_id]

    if index.ntotal == 0:
        return []

    query = query_vector.reshape(1, -1).astype(np.float32)
    # Fetch more than k so we can filter and still return k results
    fetch_k = min(k * 3, index.ntotal) if document_ids else min(k, index.ntotal)
    scores, indices = index.search(query, fetch_k)

    results: list[dict] = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        chunk = metadata[idx]
        if document_ids is not None and chunk.get("document_id") not in document_ids:
            continue
        results.append({**chunk, "score": float(score)})
        if len(results) >= k:
            break

    return results


def delete_session(session_id: str) -> None:
    """Remove all vectors and metadata for a session (used by reset endpoint)."""
    _index_cache.pop(session_id, None)
    _index_path(session_id).unlink(missing_ok=True)
    _meta_path(session_id).unlink(missing_ok=True)
    logger.info("Deleted FAISS index for session %s", session_id)


def session_has_data(session_id: str) -> bool:
    """Return True if the session already has at least one indexed chunk."""
    if session_id in _index_cache:
        index, _ = _index_cache[session_id]
        return index.ntotal > 0
    return _index_path(session_id).exists()
