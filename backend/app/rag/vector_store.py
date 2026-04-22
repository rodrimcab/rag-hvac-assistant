from typing import Any

from llama_index.core import VectorStoreIndex
from llama_index.core.embeddings import BaseEmbedding
from llama_index.core.llms import LLM
from llama_index.core.schema import Document, TransformComponent


def build_memory_vector_index(
    documents: list[Document],
    *,
    embed_model: BaseEmbedding,
    llm: LLM | None = None,
    show_progress: bool = False,
    transformations: list[TransformComponent] | None = None,
) -> VectorStoreIndex:
    """
    In-memory dense index (no Chroma yet — Phase 6).

    ``llm`` is optional at index build time; pass the same model to ``as_query_engine`` for queries.
    """
    kwargs: dict[str, Any] = {
        "documents": documents,
        "embed_model": embed_model,
        "llm": llm,
        "show_progress": show_progress,
    }
    if transformations is not None:
        kwargs["transformations"] = transformations
    return VectorStoreIndex.from_documents(**kwargs)
