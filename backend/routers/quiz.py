"""
routers/quiz.py — Quiz generation and scoring endpoints.

POST /quiz/generate
  Generates multiple-choice quiz questions based on uploaded documents.
  Body:
    {
      "session_id": str,
      "topic": str,          // optional topic filter
      "difficulty": str,     // "easy", "medium", or "hard"
      "count": int           // 3 to 10 questions
    }
  Returns JSON array of questions:
    [
      {
        "id": int,
        "question": str,
        "options": [str, str, str, str],
        "correct": int,      // 0-3 index
        "explanation": str,
        "topic_tag": str
      }
    ]

POST /quiz/submit
  Scores a completed quiz and stores QuizResult rows in DB.
  Body:
    {
      "session_id": str,
      "results": [
        {
          "question": str,
          "topic_tag": str,
          "user_answer": str,
          "correct_answer": str,
          "is_correct": bool
        }
      ]
    }
"""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import QuizResult
from services import embeddings, vector_store
from rate_limiter import limiter
from services.groq_client import chat as groq_chat, GroqServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quiz", tags=["quiz"])


# ─── Schemas ──────────────────────────────────────────────────────────

class GenerateQuizRequest(BaseModel):
    session_id: str
    topic: str = "General"
    difficulty: str = "medium"  # easy, medium, hard
    count: int = Field(default=5, ge=1, le=10)
    document_ids: list[int] | None = None


class QuestionItem(BaseModel):
    id: int
    question: str
    options: list[str]
    correct: int
    explanation: str
    topic_tag: str


class QuizAnswerSubmission(BaseModel):
    question: str
    topic_tag: str
    user_answer: str
    correct_answer: str
    is_correct: bool


class SubmitQuizRequest(BaseModel):
    session_id: str
    results: list[QuizAnswerSubmission]


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("/generate", response_model=list[QuestionItem])
@limiter.limit("10/minute")
async def generate_quiz(request: Request, body: GenerateQuizRequest):
    if not vector_store.session_has_data(body.session_id):
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded for this session.",
        )

    # 1. Retrieve context
    query = f"Quiz questions about {body.topic} key concepts and definitions"
    query_vec = embeddings.embed_one(query)
    chunks = vector_store.search(
        session_id=body.session_id,
        query_vector=query_vec,
        k=10,
        document_ids=body.document_ids,
    )

    if not chunks:
        raise HTTPException(status_code=404, detail="No relevant content found for quiz generation.")

    context = "\n\n".join(c["text"] for c in chunks[:6])

    # 2. Build Groq prompt for strict JSON array
    system_prompt = (
        "You are an expert educational quiz creator. "
        "Generate a high-quality multiple choice quiz based strictly on the provided study material. "
        f"Difficulty level: {body.difficulty.upper()}.\n"
        "Return ONLY a raw JSON array of objects with NO markdown formatting, NO markdown code blocks (no ```json), NO preamble.\n"
        "Each object in the array MUST follow this exact schema:\n"
        "[\n"
        "  {\n"
        '    "id": 1,\n'
        '    "question": "What is ...?",\n'
        '    "options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '    "correct": 0,\n'
        '    "explanation": "Why this option is correct...",\n'
        f'    "topic_tag": "{body.topic}"\n'
        "  }\n"
        "]"
    )

    user_prompt = (
        f"Generate exactly {body.count} multiple-choice questions based on this study material:\n\n"
        f"{context[:5000]}"
    )

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
        logger.warning("Groq unavailable for quiz generation: %s", exc)
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

        questions_data = json.loads(clean_json)
        return questions_data
    except json.JSONDecodeError as exc:
        logger.warning("Groq returned malformed quiz JSON: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The AI returned an unexpected response format. Please try generating again.",
        )
    except Exception as exc:
        logger.exception("Quiz generation failed: %s", exc)
        raise HTTPException(status_code=500, detail="Quiz generation failed unexpectedly. Please try again.")


@router.post("/submit")
async def submit_quiz(body: SubmitQuizRequest, db: Session = Depends(get_db)):
    if not body.results:
        return {"status": "no_results", "score_pct": 0}

    correct_count = sum(1 for r in body.results if r.is_correct)
    score_pct = int((correct_count / len(body.results)) * 100)

    for item in body.results:
        res = QuizResult(
            session_id=body.session_id,
            topic_tag=item.topic_tag or "General",
            question=item.question,
            user_answer=item.user_answer,
            correct_answer=item.correct_answer,
            is_correct=item.is_correct,
            quiz_score_pct=score_pct,
        )
        db.add(res)

    db.commit()
    return {"status": "success", "correct": correct_count, "total": len(body.results), "score_pct": score_pct}
