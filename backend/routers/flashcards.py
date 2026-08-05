"""
routers/flashcards.py — Flashcard generation endpoint.

POST /flashcards/generate
  Generates flashcard front/back pairs from uploaded coursework material.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import FlashcardDeck
from services import embeddings, vector_store
from rate_limiter import limiter
from services.groq_client import chat as groq_chat, GroqServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class GenerateFlashcardsRequest(BaseModel):
    session_id: str
    topic: str = "General"
    count: int = Field(default=8, ge=2, le=15)
    document_ids: list[int] | None = None


class FlashcardItem(BaseModel):
    id: int
    front: str
    back: str
    category: str = "Term / Concept"


@router.post("/generate", response_model=list[FlashcardItem])
@limiter.limit("10/minute")
async def generate_flashcards(request: Request, body: GenerateFlashcardsRequest, db: Session = Depends(get_db)):
    if not vector_store.session_has_data(body.session_id):
        raise HTTPException(status_code=400, detail="No documents uploaded for this session.")

    query = f"Flashcard terms, definitions, key concepts, formulas about {body.topic}"
    query_vec = embeddings.embed_one(query)
    chunks = vector_store.search(
        session_id=body.session_id,
        query_vector=query_vec,
        k=10,
        document_ids=body.document_ids,
    )

    if not chunks:
        raise HTTPException(status_code=404, detail="No content found for flashcard generation.")

    context = "\n\n".join(c["text"] for c in chunks[:6])

    system_prompt = (
        "You are an expert study aid generator. "
        "Create active-recall flashcards from the study material. "
        "Return ONLY a raw JSON array of objects, with NO markdown formatting, NO preamble, NO code blocks.\n"
        "Each object MUST match this schema:\n"
        "[\n"
        "  {\n"
        '    "id": 1,\n'
        '    "front": "Term or Question",\n'
        '    "back": "Clear, concise definition or explanation",\n'
        '    "category": "Key Term"\n'
        "  }\n"
        "]"
    )

    user_prompt = f"Create exactly {body.count} flashcards from this study material:\n\n{context[:5000]}"

    try:
        raw_response = groq_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
    except GroqServiceError as exc:
        logger.warning("Groq unavailable for flashcard generation: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        clean_json = raw_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()

        cards = json.loads(clean_json)

        # Store generated deck in DB
        deck = FlashcardDeck(
            session_id=body.session_id,
            document_ids=body.document_ids or [],
            topic=body.topic,
            cards=cards,
        )
        db.add(deck)
        db.commit()

        return cards
    except json.JSONDecodeError as exc:
        logger.warning("Groq returned malformed flashcard JSON: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The AI returned an unexpected response format. Please try generating again.",
        )
    except Exception as exc:
        logger.exception("Flashcard generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Flashcard generation failed unexpectedly. Please try again.")
