"""Resolve Google Gemini API keys (paid primary, free fallback)."""

from __future__ import annotations

import logging
import os
from collections.abc import Callable, Iterator
from typing import TYPE_CHECKING, TypeVar

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)

T = TypeVar("T")

_QUOTA_MARKERS = (
    "resource_exhausted",
    "quota",
    "rate limit",
    "rate_limit",
    "too many requests",
    "429",
)


def is_retryable_google_quota_error(exc: BaseException) -> bool:
    if getattr(exc, "status_code", None) == 429:
        return True
    msg = str(exc).lower()
    return any(marker in msg for marker in _QUOTA_MARKERS)


def _env_key(name: str) -> str | None:
    value = os.getenv(name)
    if value and value.strip():
        return value.strip()
    return None


def iter_google_api_keys(settings: Settings) -> Iterator[str]:
    """Yield API keys in priority order: paid (``GOOGLE_API_KEY``) then free."""
    seen: set[str] = set()

    for key in (settings.google_api_key, _env_key("GOOGLE_API_KEY")):
        if key and key not in seen:
            seen.add(key)
            yield key

    for key in (settings.google_api_key_free, _env_key("GOOGLE_API_KEY_FREE")):
        if key and key not in seen:
            seen.add(key)
            yield key


def primary_google_api_key(settings: Settings) -> str | None:
    keys = list(iter_google_api_keys(settings))
    return keys[0] if keys else None


def has_google_api_key(settings: Settings) -> bool:
    return primary_google_api_key(settings) is not None


def has_paid_google_api_key(settings: Settings) -> bool:
    return bool(settings.google_api_key or _env_key("GOOGLE_API_KEY"))


def has_free_google_api_key(settings: Settings) -> bool:
    return bool(settings.google_api_key_free or _env_key("GOOGLE_API_KEY_FREE"))


def call_with_api_key_fallback(
    settings: Settings,
    operation: str,
    fn: Callable[[str], T],
) -> T:
    """Run ``fn(api_key)``; on quota errors, retry with the next configured key."""
    keys = list(iter_google_api_keys(settings))
    if not keys:
        raise ValueError(
            "Missing Google API key: set GOOGLE_API_KEY and/or GOOGLE_API_KEY_FREE."
        )

    last_exc: BaseException | None = None
    for index, api_key in enumerate(keys):
        if index > 0:
            logger.warning("%s_retrying_with_fallback_api_key attempt=%s", operation, index + 1)
        try:
            return fn(api_key)
        except BaseException as exc:
            last_exc = exc
            if index >= len(keys) - 1 or not is_retryable_google_quota_error(exc):
                raise
    assert last_exc is not None
    raise last_exc
