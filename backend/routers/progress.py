"""
routers/progress.py — Progress tracking and weak-topic analysis endpoints.

GET /progress/weak-topics?session_id=...
  Aggregates QuizResult entries by topic_tag.
  Returns topics where accuracy is below 60%.

GET /progress/stats?session_id=...
  Returns historical quiz scores and total questions attempted.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import QuizResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/weak-topics")
async def get_weak_topics(session_id: str, db: Session = Depends(get_db)):
    results = db.query(QuizResult).filter(QuizResult.session_id == session_id).all()

    if not results:
        return {"weak_topics": [], "has_history": False}

    topic_stats: dict[str, dict[str, int]] = {}
    for r in results:
        tag = r.topic_tag or "General"
        if tag not in topic_stats:
            topic_stats[tag] = {"total": 0, "correct": 0}
        topic_stats[tag]["total"] += 1
        if r.is_correct:
            topic_stats[tag]["correct"] += 1

    weak_topics: list[dict[str, Any]] = []
    for tag, stats in topic_stats.items():
        accuracy = round((stats["correct"] / stats["total"]) * 100, 1)
        if accuracy < 60.0 or stats["total"] >= 2:
            weak_topics.append({
                "topic": tag,
                "accuracy_pct": accuracy,
                "total_questions": stats["total"],
                "incorrect_count": stats["total"] - stats["correct"],
                "status": "Needs Review" if accuracy < 60.0 else "Proficient"
            })

    # Sort weakest first
    weak_topics.sort(key=lambda x: x["accuracy_pct"])

    return {
        "weak_topics": weak_topics,
        "has_history": True,
        "total_attempts": len(results)
    }


@router.get("/stats")
async def get_stats(session_id: str, db: Session = Depends(get_db)):
    results = (
        db.query(QuizResult)
        .filter(QuizResult.session_id == session_id)
        .order_by(QuizResult.created_at.asc())
        .all()
    )

    if not results:
        return {"history": [], "overall_accuracy": 0, "total_questions": 0}

    # Group by created_at timestamp string
    attempts: list[dict[str, Any]] = []
    for r in results:
        attempts.append({
            "id": r.id,
            "topic": r.topic_tag,
            "is_correct": r.is_correct,
            "quiz_score_pct": r.quiz_score_pct,
            "timestamp": r.created_at.strftime("%b %d, %H:%M") if r.created_at else "Recent",
        })

    total = len(results)
    correct = sum(1 for r in results if r.is_correct)
    overall_accuracy = round((correct / total) * 100, 1) if total > 0 else 0

    return {
        "history": attempts,
        "overall_accuracy": overall_accuracy,
        "total_questions": total,
    }
