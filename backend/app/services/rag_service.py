import re

from llama_index.core.vector_stores import MetadataFilter, MetadataFilters
from llama_index.core import VectorStoreIndex

from app.core.config import Settings
from app.rag.embeddings import build_embedding_model
from app.rag.llm import build_llm
from app.rag.postprocessors import SkipEmptyNodePostprocessor
from app.rag.prompts import TEXT_QA_TEMPLATE
from app.rag.vector_store import open_chroma_index
from app.schemas.chat import QueryMode, RAGQueryResult, RetrievedSourceChunk

_ERROR_CODE_PATTERN = re.compile(r"\b[a-z]{1,2}\d{1,3}\b", re.IGNORECASE)
# "error" omitted intentionally — too generic in HVAC diagnosis context.
_ERROR_CODE_KEYWORDS = ("código", "codigo", "code fault", "fault code")


class RAGService:
    """
    Serves RAG queries from an existing ChromaDB collection.

    This service only reads — it never ingests documents. Ingestion is handled
    exclusively by ``IngestService``. If the collection is empty, ``query()``
    raises a ``ValueError`` with a user-facing message.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._index: VectorStoreIndex | None = None

    def invalidate_index(self) -> None:
        """Drop the cached index so the next query reloads from ChromaDB."""
        self._index = None

    def _ensure_api_key(self) -> None:
        if not self._settings.google_api_key:
            import os
            if not os.getenv("GOOGLE_API_KEY"):
                raise ValueError(
                    "Missing Google API key: set GOOGLE_API_KEY in the environment."
                )

    def _infer_mode(self, question: str) -> QueryMode:
        q = question.lower()
        if any(kw in q for kw in _ERROR_CODE_KEYWORDS):
            return "error_code"
        if _ERROR_CODE_PATTERN.search(q):
            return "error_code"
        return "diagnosis"

    def _normalize_question(self, question: str) -> str:
        normalized = " ".join(question.split())
        return _ERROR_CODE_PATTERN.sub(lambda m: m.group(0).upper(), normalized)

    def _normalize_brand(self, brand: str | None) -> str | None:
        if not brand:
            return None
        cleaned = " ".join(brand.split()).strip()
        return cleaned.lower() if cleaned else None

    def _retrieval_profile(self, mode: QueryMode) -> tuple[int, str]:
        if mode == "error_code":
            return self._settings.rag_error_code_top_k, "compact"
        return self._settings.rag_diagnosis_top_k, "tree_summarize"

    def get_index(self) -> VectorStoreIndex:
        if self._index is None:
            self._ensure_api_key()
            embed_model = build_embedding_model(self._settings)
            self._index = open_chroma_index(
                persist_path=self._settings.chroma_db_absolute_path,
                collection_name=self._settings.chroma_collection_name,
                embed_model=embed_model,
            )
        return self._index

    def query(
        self,
        question: str,
        *,
        mode: QueryMode | None = None,
        brand: str | None = None,
    ) -> RAGQueryResult:
        if not question.strip():
            raise ValueError("Question must not be empty.")

        normalized_question = self._normalize_question(question)
        normalized_brand = self._normalize_brand(brand)
        effective_mode: QueryMode = mode or self._infer_mode(normalized_question)
        top_k, response_mode = self._retrieval_profile(effective_mode)

        index = self.get_index()
        llm = build_llm(self._settings)
        if len(normalized_question) >= 120:
            top_k += 1

        filters = None
        if normalized_brand:
            filters = MetadataFilters(
                filters=[MetadataFilter(key="brand", value=normalized_brand)],
            )

        engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=top_k,
            response_mode=response_mode,
            filters=filters,
            text_qa_template=TEXT_QA_TEMPLATE,
            node_postprocessors=[
                SkipEmptyNodePostprocessor(
                    min_chars=self._settings.rag_min_node_text_chars,
                ),
            ],
        )
        response = engine.query(normalized_question)

        sources: list[RetrievedSourceChunk] = []
        min_src = self._settings.rag_min_node_text_chars
        for node in response.source_nodes or []:
            node_text = node.get_text()
            if len((node_text or "").strip()) < min_src:
                continue
            meta = node.metadata or {}
            file_name = meta.get("file_name")
            if not isinstance(file_name, str):
                file_name = None
            score = float(node.score) if node.score is not None else None
            sources.append(
                RetrievedSourceChunk(text=node_text, file_name=file_name, score=score)
            )

        return RAGQueryResult(answer=str(response), sources=sources)
