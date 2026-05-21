import logging
import threading
import time
from collections.abc import Callable

import google.genai
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from pydantic import Field, PrivateAttr

from app.core.config import Settings
from app.rag.google_keys import (
    iter_google_api_keys,
    is_retryable_google_quota_error,
    primary_google_api_key,
)

logger = logging.getLogger(__name__)


class ThrottledGoogleGenAIEmbedding(GoogleGenAIEmbedding):
    """
    Minimum interval between embedding HTTP calls (Free-tier RPM caps).

    When a paid key falls back to the free key, the interval is applied on retry.
    """

    min_interval_seconds: float = Field(default=0.0, ge=0.0)
    _throttle_lock: threading.Lock = PrivateAttr(default_factory=threading.Lock)
    _last_call_monotonic: float = PrivateAttr(default=0.0)

    def _wait_if_needed(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        with self._throttle_lock:
            now = time.monotonic()
            wait = self.min_interval_seconds - (now - self._last_call_monotonic)
            if wait > 0:
                time.sleep(wait)
            self._last_call_monotonic = time.monotonic()

    def _get_text_embeddings(self, texts: list[str]) -> list[list[float]]:
        self._wait_if_needed()
        return super()._get_text_embeddings(texts)

    def _get_text_embedding(self, text: str) -> list[float]:
        self._wait_if_needed()
        return super()._get_text_embedding(text)

    def _get_query_embedding(self, query: str) -> list[float]:
        self._wait_if_needed()
        return super()._get_query_embedding(query)


class ResilientGoogleGenAIEmbedding(ThrottledGoogleGenAIEmbedding):
    """Gemini embeddings with paid→free API key fallback on quota errors."""

    _settings: Settings = PrivateAttr()

    def __init__(self, settings: Settings, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self._settings = settings

    def _set_client_api_key(self, api_key: str) -> None:
        """Swap the GenAI client; ``api_key`` is not a Pydantic field on the base class."""
        self._client = google.genai.Client(api_key=api_key)

    def _throttled_get_text_embeddings(self, texts: list[str]) -> list[list[float]]:
        # Call ThrottledGoogleGenAIEmbedding via super(); unbound Class._method(self, …)
        # breaks llama_index's instrumented wrappers (TypeError: missing 'query'/args).
        return super()._get_text_embeddings(texts)

    def _throttled_get_text_embedding(self, text: str) -> list[float]:
        return super()._get_text_embedding(text)

    def _throttled_get_query_embedding(self, query: str) -> list[float]:
        return super()._get_query_embedding(query)

    def _run_with_fallback(
        self,
        operation: str,
        runner: Callable[[], object],
    ) -> object:
        keys = list(iter_google_api_keys(self._settings))
        if not keys:
            raise ValueError(
                "Missing Google API key: set GOOGLE_API_KEY and/or GOOGLE_API_KEY_FREE."
            )

        free_interval = self._settings.free_embedding_min_interval_seconds
        last_exc: BaseException | None = None
        for index, api_key in enumerate(keys):
            if index > 0:
                logger.warning("%s_retrying_with_fallback_api_key attempt=%s", operation, index + 1)
                if free_interval > 0:
                    time.sleep(free_interval)
                    self.min_interval_seconds = free_interval
            self._set_client_api_key(api_key)
            try:
                return runner()
            except BaseException as exc:
                last_exc = exc
                if index >= len(keys) - 1 or not is_retryable_google_quota_error(exc):
                    raise
        assert last_exc is not None
        raise last_exc

    def _get_text_embeddings(self, texts: list[str]) -> list[list[float]]:
        return self._run_with_fallback(
            "embed_batch",
            lambda: self._throttled_get_text_embeddings(texts),
        )

    def _get_text_embedding(self, text: str) -> list[float]:
        return self._run_with_fallback(
            "embed_one",
            lambda: self._throttled_get_text_embedding(text),
        )

    def _get_query_embedding(self, query: str) -> list[float]:
        return self._run_with_fallback(
            "embed_query",
            lambda: self._throttled_get_query_embedding(query),
        )


def build_embedding_model(settings: Settings) -> ResilientGoogleGenAIEmbedding:
    """Gemini embedding model with Tier 1 defaults and free-tier fallback."""
    return ResilientGoogleGenAIEmbedding(
        settings=settings,
        model_name=settings.gemini_embedding_model,
        api_key=primary_google_api_key(settings),
        embed_batch_size=settings.effective_embedding_batch_size,
        min_interval_seconds=settings.effective_embedding_min_interval_seconds,
    )
