from llama_index.llms.google_genai import GoogleGenAI

from app.core.config import Settings


def build_llm(settings: Settings) -> GoogleGenAI:
    """Gemini chat/completions model for synthesis (uses env ``GOOGLE_API_KEY`` when omitted)."""
    return GoogleGenAI(
        model=settings.gemini_llm_model,
        api_key=settings.google_api_key,
    )
