"""
services/chunking.py — Text chunking with overlap.

Splits raw extracted text segments into smaller chunks (~500 tokens / ~2000 chars)
with ~50-token (~200 char) overlap. Source metadata (filename, page_number) is
preserved on every output chunk.

We use character-based approximation rather than a tokeniser to avoid the
dependency overhead — at ~4 chars per token this is accurate enough for RAG.
"""
from __future__ import annotations

CHUNK_SIZE_CHARS = 2000   # ≈ 500 tokens
OVERLAP_CHARS = 200       # ≈ 50 tokens


def chunk_text(
    text: str,
    source_filename: str,
    page_number: int,
    chunk_size: int = CHUNK_SIZE_CHARS,
    overlap: int = OVERLAP_CHARS,
) -> list[dict]:
    """
    Split a single text block into overlapping chunks.

    Returns:
        [{"text": str, "source_filename": str, "page_number": int, "chunk_index": int}, ...]
    """
    text = text.strip()
    if not text:
        return []

    chunks: list[dict] = []
    start = 0
    idx = 0

    while start < len(text):
        end = start + chunk_size

        # Try to break at a sentence boundary (". ") or paragraph ("\n\n")
        if end < len(text):
            # Look for a good break point in the last 200 chars of the window
            search_region = text[end - 200 : end]
            for delimiter in ("\n\n", ". ", ".\n", "\n"):
                pos = search_region.rfind(delimiter)
                if pos != -1:
                    end = end - 200 + pos + len(delimiter)
                    break

        chunk_text_str = text[start:end].strip()
        if chunk_text_str:
            chunks.append(
                {
                    "text": chunk_text_str,
                    "source_filename": source_filename,
                    "page_number": page_number,
                    "chunk_index": idx,
                }
            )
            idx += 1

        # Move start forward, stepping back by overlap
        start = end - overlap
        if start >= len(text):
            break

    return chunks


def chunk_documents(raw_pages: list[dict]) -> list[dict]:
    """
    Chunk a list of raw page/slide dicts (output of extractors).

    Each input dict must have keys: text, source_filename, page_number.
    Returns flat list of chunk dicts with the same keys plus chunk_index.
    """
    all_chunks: list[dict] = []
    for page in raw_pages:
        page_chunks = chunk_text(
            text=page["text"],
            source_filename=page["source_filename"],
            page_number=page["page_number"],
        )
        all_chunks.extend(page_chunks)
    return all_chunks
