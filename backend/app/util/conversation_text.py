"""Small helpers for conversation titles and RAG context (MVP)."""


def truncate_conversation_title(text: str | None, max_len: int = 52) -> str:
    raw = (text or "").strip()
    collapsed = " ".join(raw.split())
    if not collapsed:
        return "Nuevo diagnóstico"
    if len(collapsed) <= max_len:
        return collapsed
    return f"{collapsed[: max_len - 1].rstrip()}…"


def format_prior_messages_for_prompt(
    messages: list[tuple[str, str]],
    *,
    max_chars: int = 3500,
) -> str | None:
    """
    messages: list of (role, content) in chronological order (excluding the current user turn).
    Keeps the most recent tail that fits within ``max_chars``.
    """
    chunks_rev: list[str] = []
    total = 0
    for role, content in reversed(messages[-20:]):
        label = "Técnico" if role == "user" else "Asistente"
        chunk = f"{label}: {content.strip()}"
        if total + len(chunk) + 1 > max_chars:
            break
        chunks_rev.append(chunk)
        total += len(chunk) + 1
    if not chunks_rev:
        return None
    return "\n".join(reversed(chunks_rev))
