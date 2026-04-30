import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Literal

from llama_index.core.node_parser import SentenceSplitter

from app.core.config import Settings
from app.rag.embeddings import build_embedding_model
from app.rag.manual_pdf_documents import build_documents_from_pdf
from app.rag.vector_store import add_documents_to_chroma
if TYPE_CHECKING:
    from app.services.rag_service import RAGService

IngestStep = Literal["validating", "reading_pages", "chunking", "indexing"]


@dataclass
class IngestState:
    status: Literal["idle", "processing", "done", "error"] = "idle"
    filename: str | None = None
    chunks_total: int = 0
    chunks_done: int = 0
    error_message: str | None = None
    ingest_step: IngestStep | None = None


class IngestService:
    """
    Manages background ingestion of PDF manuals into ChromaDB.

    Ingestion runs in a background thread (via FastAPI BackgroundTasks) so the
    upload endpoint returns immediately. State can be polled via ``get_state()``.

    Only one ingestion job runs at a time — callers should check ``is_busy()``
    before dispatching a new job.
    """

    def __init__(
        self,
        settings: Settings,
        rag_service: "RAGService",
    ) -> None:
        self._settings = settings
        self._rag = rag_service
        self._state = IngestState()
        self._lock = threading.Lock()

    def get_state(self) -> IngestState:
        return self._state

    def is_busy(self) -> bool:
        return self._state.status == "processing"

    @staticmethod
    def _extract_brand_from_filename(file_name: str) -> str | None:
        stem = file_name.removesuffix(".pdf")
        if "_ServiceManual_" in stem:
            stem = stem.split("_ServiceManual_", maxsplit=1)[1]
        brand = stem.split("_", maxsplit=1)[0].strip().lower()
        return brand or None

    def ingest_pdf(self, pdf_path: Path) -> None:
        """
        Embed and store a single PDF in ChromaDB.

        Designed to be passed directly to FastAPI ``BackgroundTasks.add_task()``.
        Updates ``IngestState`` throughout so the frontend can poll progress.
        """
        with self._lock:
            if self._state.status == "processing":
                return
            self._state = IngestState(
                status="processing",
                filename=pdf_path.name,
                ingest_step="validating",
            )

        try:
            brand = self._extract_brand_from_filename(pdf_path.name)

            def page_progress(done: int, total: int) -> None:
                self._state = IngestState(
                    status="processing",
                    filename=pdf_path.name,
                    chunks_total=total,
                    chunks_done=done,
                    ingest_step="reading_pages",
                )

            documents = build_documents_from_pdf(
                pdf_path,
                self._settings,
                file_name=pdf_path.name,
                brand=brand,
                page_progress=page_progress,
            )
            if not documents:
                raise ValueError(f"No se pudo leer el archivo '{pdf_path.name}'.")

            self._state = IngestState(
                status="processing",
                filename=pdf_path.name,
                chunks_total=0,
                chunks_done=0,
                ingest_step="chunking",
            )

            splitter = SentenceSplitter(
                chunk_size=self._settings.rag_chunk_size,
                chunk_overlap=self._settings.rag_chunk_overlap,
            )
            nodes = splitter.get_nodes_from_documents(documents)
            for node in nodes:
                metadata = dict(node.metadata or {})
                metadata.setdefault("file_name", pdf_path.name)
                if brand:
                    metadata.setdefault("brand", brand)
                node.metadata = metadata

            self._state = IngestState(
                status="processing",
                filename=pdf_path.name,
                chunks_total=len(nodes),
                chunks_done=0,
                ingest_step="indexing",
            )

            embed_model = build_embedding_model(self._settings)
            add_documents_to_chroma(
                persist_path=self._settings.chroma_db_absolute_path,
                collection_name=self._settings.chroma_collection_name,
                embed_model=embed_model,
                nodes=nodes,
            )

            self._rag.invalidate_index()

            self._state = IngestState(
                status="done",
                filename=pdf_path.name,
                chunks_total=len(nodes),
                chunks_done=len(nodes),
                ingest_step=None,
            )

        except Exception as exc:
            self._state = IngestState(
                status="error",
                filename=pdf_path.name,
                error_message=str(exc),
                ingest_step=None,
            )
