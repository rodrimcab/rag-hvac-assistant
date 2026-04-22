import threading
import time

from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from pydantic import Field, PrivateAttr

from app.core.config import Settings


class ThrottledGoogleGenAIEmbedding(GoogleGenAIEmbedding):
    """
    Wraps the Gemini embedding client with a minimum interval between HTTP calls.

    Free-tier `gemini-embedding-001` enforces low RPM; LlamaIndex otherwise fires
    `batchEmbedContents` requests back-to-back and trips 429 RESOURCE_EXHAUSTED.
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


def build_embedding_model(settings: Settings) -> ThrottledGoogleGenAIEmbedding:
    """Gemini embedding model with throttling for Free-tier RPM caps."""
    return ThrottledGoogleGenAIEmbedding(
        model_name=settings.gemini_embedding_model,
        api_key=settings.google_api_key,
        embed_batch_size=settings.embedding_batch_size,
        min_interval_seconds=settings.embedding_min_interval_seconds,
    )
