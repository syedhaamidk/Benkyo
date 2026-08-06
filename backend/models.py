"""
models.py — SQLAlchemy ORM models for Benkyo.

Tables:
  - documents      : uploaded file metadata
  - chunks         : individual text chunks derived from documents
  - quiz_results   : per-question quiz attempt records (for weak-topic tracking)
  - flashcard_decks: generated flashcard sets
"""
import json
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator

from database import Base


# ---------------------------------------------------------------------------
# Helper: store lists/dicts as JSON text
# ---------------------------------------------------------------------------
class JSONField(TypeDecorator):
    """Thin wrapper around Text that serialises/deserialises to JSON automatically.

    Must extend TypeDecorator (not Text directly) so SQLAlchemy actually
    invokes process_bind_param / process_result_value on reads and writes.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value, ensure_ascii=False)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value  # return as-is if already a Python object (legacy rows)
        return value


# ---------------------------------------------------------------------------
# Document — one row per uploaded file
# ---------------------------------------------------------------------------
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    filename = Column(String(512), nullable=False)
    # page/slide count; None until extraction is done
    page_count = Column(Integer, nullable=True)
    # Groq-generated topic labels for this document, stored as JSON list
    topic_labels = Column(JSONField, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Chunk — a single text chunk derived from a document
# ---------------------------------------------------------------------------
class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String(64), index=True, nullable=False)
    text = Column(Text, nullable=False)
    source_filename = Column(String(512), nullable=False)
    # page number for PDFs, slide number for PPTX, 0 for plain text
    page_number = Column(Integer, nullable=False, default=0)
    chunk_index = Column(Integer, nullable=False, default=0)

    document = relationship("Document", back_populates="chunks")


# ---------------------------------------------------------------------------
# QuizResult — one row per question in a submitted quiz
# ---------------------------------------------------------------------------
class QuizResult(Base):
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    # Short label e.g. "Sorting Algorithms", inferred by Groq during quiz gen
    topic_tag = Column(String(256), nullable=False)
    question = Column(Text, nullable=False)
    user_answer = Column(String(512), nullable=True)
    correct_answer = Column(String(512), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    # Score percentage (0–100) for the whole quiz this question was part of
    quiz_score_pct = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# ---------------------------------------------------------------------------
# FlashcardDeck — a generated set of flashcards
# ---------------------------------------------------------------------------
class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    # Comma-joined document IDs used to generate this deck
    document_ids = Column(JSONField, nullable=False)
    topic = Column(String(256), nullable=True)
    # List of {front, back} dicts
    cards = Column(JSONField, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
