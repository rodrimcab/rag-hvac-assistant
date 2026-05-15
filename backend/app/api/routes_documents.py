import shutil
from pathlib import Path

import chromadb
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.config import Settings
from app.core.dependencies import (
    get_document_service,
    get_ingest_service,
    get_rag_service,
    get_settings,
)
from app.schemas.document import (
    IngestStatusResponse,
    ManualDocumentResponse,
    UploadAcceptedResponse,
)
from app.services.document_service import DocumentService
from app.services.ingest_service import IngestService
from app.services.rag_service import RAGService

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_indexed_filenames(settings: Settings) -> set[str]:
    """Return the set of file_names that have at least one vector in ChromaDB."""
    persist_path = settings.chroma_db_absolute_path
    if not persist_path.exists():
        return set()
    try:
        client = chromadb.PersistentClient(path=str(persist_path))
        collection = client.get_collection(name=settings.chroma_collection_name)
        results = collection.get(include=["metadatas"])
        return {
            m.get("file_name", "")
            for m in (results.get("metadatas") or [])
            if m and m.get("file_name")
        }
    except Exception:
        return set()


def _delete_from_chroma(settings: Settings, file_name: str) -> None:
    """Remove all vectors whose metadata ``file_name`` matches from ChromaDB."""
    persist_path = settings.chroma_db_absolute_path
    if not persist_path.exists():
        return
    try:
        client = chromadb.PersistentClient(path=str(persist_path))
        collection = client.get_collection(name=settings.chroma_collection_name)
        collection.delete(where={"file_name": file_name})
    except Exception:
        pass


# ── GET /api/documents ────────────────────────────────────────────────────────

@router.get("", response_model=list[ManualDocumentResponse])
def list_documents(
    document_service: DocumentService = Depends(get_document_service),
    settings: Settings = Depends(get_settings),
) -> list[ManualDocumentResponse]:
    """List all PDF manuals on disk with their indexing status."""
    pdfs = document_service.list_manual_pdfs()
    indexed = _get_indexed_filenames(settings)
    return [
        ManualDocumentResponse(
            file_name=pdf.file_name,
            size_bytes=pdf.size_bytes,
            indexed=pdf.file_name in indexed,
        )
        for pdf in pdfs
    ]


# ── POST /api/documents/upload ────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=UploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def upload_document(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    ingest_service: IngestService = Depends(get_ingest_service),
) -> UploadAcceptedResponse:
    """
    Save a PDF manual to disk and start background ingestion.

    Returns ``202 Accepted`` immediately; poll ``/api/documents/ingest-status``
    to track progress.
    """
    # ── Validate file type ────────────────────────────────────────────────────
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se aceptan archivos PDF.",
        )

    # ── Read into memory to check size ────────────────────────────────────────
    content = file.file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo supera el límite de {settings.max_upload_mb} MB.",
        )

    # ── Conflict: file already exists ─────────────────────────────────────────
    dest_path = settings.manuals_path / filename
    if dest_path.exists():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un manual con el nombre '{filename}'.",
        )

    # ── Concurrency: only one ingestion at a time ─────────────────────────────
    if ingest_service.is_busy():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Hay una ingesta en curso. Espera a que termine antes de subir otro manual.",
        )

    # ── Save to disk ──────────────────────────────────────────────────────────
    settings.manuals_path.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(content)

    # ── Dispatch background ingestion ─────────────────────────────────────────
    background_tasks.add_task(ingest_service.ingest_pdf, dest_path)

    return UploadAcceptedResponse(filename=filename)


# ── GET /api/documents/ingest-status ─────────────────────────────────────────

@router.get("/ingest-status", response_model=IngestStatusResponse)
def ingest_status(
    ingest_service: IngestService = Depends(get_ingest_service),
) -> IngestStatusResponse:
    """Return the current state of the background ingestion job."""
    state = ingest_service.get_state()
    return IngestStatusResponse(
        status=state.status,
        filename=state.filename,
        chunks_total=state.chunks_total,
        chunks_done=state.chunks_done,
        error_message=state.error_message,
        ingest_step=state.ingest_step,
    )


# ── GET /api/documents/{filename}/download ───────────────────────────────────

@router.get("/{filename}/download")
def download_document(
    filename: str,
    settings: Settings = Depends(get_settings),
) -> FileResponse:
    """Stream a PDF manual back to the client as an attachment."""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre de archivo debe terminar en .pdf",
        )
    dest_path = (settings.manuals_path / filename).resolve()
    if not str(dest_path).startswith(str(settings.manuals_path.resolve())):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de archivo inválido.")
    if not dest_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el manual '{filename}'.",
        )
    return FileResponse(path=str(dest_path), media_type="application/pdf", filename=filename)


# ── DELETE /api/documents/{filename} ─────────────────────────────────────────

@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    filename: str,
    settings: Settings = Depends(get_settings),
    rag_service: RAGService = Depends(get_rag_service),
) -> None:
    """
    Delete a PDF manual from disk and remove its vectors from ChromaDB.

    The RAG index is invalidated so the next query reloads without the deleted manual.
    """
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre de archivo debe terminar en .pdf",
        )

    # Guard against path traversal
    dest_path = (settings.manuals_path / filename).resolve()
    if not str(dest_path).startswith(str(settings.manuals_path.resolve())):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de archivo inválido.")

    if not dest_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el manual '{filename}'.",
        )

    dest_path.unlink()
    _delete_from_chroma(settings, filename)
    rag_service.invalidate_index()

    images_dir = settings.images_path / Path(filename).stem
    if images_dir.exists():
        shutil.rmtree(images_dir)
