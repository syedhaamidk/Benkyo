"""
routers/upload.py — File upload, extraction, chunking, and embedding endpoint.

POST /upload
  - Accepts multipart/form-data with one or more files + a session_id field.
  - Extracts text, chunks it, embeds it, and stores it in the FAISS index.
  - Persists Document + Chunk rows to SQLite.
  - Launches a background Groq task to generate topic labels for each document.

Response:
    {
      "session_id": str,
      "documents": [{"id": int, "filename": str, "page_count": int, "chunk_count": int}]
    }
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Chunk, Document
from rate_limiter import limiter
from services import chunking, embeddings, extractors, vector_store
from services.groq_client import chat as groq_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])

SUPPORTED_EXTENSIONS = {
    ".pdf", ".pptx", ".docx",  # legacy .ppt/.doc are not supported — see extractors.py
    ".txt", ".md",
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif",
}

# SEC-3: 50 MB max per file
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024


# ---------------------------------------------------------------------------
# SEC-2: Filename sanitisation
# ---------------------------------------------------------------------------

def _sanitize_filename(raw: str) -> str:
    """Strip path separators, null bytes, and HTML from user-supplied filenames."""
    # Remove path traversal
    name = Path(raw).name
    # Remove null bytes and control chars
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)
    # Remove HTML-like tags
    name = re.sub(r"<[^>]+>", "", name)
    # Collapse whitespace
    name = re.sub(r"\s+", " ", name).strip()
    return name or "unnamed_file"


# ---------------------------------------------------------------------------
# Background: generate topic labels for a document via Groq
# ---------------------------------------------------------------------------

async def _generate_topic_labels(document_id: int, combined_text: str) -> None:
    """Run in the background after upload. Stores topic labels on the Document row."""
    from database import SessionLocal

    truncated = combined_text[:6000]  # keep within context budget
    system_prompt = (
        "You are a study assistant. Given an excerpt from a study document, "
        "identify the main topics or chapters it covers. "
        "Return ONLY a JSON array of short topic strings (3–6 words each), "
        "no markdown fences, no preamble, no trailing text.\n"
        'Example: ["Newton\'s Laws of Motion", "Thermodynamics", "Wave Optics"]'
    )
    try:
        raw = await groq_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Document excerpt:\n\n{truncated}"},
            ],
            temperature=0.2,
            max_tokens=256,
        )
        labels = json.loads(raw.strip())
        if not isinstance(labels, list):
            raise ValueError("Expected a JSON array")
    except Exception as exc:
        logger.warning("Topic label generation failed for doc %d: %s", document_id, exc)
        labels = []

    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.topic_labels = labels
            db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("")
@limiter.limit("5/minute")
async def upload_files(
    request: Request,
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    session_id: str = Form(default=""),
    db: Session = Depends(get_db),
):
    if not session_id:
        session_id = str(uuid.uuid4())

    results = []

    for upload in files:
        # SEC-2: Sanitise filename
        filename = _sanitize_filename(upload.filename or "unknown")
        ext = Path(filename).suffix.lower()

        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {ext!r}. Supported: {sorted(SUPPORTED_EXTENSIONS)}",
            )

        # SEC-3: Read file with size check
        file_bytes = await upload.read()
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File '{filename}' exceeds the 50 MB size limit.",
            )

        # Save to a temp file so file-parsing libs can open it by path
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = Path(tmp.name)

        try:
            # 1. Extract raw pages/slides
            raw_pages = extractors.extract_file(tmp_path)
            page_count = max((p["page_number"] for p in raw_pages), default=0)

            # Override filenames to use the original upload name
            for p in raw_pages:
                p["source_filename"] = filename

            # 2. Chunk
            chunks = chunking.chunk_documents(raw_pages)
            if not chunks:
                logger.warning("No text extracted from %s — skipping.", filename)
                continue

            # 3. Persist Document
            doc = Document(
                session_id=session_id,
                filename=filename,
                page_count=page_count,
            )
            db.add(doc)
            db.flush()  # get doc.id before bulk insert

            # 4. Persist Chunks
            db_chunks = []
            for i, c in enumerate(chunks):
                db_chunk = Chunk(
                    document_id=doc.id,
                    session_id=session_id,
                    text=c["text"],
                    source_filename=filename,
                    page_number=c["page_number"],
                    chunk_index=i,
                )
                db_chunks.append(db_chunk)
                # Tag each chunk dict with the DB doc id for FAISS metadata
                c["document_id"] = doc.id

            db.bulk_save_objects(db_chunks)
            db.commit()

            # 5. Embed + add to FAISS
            texts = [c["text"] for c in chunks]
            vectors = embeddings.embed(texts)
            vector_store.add_chunks(session_id, chunks, vectors)

            # 6. Schedule topic-label generation (now async)
            combined_text = "\n\n".join(p["text"] for p in raw_pages)
            background_tasks.add_task(
                _generate_topic_labels, doc.id, combined_text
            )

            results.append(
                {
                    "id": doc.id,
                    "filename": filename,
                    "page_count": page_count,
                    "chunk_count": len(chunks),
                }
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Failed to process %s: %s", filename, exc)
            raise HTTPException(status_code=500, detail=f"Failed to process {filename}: {exc}")
        finally:
            tmp_path.unlink(missing_ok=True)

    return {"session_id": session_id, "documents": results}
