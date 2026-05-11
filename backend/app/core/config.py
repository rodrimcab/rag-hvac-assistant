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
    # Gemini 1.5 Pro was retired from the consumer API (404). Gemini 2.5 Pro is
    # paid-tier-only on new projects (Free-tier quota = 0). Flash 2.5 is the
    # most capable tier accessible on Free tier today.
    gemini_llm_model: str = "models/gemini-2.5-flash"
    gemini_llm_temperature: float = 0.1
    # If unset, diagram vision uses ``gemini_llm_model`` (same billing class as Flash).
    gemini_vision_model: str | None = None
    gemini_embedding_model: str = "gemini-embedding-001"
    manuals_dir: str = "data/manuals"
    images_dir: str = "data/images"
    rag_min_node_text_chars: int = 12
    # Winning config: 1024 / 200 offers the best recall/noise tradeoff on service manuals.
    rag_chunk_size: int = 1024
    rag_chunk_overlap: int = 200
    # Dynamic top_k per query intent (see RAGService._infer_mode).
    rag_diagnosis_top_k: int = 5
    rag_error_code_top_k: int = 3
    # Tier 1 batching for gemini-embedding-001: API maximum is 100 texts per request.
    embedding_batch_size: int = 100
    # ChromaDB persistence (relative to `backend/`).
    chroma_db_path: str = "./chroma_db"
    chroma_collection_name: str = "hvac_manuals"
    # Upload limits.
    max_upload_mb: int = 50

    # ── Diagram / page vision (ingestion only; not used per chat message) ─────
    diagram_vision_enabled: bool = True
    diagram_vision_max_pages_per_pdf: int = 10
    diagram_vision_temperature: float = 0.15
    diagram_vision_max_output_tokens: int = 1024
    diagram_page_render_dpi: float = 140.0
    diagram_page_image_max_width: int = 1280
    diagram_jpeg_quality: int = 82
    # Pages with at least this much extracted text skip vision (text-only chunking is enough).
    diagram_skip_vision_min_text_chars: int = 2600
    diagram_vision_min_images: int = 1
    # Vector-heavy pages (schematics without embedded raster images) still trigger vision.
    diagram_vision_min_drawings: int = 150

    @field_validator("cors_origins", mode="before")
    @classmethod
    def strip_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("gemini_vision_model", mode="before")
    @classmethod
    def empty_vision_model_to_none(cls, v: object) -> object:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
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

    @property
    def images_path(self) -> Path:
        return (self.backend_root / self.images_dir).resolve()

    @property
    def chroma_db_absolute_path(self) -> Path:
        return (self.backend_root / self.chroma_db_path).resolve()
