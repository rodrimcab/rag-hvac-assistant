from typing import Literal

from pydantic import BaseModel


class ManualDocumentInfo(BaseModel):
    """PDF file as it exists on disk — produced by DocumentService."""

    file_name: str
    size_bytes: int
    absolute_path: str


class ManualDocumentResponse(BaseModel):
    """API response shape for a single manual entry."""

    file_name: str
    size_bytes: int
    indexed: bool


class UploadAcceptedResponse(BaseModel):
    """Returned immediately after a successful upload (ingestion runs in background)."""

    filename: str
    status: Literal["processing"] = "processing"


class IngestStatusResponse(BaseModel):
    """Current state of the background ingestion job."""

    status: Literal["idle", "processing", "done", "error"]
    filename: str | None = None
    chunks_total: int = 0
    chunks_done: int = 0
    error_message: str | None = None
    # Present only while ``status == "processing"`` — helps the UI show clear phases.
    ingest_step: Literal["reading_pages", "building_index"] | None = None
