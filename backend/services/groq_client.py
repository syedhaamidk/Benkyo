"""
services/groq_client.py — Thin wrapper around the Groq Python SDK.

All LLM calls in Benkyo go through this module. The API key is read from
the GROQ_API_KEY environment variable (set in backend/.env).

Never expose the key to the frontend — all Groq calls are backend-only.
"""
from __future__ import annotations

import logging
import os
import time
from typing import Any

from groq import Groq, APIConnectionError, APIStatusError, APITimeoutError, RateLimitError

logger = logging.getLogger(__name__)

# Module-level Groq client (reuses HTTP connection pool)
_client: Groq | None = None

DEFAULT_MODEL = "openai/gpt-oss-120b"
WHISPER_MODEL = "whisper-large-v3"

# Requests hang the whole worker without this — 30s is generous for even a
# long RAG prompt but still fails fast enough that a user isn't left staring
# at a spinner indefinitely.
REQUEST_TIMEOUT_SECONDS = 30
MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.5


class GroqServiceError(Exception):
    """
    Raised when Groq is unreachable, rate-limited, or times out after
    retries. Routers should catch this specifically and return a clean
    503 with a user-facing message, rather than letting it bubble up as
    an unhandled 500.
    """


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env and restart."
            )
        _client = Groq(api_key=api_key, timeout=REQUEST_TIMEOUT_SECONDS)
    return _client


def chat(
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str:
    """
    Send a chat completion request to Groq, retrying transient failures
    (timeouts, connection errors, rate limits) with a short backoff.

    Args:
        messages:    OpenAI-style list of {role, content} dicts.
        model:       Groq model identifier.
        temperature: Sampling temperature.
        max_tokens:  Maximum tokens in the response.

    Returns:
        The assistant message content as a plain string.

    Raises:
        GroqServiceError if Groq is unreachable/rate-limited/times out
        after retries.
        groq.APIStatusError for non-retryable errors (e.g. bad request).
    """
    client = _get_client()
    logger.debug("Groq chat: model=%s, messages=%d", model, len(messages))

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 2):
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = completion.choices[0].message.content or ""
            logger.debug("Groq response length: %d chars", len(content))
            return content
        except (APITimeoutError, APIConnectionError, RateLimitError) as exc:
            last_error = exc
            logger.warning(
                "Groq transient error on attempt %d/%d: %s",
                attempt, MAX_RETRIES + 1, exc,
            )
            if attempt <= MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            raise GroqServiceError(
                "Groq is temporarily unreachable or rate-limited. Please try again in a moment."
            ) from exc
        except APIStatusError as exc:
            # Non-transient (bad request, auth failure, etc.) — don't retry,
            # surface it plainly so it's obvious this isn't a flaky network blip.
            logger.error("Groq API error (status %s): %s", exc.status_code, exc)
            raise GroqServiceError(
                f"Groq rejected the request (status {exc.status_code}). "
                "Check GROQ_API_KEY and model name."
            ) from exc

    # Unreachable in practice, but keeps type-checkers happy.
    raise GroqServiceError("Groq request failed.") from last_error


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe audio using Groq's Whisper endpoint.

    Args:
        audio_bytes: Raw audio file bytes (webm/mp4/wav/ogg).
        filename:    Hint for the content-type detection.

    Returns:
        Transcribed text string.

    Raises:
        GroqServiceError if Groq is unreachable after retries.
    """
    client = _get_client()
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 2):
        try:
            transcription = client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model=WHISPER_MODEL,
                response_format="text",
            )
            return str(transcription)
        except (APITimeoutError, APIConnectionError, RateLimitError) as exc:
            last_error = exc
            if attempt <= MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            raise GroqServiceError(
                "Groq is temporarily unreachable. Please try again in a moment."
            ) from exc
        except APIStatusError as exc:
            raise GroqServiceError(
                f"Groq rejected the transcription request (status {exc.status_code})."
            ) from exc

    raise GroqServiceError("Groq transcription failed.") from last_error
