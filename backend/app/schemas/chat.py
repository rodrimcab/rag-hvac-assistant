from typing import Literal

from pydantic import BaseModel, Field

QueryMode = Literal["diagnosis", "error_code"]


class ChatRequest(BaseModel):
    """Payload received from the chat endpoint."""

    message: str = Field(..., min_length=1, description="Natural-language user question.")
    conversation_id: str | None = Field(
        default=None,
        description="UUID of an existing conversation. If omitted, a new conversation is created.",
    )
    mode: QueryMode | None = Field(
        default=None,
        description="Override retrieval profile. If omitted, inferred from the question.",
    )
    brand: str | None = Field(
        default=None,
        min_length=1,
        description="Optional brand filter (for example: Midea, Daikin, LG).",
    )


class RetrievedSourceChunk(BaseModel):
    """One retrieved passage used (or available) for the answer."""

    text: str
    file_name: str | None = None
    score: float | None = None
    page_number: int | None = None
    has_diagram_context: bool = False
    image_urls: list[str] = []


class RAGQueryResult(BaseModel):
    """Structured result from the RAG pipeline (HTTP wiring comes in Phase 3)."""

    answer: str
    sources: list[RetrievedSourceChunk] = Field(default_factory=list)


class ChatResponse(RAGQueryResult):
    """Chat endpoint response payload."""

    conversation_id: str | None = Field(
        default=None,
        description="Conversation UUID for this turn (new or existing).",
    )
