from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Payload received from the chat endpoint."""

    message: str = Field(..., min_length=1, description="Natural-language user question.")


class RetrievedSourceChunk(BaseModel):
    """One retrieved passage used (or available) for the answer."""

    text: str
    file_name: str | None = None
    score: float | None = None


class RAGQueryResult(BaseModel):
    """Structured result from the RAG pipeline (HTTP wiring comes in Phase 3)."""

    answer: str
    sources: list[RetrievedSourceChunk] = Field(default_factory=list)


class ChatResponse(RAGQueryResult):
    """Chat endpoint response payload."""
