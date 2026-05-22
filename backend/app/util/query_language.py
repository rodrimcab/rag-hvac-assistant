"""Detect answer language from the technician's current question (MVP heuristics)."""

from __future__ import annotations

import re
import unicodedata
from typing import Literal

AnswerLanguage = Literal["es", "en"]

_PREGUNTA_ACTUAL_MARKERS = (
    "pregunta actual:",
    "«pregunta actual:»",
)

# Function words — HVAC loanwords (outdoor, compressor, etc.) are intentionally omitted.
_SPANISH_HINTS = frozenset({
    "que", "como", "cual", "cuales", "cuando", "donde", "porque", "por",
    "esta", "estan", "este", "estos", "estas", "eso", "esa",
    "tiene", "tienen", "puede", "puedo", "debe", "debo", "hay", "hace",
    "para", "con", "sin", "sobre", "entre", "desde", "hasta", "mas", "menos",
    "muy", "tambien", "solo", "ya", "aun", "si", "no", "ni",
    "el", "la", "los", "las", "un", "una", "unos", "unas", "del", "al",
    "falla", "fallas", "equipo", "unidad", "aire", "presion", "temperatura",
    "instalacion", "mantenimiento", "revisar", "verificar", "comprobar",
    "significa", "explica", "dime", "ayuda", "hola", "gracias",
    "codigo", "alarma", "averia", "procedimiento", "diagrama", "manual",
})

_ENGLISH_HINTS = frozenset({
    "what", "how", "why", "when", "where", "which", "who",
    "the", "this", "that", "these", "those",
    "is", "are", "was", "were", "does", "do", "did", "has", "have", "had",
    "can", "could", "should", "would", "may", "might", "must",
    "please", "tell", "explain", "show", "help", "thanks", "hello",
    "fault", "troubleshooting", "meaning", "means", "procedure", "diagram",
    "unit", "equipment", "pressure", "temperature", "installation",
    "maintenance", "check", "verify", "manual", "code", "alarm",
})


def _fold_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    ).lower()


def extract_final_question_text(query_block: str) -> str:
    """Text after «PREGUNTA ACTUAL:» when present; otherwise the full block."""
    lowered = query_block.lower()
    for marker in _PREGUNTA_ACTUAL_MARKERS:
        idx = lowered.rfind(marker)
        if idx >= 0:
            return query_block[idx + len(marker) :].strip()
    return query_block.strip()


def detect_answer_language(question: str) -> AnswerLanguage:
    """
    Infer whether the assistant should answer in Spanish or English.

    Defaults to Spanish when the question is short, mixed, or ambiguous — the
    primary deployment locale for this product.
    """
    text = extract_final_question_text(question)
    if not text.strip():
        return "es"

    folded = _fold_accents(text)
    tokens = set(re.findall(r"[a-z]+", folded))

    es_score = len(tokens & _SPANISH_HINTS)
    en_score = len(tokens & _ENGLISH_HINTS)

    if "ñ" in text.lower():
        es_score += 3
    if "¿" in text or "¡" in text:
        es_score += 2
    if re.search(r"[áéíóúÁÉÍÓÚ]", text):
        es_score += 2

    if re.search(r"\bwhat\b|\bhow\b|\bwhy\b|\bthe\b", text, re.IGNORECASE):
        en_score += 2

    if es_score > en_score:
        return "es"
    if en_score > es_score:
        return "en"
    return "es"


def answer_language_directive(lang: AnswerLanguage) -> str:
    if lang == "en":
        return (
            "[MANDATORY LANGUAGE — ENGLISH ONLY: Write the entire answer in English. "
            "Do not use Spanish words or sentences, even if manual excerpts are in Spanish. "
            "Translate or paraphrase manual content into English.]"
        )
    return (
        "[IDIOMA OBLIGATORIO — SOLO ESPAÑOL: Escribí toda la respuesta en español. "
        "No uses palabras ni oraciones en inglés, aunque los extractos del manual estén en inglés. "
        "Traducí o parafraseá el contenido del manual al español.]"
    )
