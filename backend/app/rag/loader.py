from pathlib import Path

from llama_index.core import Document
from llama_index.readers.file import PDFReader


def load_pdf_manuals(manuals_dir: Path) -> list[Document]:
    """Load every `*.pdf` under ``manuals_dir`` into LlamaIndex ``Document`` nodes."""
    if not manuals_dir.is_dir():
        return []

    reader = PDFReader()
    documents: list[Document] = []
    for path in sorted(manuals_dir.glob("*.pdf")):
        for doc in reader.load_data(file=path):
            meta = dict(doc.metadata or {})
            meta.setdefault("file_name", path.name)
            doc.metadata = meta
            documents.append(doc)

    return documents
