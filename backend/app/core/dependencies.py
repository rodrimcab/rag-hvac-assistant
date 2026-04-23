from functools import lru_cache

from app.core.config import Settings
from app.services.document_service import DocumentService
from app.services.indexing_service import IndexingService
from app.services.ingest_service import IngestService
from app.services.rag_service import RAGService


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_indexing_service() -> IndexingService:
    return IndexingService(get_settings())


@lru_cache
def get_document_service() -> DocumentService:
    return DocumentService(get_settings())


@lru_cache
def get_rag_service() -> RAGService:
    return RAGService(settings=get_settings())


@lru_cache
def get_ingest_service() -> IngestService:
    return IngestService(
        settings=get_settings(),
        indexing_service=get_indexing_service(),
        rag_service=get_rag_service(),
    )
