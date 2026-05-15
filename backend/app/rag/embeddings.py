from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from app.core.config import Settings


def build_embedding_model(settings: Settings) -> GoogleGenAIEmbedding:
    """Gemini embedding model configured for Tier 1 throughput."""
    return GoogleGenAIEmbedding(
        model_name=settings.gemini_embedding_model,
        api_key=settings.google_api_key,
        embed_batch_size=settings.embedding_batch_size,
    )
