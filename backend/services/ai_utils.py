"""
services/ai_utils.py — Shared utilities for AI response processing.

Centralises logic used by multiple routers (quiz, flashcards) to avoid
code duplication.
"""
from __future__ import annotations

import json
import re
import logging

logger = logging.getLogger(__name__)


def clean_ai_json(raw: str) -> str:
    """
    Strip markdown code fences and preamble from an AI response that
    should be pure JSON.

    Handles common LLM outputs like:
      ```json\n[...]\n```
      ```\n[...]\n```
      Here is the result:\n[...]
    """
    text = raw.strip()

    # Remove ```json ... ``` or ``` ... ```
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    # Some models prefix with prose — find the first [ or {
    first_bracket = None
    for i, ch in enumerate(text):
        if ch in ("[", "{"):
            first_bracket = i
            break
    if first_bracket and first_bracket > 0:
        text = text[first_bracket:]

    return text.strip()


def parse_ai_json(raw: str, *, context: str = "AI") -> list | dict:
    """
    Parse a raw AI response string into a Python list or dict.

    Raises json.JSONDecodeError with a clear message if parsing fails.
    """
    cleaned = clean_ai_json(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("%s returned malformed JSON: %.200s", context, cleaned)
        raise


def sanitize_topic_for_prompt(topic: str) -> str:
    """
    Basic sanitisation of user-supplied topic strings before they are
    interpolated into LLM system prompts.

    Mitigates trivial prompt-injection by:
      - Stripping control characters
      - Truncating to a reasonable length
      - Removing patterns that look like role-switching directives
    """
    # Strip control chars
    topic = re.sub(r"[\x00-\x1f\x7f]", "", topic)
    # Truncate
    topic = topic[:200]
    # Remove obvious injection patterns (case-insensitive)
    topic = re.sub(
        r"(?i)(ignore\s+(all\s+)?(previous\s+)?instructions|you\s+are\s+now|system\s*:)",
        "[filtered]",
        topic,
    )
    return topic.strip() or "General"
