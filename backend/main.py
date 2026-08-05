"""
main.py — FastAPI application entrypoint for Benkyo.

Startup sequence:
  1. Load environment variables from .env
  2. Create SQLite tables (if not exists)
  3. Ensure FAISS data directory exists (vector_store module handles this at import)
  4. Mount all routers

CORS is configured to allow all origins during development; tighten this to
the Vercel/Netlify frontend URL before production deployment.

PRODUCTION NOTES:
  - Rate limiting (slowapi) is applied to expensive AI endpoints per client IP
    to prevent runaway Groq API costs from a single bad actor or a runaway
    frontend retry loop.
  - An optional shared-secret gate (BENKYO_ACCESS_KEY) can be set to require
    an X-Access-Key header on all requests. This is NOT a real multi-user auth
    system — it's a lightweight way to keep a public demo deployment from
    being hammered by strangers. If BENKYO_ACCESS_KEY is unset, the gate is
    a no-op (open access), which is fine for local development.
"""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Load .env before any service imports that read env vars
load_dotenv()

from database import Base, engine
from rate_limiter import limiter
from routers import chat, flashcards, notes, progress, quiz, upload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
)
logger = logging.getLogger("benkyo")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Benkyo API",
    description="Study-assistant backend: upload documents, ask questions, generate quizzes & flashcards.",
    version="0.1.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Optional access-key gate (demo-deployment protection, not user auth)
# ---------------------------------------------------------------------------

BENKYO_ACCESS_KEY = os.getenv("BENKYO_ACCESS_KEY")


@app.middleware("http")
async def access_key_gate(request: Request, call_next):
    # No-op if the operator hasn't set a key (local dev default).
    if not BENKYO_ACCESS_KEY:
        return await call_next(request)

    # Always allow the health check through, so uptime monitors don't need the key.
    if request.url.path == "/health":
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
# Startup: create DB tables
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    logger.info("Creating database tables …")
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready.")
    # vector_store already creates data/faiss/ at import time
    if BENKYO_ACCESS_KEY:
        logger.info("Access-key gate is ENABLED — requests require X-Access-Key.")
    else:
        logger.info("Access-key gate is DISABLED (no BENKYO_ACCESS_KEY set) — open access.")


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
# ---------------------------------------------------------------------------

@app.delete("/session/{session_id}", tags=["session"])
async def reset_session(session_id: str):
    from database import SessionLocal
    from models import Chunk, Document, FlashcardDeck, QuizResult
    from services import vector_store

    vector_store.delete_session(session_id)

    db = SessionLocal()
    try:
        db.query(QuizResult).filter(QuizResult.session_id == session_id).delete()
        db.query(FlashcardDeck).filter(FlashcardDeck.session_id == session_id).delete()
        db.query(Chunk).filter(Chunk.session_id == session_id).delete()
        db.query(Document).filter(Document.session_id == session_id).delete()
        db.commit()
    finally:
        db.close()

    return {"status": "reset", "session_id": session_id}
