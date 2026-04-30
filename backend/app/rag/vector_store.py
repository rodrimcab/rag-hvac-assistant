from pathlib import Path

import chromadb
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.embeddings import BaseEmbedding
from llama_index.core.schema import BaseNode
from llama_index.vector_stores.chroma import ChromaVectorStore


def _open_store(
    persist_path: Path,
    collection_name: str,
) -> tuple[chromadb.Collection, ChromaVectorStore, StorageContext]:
    persist_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(persist_path))
    collection = client.get_or_create_collection(name=collection_name)
    vector_store = ChromaVectorStore(chroma_collection=collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return collection, vector_store, storage_context


def open_chroma_index(
    *,
    persist_path: Path,
    collection_name: str,
    embed_model: BaseEmbedding,
) -> VectorStoreIndex:
    """
    Open an existing ChromaDB collection as a VectorStoreIndex.

    Raises ``ValueError`` if the collection is empty — callers must run
    ingestion before serving queries.
    """
    collection, vector_store, storage_context = _open_store(persist_path, collection_name)
    if collection.count() == 0:
        raise ValueError(
            "No hay manuales indexados aún. "
            "Sube un PDF desde la sección Manuales técnicos."
        )
    return VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model,
        storage_context=storage_context,
    )


def add_documents_to_chroma(
    *,
    persist_path: Path,
    collection_name: str,
    embed_model: BaseEmbedding,
    nodes: list[BaseNode],
) -> VectorStoreIndex:
    """
    Incrementally embed ``nodes`` and add them to the ChromaDB collection.

    Works on both empty and existing collections. LlamaIndex uses content-based
    node IDs, so re-inserting the same chunks is idempotent (Chroma upserts).
    """
    _, vector_store, storage_context = _open_store(persist_path, collection_name)
    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=embed_model,
        storage_context=storage_context,
    )
    index.insert_nodes(nodes)
    return index
