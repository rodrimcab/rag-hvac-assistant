import re

from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter

from app.core.config import Settings
from app.rag.embeddings import build_embedding_model
from app.rag.llm import build_llm
from app.rag.postprocessors import SkipEmptyNodePostprocessor
from app.rag.prompts import TEXT_QA_TEMPLATE
from app.rag.vector_store import build_chroma_vector_index
from app.schemas.chat import QueryMode, RAGQueryResult, RetrievedSourceChunk
from app.services.indexing_service import IndexingService

_ERROR_CODE_PATTERN = re.compile(r"\b[a-z]{1,2}\d{1,3}\b", re.IGNORECASE)
# "error" omitted intentionally — too generic in HVAC diagnosis context.
_ERROR_CODE_KEYWORDS = ("código", "codigo", "code fault", "fault code")


class RAGService:
    """RAG orchestrator: ChromaDB-backed index + dynamic retrieval per query intent."""

    def __init__(self, settings: Settings, indexing_service: IndexingService) -> None:
        self._settings = settings
        self._indexing = indexing_service
        self._index: VectorStoreIndex | None = None

    def invalidate_index(self) -> None:
        self._index = None

    def _ensure_models(self) -> None:
        if not self._settings.google_api_key:
            import os

            if not os.getenv("GOOGLE_API_KEY"):
                raise ValueError(
                    "Missing Google API key: set `google_api_key` / `GOOGLE_API_KEY` in the environment."
                )

    def _infer_mode(self, question: str) -> QueryMode:
        q = question.lower()
        if any(kw in q for kw in _ERROR_CODE_KEYWORDS):
            return "error_code"
        if _ERROR_CODE_PATTERN.search(q):
            return "error_code"
        return "diagnosis"

    def _retrieval_profile(self, mode: QueryMode) -> tuple[int, str]:
        if mode == "error_code":
            return self._settings.rag_error_code_top_k, "compact"
        return self._settings.rag_diagnosis_top_k, "tree_summarize"

    def build_index(self, *, show_progress: bool = False) -> VectorStoreIndex:
        self._ensure_models()
        embed_model = build_embedding_model(self._settings)
        splitter = SentenceSplitter(
            chunk_size=self._settings.rag_chunk_size,
            chunk_overlap=self._settings.rag_chunk_overlap,
        )

        documents = self._indexing.load_manual_documents()
        persist_path = self._settings.chroma_db_absolute_path
        has_persisted = persist_path.is_dir() and any(persist_path.iterdir())

        if not documents and not has_persisted:
            raise ValueError(
                f"No PDF manuals found under {self._settings.manuals_path} and no "
                "persisted Chroma collection to reuse. Add *.pdf files to that directory."
            )

        self._index = build_chroma_vector_index(
            persist_path=persist_path,
            collection_name=self._settings.chroma_collection_name,
            embed_model=embed_model,
            documents=documents or None,
            transformations=[splitter],
            show_progress=show_progress,
        )
        return self._index

    def get_or_build_index(self, *, show_progress: bool = False) -> VectorStoreIndex:
        if self._index is None:
            self.build_index(show_progress=show_progress)
        assert self._index is not None
        return self._index

    def query(
        self,
        question: str,
        *,
        mode: QueryMode | None = None,
    ) -> RAGQueryResult:
        if not question.strip():
            raise ValueError("Question must not be empty.")

        effective_mode: QueryMode = mode or self._infer_mode(question)
        top_k, response_mode = self._retrieval_profile(effective_mode)

        index = self.get_or_build_index()
        llm = build_llm(self._settings)

        engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=top_k,
            response_mode=response_mode,
            text_qa_template=TEXT_QA_TEMPLATE,
            node_postprocessors=[
                SkipEmptyNodePostprocessor(
                    min_chars=self._settings.rag_min_node_text_chars,
                ),
            ],
        )
        response = engine.query(question)

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
