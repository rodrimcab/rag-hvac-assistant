from pathlib import Path

from llama_index.core import SimpleDirectoryReader
from llama_index.core.schema import Document

from app.core.config import Settings
from app.rag.loader import load_pdf_manuals


class IndexingService:
    """Read PDF manuals from disk into LlamaIndex Documents."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def load_manual_documents(self) -> list[Document]:
        """Load all PDFs from the configured manuals directory."""
        return load_pdf_manuals(self._settings.manuals_path)

    def load_single_pdf(self, path: Path) -> list[Document]:
        """Load one specific PDF file into Documents."""
        if not path.is_file():
            return []
        reader = SimpleDirectoryReader(input_files=[str(path)])
        return reader.load_data()
