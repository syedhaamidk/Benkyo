"""
main.py — FastAPI application entrypoint for Benkyo.

Startup sequence (via lifespan context manager):
  1. Load environment variables from .env
  2. Create SQLite tables (if not exists)
  3. Pre-load the embedding model into memory
  4. Ensure FAISS data directory exists (vector_store module handles this at import)

CORS is configured via the ALLOWED_ORIGINS env var. Defaults to
localhost:5173 and localhost:3000 for local dev.

PRODUCTION NOTES:
  - Rate limiting (slowapi) is applied to expensive AI endpoints per client IP
    to prevent runaway Groq API costs.
  - An optional shared-secret gate (BENKYO_ACCESS_KEY) can be set to require
    an X-Access-Key header on all requests. This is NOT a real multi-user auth
    system — it's a lightweight way to keep a public demo deployment from
    being hammered by strangers.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session

# Load .env before any service imports that read env vars
load_dotenv()

from database import Base, engine, get_db
from rate_limiter import limiter
from routers import chat, flashcards, notes, progress, quiz, upload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger("benkyo")


# ---------------------------------------------------------------------------
# Lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------

BENKYO_ACCESS_KEY = os.getenv("BENKYO_ACCESS_KEY")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    BUG-3 / PERF-2: Modern lifespan replaces deprecated @app.on_event.
    Also pre-loads the embedding model so the first request isn't slow.
    """
    # ── Startup ──
    logger.info("Creating database tables …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready.")

    # PERF-2: Pre-load the sentence-transformers model now, not on first request
    logger.info("Pre-loading embedding model …")
    from services import embeddings
    embeddings.embed(["warmup"])  # triggers lazy init
    logger.info("Embedding model loaded.")

    if BENKYO_ACCESS_KEY:
        logger.info("Access-key gate is ENABLED — requests require X-Access-Key.")
    else:
        logger.info("Access-key gate is DISABLED (no BENKYO_ACCESS_KEY set) — open access.")

    yield

    # ── Shutdown (cleanup goes here if needed) ──
    logger.info("Benkyo shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Benkyo API",
    description="Study-assistant backend: upload documents, ask questions, generate quizzes & flashcards.",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# CORS (SEC-5: tightened methods/headers)
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Access-Key"],
)


# ---------------------------------------------------------------------------
# Optional access-key gate (demo-deployment protection, not user auth)
# ---------------------------------------------------------------------------

@app.middleware("http")
async def access_key_gate(request: Request, call_next):
    # No-op if the operator hasn't set a key (local dev default).
    if not BENKYO_ACCESS_KEY:
        return await call_next(request)

    # Always allow the health check and OPTIONS through.
    if request.url.path == "/health" or request.method == "OPTIONS":
        return await call_next(request)

    provided = request.headers.get("x-access-key")
    if provided != BENKYO_ACCESS_KEY:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=401,
            content={"detail": "Missing or invalid X-Access-Key header."},
        )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(quiz.router)
app.include_router(flashcards.router)
app.include_router(notes.router)
app.include_router(progress.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "benkyo-api"}


# ---------------------------------------------------------------------------
# Session reset (convenience endpoint — clears FAISS + DB data for a session)
# MED-7: Now uses Depends(get_db) instead of manual SessionLocal
# ---------------------------------------------------------------------------

@app.delete("/session/{session_id}", tags=["session"])
async def reset_session(session_id: str, db: Session = Depends(get_db)):
    from models import Chunk, Document, FlashcardDeck, QuizResult
    from services import vector_store

    vector_store.delete_session(session_id)

    db.query(QuizResult).filter(QuizResult.session_id == session_id).delete()
    db.query(FlashcardDeck).filter(FlashcardDeck.session_id == session_id).delete()
    db.query(Chunk).filter(Chunk.session_id == session_id).delete()
    db.query(Document).filter(Document.session_id == session_id).delete()
    db.commit()

    return {"status": "reset", "session_id": session_id}
