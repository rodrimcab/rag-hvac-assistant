from llama_index.llms.google_genai import GoogleGenAI

from app.core.config import Settings
from app.rag.google_keys import primary_google_api_key


def build_llm(settings: Settings, *, api_key: str | None = None) -> GoogleGenAI:
    """Gemini chat/completions model for synthesis."""
    return GoogleGenAI(
        model=settings.gemini_llm_model,
        api_key=api_key or primary_google_api_key(settings),
        temperature=settings.gemini_llm_temperature,
    )
