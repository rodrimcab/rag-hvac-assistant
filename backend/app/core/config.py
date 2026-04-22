from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment and optional `.env` file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "RAG HVAC Assistant API"
    debug: bool = False
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # RAG / Gemini (optional until you run indexing or queries)
    google_api_key: str | None = None
    # Thesis (Cap. 4) cited Gemini 1.5 Pro; unversioned `gemini-1.5-pro` and often `gemini-1.5-pro-002`
    # return 404 on the consumer Gemini API for newer projects. Default to a current GA model;
    # override with GEMINI_LLM_MODEL (e.g. `gemini-2.5-pro` or `gemini-1.5-flash-002`) if your
    # project lists it in AI Studio.
    gemini_llm_model: str = "gemini-3-flash-preview"
    gemini_embedding_model: str = "gemini-embedding-001"
    manuals_dir: str = "data/manuals"
    # Retrieve more chunks than the LLM strictly needs, then drop empty/low-text nodes
    # so broad questions still get real passages (see ``SkipEmptyNodePostprocessor``).
    rag_similarity_top_k: int = 12
    rag_min_node_text_chars: int = 12
    # Indexing: larger token chunks => fewer embedding calls (helps free-tier / RPM limits).
    # Keep <= ~2048 tokens for gemini-embedding-001 input limits.
    rag_chunk_size: int = 2048
    rag_chunk_overlap: int = 100
    # Smaller batches reduce burst traffic on embed_content (mitigates some 429s).
    embedding_batch_size: int = 8

    @field_validator("cors_origins", mode="before")
    @classmethod
    def strip_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [part.strip() for part in self.cors_origins.split(",") if part.strip()]

    @property
    def backend_root(self) -> Path:
        """Directory that contains `app/` (the usual cwd when running uvicorn from `backend/`)."""
        return Path(__file__).resolve().parents[2]

    @property
    def manuals_path(self) -> Path:
        return (self.backend_root / self.manuals_dir).resolve()
