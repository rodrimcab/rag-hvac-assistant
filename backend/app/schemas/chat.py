from pydantic import BaseModel, Field


class RetrievedSourceChunk(BaseModel):
    """One retrieved passage used (or available) for the answer."""

    text: str
    file_name: str | None = None
    score: float | None = None


class RAGQueryResult(BaseModel):
    """Structured result from the RAG pipeline (HTTP wiring comes in Phase 3)."""

    answer: str
    sources: list[RetrievedSourceChunk] = Field(default_factory=list)
