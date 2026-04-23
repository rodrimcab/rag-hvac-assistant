from pydantic import BaseModel


class ManualDocumentInfo(BaseModel):
    """Basic metadata for a manual on disk (upload flows arrive in Phase 7)."""

    file_name: str
    absolute_path: str
