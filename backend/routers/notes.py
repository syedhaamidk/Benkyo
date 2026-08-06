"""
routers/notes.py — Study notes and summary generation endpoints.

POST /notes/generate
  Generates comprehensive, structured study notes (Markdown) for a module.

POST /notes/summarize
  Generates a short 1-paragraph summary.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services import embeddings, vector_store
from rate_limiter import limiter
from services.groq_client import chat as groq_chat, GroqServiceError
from services.ai_utils import sanitize_topic_for_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notes", tags=["notes"])


# ─── Prompt constants ─────────────────────────────────────────────

NOTES_SYSTEM_PROMPT = (
    "You are Benkyo, an expert academic note taker. "
    "Create structured, high-value study notes in GitHub Flavored Markdown format. "
    "Do NOT write a brief summary; create comprehensive revision notes. "
    "Include these sections:\n"
    "# [Topic Title]\n"
    "## 1. Core Concepts & Overview\n"
    "## 2. Key Definitions & Terminology\n"
    "## 3. Important Principles / Formulas / Steps\n"
    "## 4. Key Takeaways & Exam Tips\n\n"
    "Use bullet points, bold emphasis, and clean markdown layout."
)

SUMMARY_SYSTEM_PROMPT = (
    "You are a concise study assistant. Write a clear, 1-paragraph summary "
    "capturing the single most important takeaway from the material."
)


class GenerateNotesRequest(BaseModel):
    session_id: str
    topic: str = "General"
    document_ids: list[int] | None = None


class NotesResponse(BaseModel):
    title: str
    content: str  # Markdown formatted text


@router.post("/generate", response_model=NotesResponse)
@limiter.limit("10/minute")
async def generate_notes(request: Request, body: GenerateNotesRequest):
    if not vector_store.session_has_data(body.session_id):
        raise HTTPException(status_code=400, detail="No documents uploaded for this session.")

    safe_topic = sanitize_topic_for_prompt(body.topic)

    query = f"Complete study overview, key definitions, main theorems, formulas, concepts for {safe_topic}"
    query_vec = embeddings.embed_one(query)
    chunks = vector_store.search(
        session_id=body.session_id,
        query_vector=query_vec,
        k=12,
        document_ids=body.document_ids,
    )

    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for notes generation.")

    context = "\n\n---\n\n".join(c["text"] for c in chunks[:8])

    user_prompt = f"Create structured study notes for '{safe_topic}' based on these excerpts:\n\n{context[:6000]}"

    try:
        markdown_text = await groq_chat(
            messages=[
                {"role": "system", "content": NOTES_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2560,
        )
        return NotesResponse(title=f"Study Notes: {safe_topic}", content=markdown_text)
    except GroqServiceError as exc:
        logger.warning("Groq unavailable for notes generation: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Notes generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Notes generation failed unexpectedly. Please try again.")


@router.post("/summarize", response_model=NotesResponse)
@limiter.limit("10/minute")
async def summarize_notes(request: Request, body: GenerateNotesRequest):
    if not vector_store.session_has_data(body.session_id):
        raise HTTPException(status_code=400, detail="No documents uploaded for this session.")

    safe_topic = sanitize_topic_for_prompt(body.topic)

    query = f"Summary of {safe_topic}"
    query_vec = embeddings.embed_one(query)
    chunks = vector_store.search(
        session_id=body.session_id,
        query_vector=query_vec,
        k=8,
        document_ids=body.document_ids,
    )

    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for summary.")

    context = "\n\n".join(c["text"] for c in chunks[:5])

    user_prompt = f"Summarize this material in one paragraph:\n\n{context[:4000]}"

    try:
        summary_text = await groq_chat(
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=512,
        )
        return NotesResponse(title=f"Executive Summary: {safe_topic}", content=summary_text)
    except GroqServiceError as exc:
        logger.warning("Groq unavailable for summary generation: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Summary generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Summary generation failed unexpectedly. Please try again.")
