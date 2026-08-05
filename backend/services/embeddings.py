"""
services/embeddings.py — sentence-transformers wrapper.

Loads all-MiniLM-L6-v2 once as a module-level singleton (lazy, on first use)
so FastAPI startup stays fast and the model isn't reloaded between requests.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"
_model: "SentenceTransformer | None" = None


def _get_model() -> "SentenceTransformer":
    """Lazy-load the embedding model (runs on CPU)."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model %s …", _MODEL_NAME)
        _model = SentenceTransformer(_MODEL_NAME)
        logger.info("Embedding model loaded.")
    return _model


def embed(texts: list[str]) -> np.ndarray:
    """
    Embed a list of strings.

    Returns:
        np.ndarray of shape (N, 384), dtype float32.
    """
    if not texts:
        return np.empty((0, 384), dtype=np.float32)

    model = _get_model()
    vectors = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,   # cosine similarity via dot product
        show_progress_bar=False,
    )
    return vectors.astype(np.float32)


def embed_one(text: str) -> np.ndarray:
    """Convenience wrapper for a single string. Returns shape (384,)."""
    return embed([text])[0]
