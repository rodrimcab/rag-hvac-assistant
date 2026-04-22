from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter

from app.core.config import Settings
from app.rag.embeddings import build_embedding_model
from app.rag.llm import build_llm
from app.rag.prompts import TEXT_QA_TEMPLATE
from app.rag.vector_store import build_memory_vector_index
from app.schemas.chat import RAGQueryResult, RetrievedSourceChunk
from app.services.indexing_service import IndexingService


class RAGService:
    """
    In-memory RAG: (re)builds a ``VectorStoreIndex`` from local PDFs and runs a query engine.

    Chroma persistence and HTTP endpoints are later phases; this class is the integration seam.
    """

    def __init__(self, settings: Settings, indexing_service: IndexingService) -> None:
        self._settings = settings
        self._indexing = indexing_service
        self._index: VectorStoreIndex | None = None

    def invalidate_index(self) -> None:
        self._index = None

    def _ensure_models(self) -> None:
        if not self._settings.google_api_key:
            # LlamaIndex/Google client also reads GOOGLE_API_KEY; surface a clear app-level check.
            import os

            if not os.getenv("GOOGLE_API_KEY"):
                raise ValueError(
                    "Missing Google API key: set `google_api_key` / `GOOGLE_API_KEY` in the environment."
                )

    def build_index(self, *, show_progress: bool = False) -> VectorStoreIndex:
        self._ensure_models()
        documents = self._indexing.load_manual_documents()
        if not documents:
            raise ValueError(
                f"No PDF manuals found under {self._settings.manuals_path}. "
                "Add *.pdf files to that directory."
            )

        embed_model = build_embedding_model(self._settings)
        splitter = SentenceSplitter(
            chunk_size=self._settings.rag_chunk_size,
            chunk_overlap=self._settings.rag_chunk_overlap,
        )
        self._index = build_memory_vector_index(
            documents,
            embed_model=embed_model,
            llm=None,
            show_progress=show_progress,
            transformations=[splitter],
        )
        return self._index

    def get_or_build_index(self, *, show_progress: bool = False) -> VectorStoreIndex:
        if self._index is None:
            self.build_index(show_progress=show_progress)
        assert self._index is not None
        return self._index

    def query(self, question: str) -> RAGQueryResult:
        if not question.strip():
            raise ValueError("Question must not be empty.")

        index = self.get_or_build_index()
        llm = build_llm(self._settings)

        engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=self._settings.rag_similarity_top_k,
            text_qa_template=TEXT_QA_TEMPLATE,
        )
        response = engine.query(question)

        sources: list[RetrievedSourceChunk] = []
        for node in response.source_nodes or []:
            node_text = node.get_text()
            meta = node.metadata or {}
            file_name = meta.get("file_name")
            if not isinstance(file_name, str):
                file_name = None
            score = float(node.score) if node.score is not None else None
            sources.append(
                RetrievedSourceChunk(text=node_text, file_name=file_name, score=score)
            )

        return RAGQueryResult(answer=str(response), sources=sources)
