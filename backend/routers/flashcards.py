"""
routers/flashcards.py — Flashcard generation endpoint.

POST /flashcards/generate
  Generates flashcard front/back pairs from uploaded coursework material.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import FlashcardDeck
from services import embeddings, vector_store
from rate_limiter import limiter
from services.groq_client import chat as groq_chat, GroqServiceError
from services.ai_utils import parse_ai_json, sanitize_topic_for_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/flashcards", tags=["flashcards"])


# ─── Prompt constants ─────────────────────────────────────────────
FLASHCARD_SYSTEM_PROMPT = (
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

    safe_topic = sanitize_topic_for_prompt(body.topic)
    query = f"Flashcard terms, definitions, key concepts, formulas about {safe_topic}"
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

    user_prompt = f"Create exactly {body.count} flashcards from this study material:\n\n{context[:5000]}"

    try:
        raw_response = await groq_chat(
            messages=[
                {"role": "system", "content": FLASHCARD_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
    except GroqServiceError as exc:
        logger.warning("Groq unavailable for flashcard generation: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))

    try:
        cards = parse_ai_json(raw_response, context="Flashcard generation")

        if not isinstance(cards, list):
            raise ValueError("Expected a JSON array of flashcard objects")

        # Validate each card has required keys before DB insert
        validated_cards = []
        for i, card in enumerate(cards):
            if not isinstance(card, dict):
                continue
            validated_cards.append({
                "id": card.get("id", i + 1),
                "front": str(card.get("front", "")),
                "back": str(card.get("back", "")),
                "category": str(card.get("category", "Term / Concept")),
            })

        if not validated_cards:
            raise ValueError("No valid flashcard objects found in AI response")

        # Store generated deck in DB (after validation)
        deck = FlashcardDeck(
            session_id=body.session_id,
            document_ids=body.document_ids or [],
            topic=safe_topic,
            cards=validated_cards,
        )
        db.add(deck)
        db.commit()

        return validated_cards
    except (ValueError, KeyError) as exc:
        logger.warning("Groq returned malformed flashcard data: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The AI returned an unexpected response format. Please try generating again.",
        )
    except Exception as exc:
        logger.exception("Flashcard generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Flashcard generation failed unexpectedly. Please try again.")
