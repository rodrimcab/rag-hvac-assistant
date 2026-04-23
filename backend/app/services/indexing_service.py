from llama_index.core.schema import Document

from app.core.config import Settings
from app.rag.loader import load_pdf_manuals


class IndexingService:
    """Loads PDF manuals from disk; index construction is handled by ``RAGService``."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def load_manual_documents(self) -> list[Document]:
        return load_pdf_manuals(self._settings.manuals_path)
