"""
routers/chat.py — RAG-backed Q&A endpoint.

POST /ask
  Body (JSON):
    {
      "question":   str,
      "session_id": str,
      "history":    [{"role": "user"|"assistant", "content": str}]  // last N turns
    }

  Response:
    {
      "answer":  str,
      "sources": [{"filename": str, "page": int, "snippet": str}]
    }
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from rate_limiter import limiter
from services import embeddings, vector_store
from services.groq_client import chat as groq_chat, GroqServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ask", tags=["chat"])

MAX_HISTORY_TURNS = 6   # keep last 6 turns (3 user + 3 assistant)
TOP_K_CHUNKS = 8


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1)
    session_id: str
    history: list[HistoryMessage] = Field(default_factory=list)
    document_ids: list[int] | None = None  # optional: limit search to specific docs


class Source(BaseModel):
    filename: str
    page: int
    snippet: str


class AskResponse(BaseModel):
    answer: str
    sources: list[Source]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("", response_model=AskResponse)
@limiter.limit("20/minute")
async def ask(request: Request, body: AskRequest):
    if not vector_store.session_has_data(body.session_id):
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded for this session. Please upload files first.",
        )

    # 1. Embed the question
    query_vec = embeddings.embed_one(body.question)

    # 2. Retrieve top-k relevant chunks
    chunks = vector_store.search(
        session_id=body.session_id,
        query_vector=query_vec,
        k=TOP_K_CHUNKS,
        document_ids=body.document_ids,
    )

    if not chunks:
        return AskResponse(
            answer="I couldn't find relevant content in your uploaded documents to answer that question.",
            sources=[],
        )

    # 3. Build context string with citations
    context_parts: list[str] = []
    for i, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"[Source {i}: {chunk['source_filename']}, page {chunk['page_number']}]\n"
            f"{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    # 4. Build messages: system + trimmed history + question
    system_message = {
        "role": "system",
        "content": (
            "You are Benkyo, an expert study assistant. "
            "Answer the student's question using ONLY the provided source excerpts below. "
            "Always cite the source number (e.g. [Source 1]) when you use information from it. "
            "If the answer is not found in the sources, say so clearly rather than guessing.\n\n"
            f"SOURCES:\n\n{context}"
        ),
    }

    # Trim history to last MAX_HISTORY_TURNS messages
    recent_history = body.history[-MAX_HISTORY_TURNS:]
    history_messages = [{"role": m.role, "content": m.content} for m in recent_history]

    messages = [system_message] + history_messages + [
        {"role": "user", "content": body.question}
    ]

    # 5. Call Groq
    try:
        answer = await groq_chat(messages=messages, temperature=0.4, max_tokens=1024)
    except GroqServiceError as exc:
        logger.warning("Groq unavailable for /ask: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error calling Groq: %s", exc)
        raise HTTPException(status_code=502, detail="The AI service failed unexpectedly. Please try again.")

    # 6. Build structured sources list
    seen_sources: set[str] = set()
    sources: list[Source] = []
    for chunk in chunks:
        key = f"{chunk['source_filename']}:{chunk['page_number']}"
        if key not in seen_sources:
            seen_sources.add(key)
            snippet = chunk["text"][:300].replace("\n", " ").strip()
            sources.append(
                Source(
                    filename=chunk["source_filename"],
                    page=chunk["page_number"],
                    snippet=snippet,
                )
            )

    return AskResponse(answer=answer, sources=sources)
