from pathlib import Path
from typing import Any

import chromadb
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.embeddings import BaseEmbedding
from llama_index.core.schema import Document, TransformComponent
from llama_index.vector_stores.chroma import ChromaVectorStore


def build_chroma_vector_index(
    *,
    persist_path: Path,
    collection_name: str,
    embed_model: BaseEmbedding,
    documents: list[Document] | None = None,
    transformations: list[TransformComponent] | None = None,
    show_progress: bool = False,
) -> VectorStoreIndex:
    """
    Persistent dense index backed by ChromaDB at ``persist_path``.

    On first run (empty collection) ingests ``documents`` applying ``transformations``
    (e.g. ``SentenceSplitter``). On subsequent runs loads the existing collection
    without re-embedding.
    """
    persist_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(persist_path))
    collection = client.get_or_create_collection(name=collection_name)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    if collection.count() > 0:
        return VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            embed_model=embed_model,
            storage_context=storage_context,
        )

    if not documents:
        raise ValueError(
            "Chroma collection is empty and no documents were provided to ingest."
        )

    kwargs: dict[str, Any] = {
        "documents": documents,
        "embed_model": embed_model,
        "storage_context": storage_context,
        "show_progress": show_progress,
    }
    if transformations is not None:
        kwargs["transformations"] = transformations
    return VectorStoreIndex.from_documents(**kwargs)
