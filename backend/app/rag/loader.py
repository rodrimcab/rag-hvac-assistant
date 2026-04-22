from pathlib import Path

from llama_index.core import Document, SimpleDirectoryReader


def load_pdf_manuals(manuals_dir: Path) -> list[Document]:
    """Load every `*.pdf` under ``manuals_dir`` into LlamaIndex ``Document`` nodes."""
    if not manuals_dir.is_dir():
        return []

    reader = SimpleDirectoryReader(
        input_dir=str(manuals_dir),
        required_exts=[".pdf"],
        recursive=False,
    )
    return reader.load_data()
