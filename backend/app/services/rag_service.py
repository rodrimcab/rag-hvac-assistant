import json
import re
import unicodedata

from llama_index.core.vector_stores import MetadataFilter, MetadataFilters
from llama_index.core import VectorStoreIndex

from app.core.config import Settings
from app.rag.embeddings import build_embedding_model
from app.rag.llm import build_llm
from app.rag.postprocessors import SkipEmptyNodePostprocessor
from app.rag.prompts import ERROR_CODE_QA_TEMPLATE, TEXT_QA_TEMPLATE
from app.rag.vector_store import open_chroma_index
from app.schemas.chat import QueryMode, RAGQueryResult, RetrievedSourceChunk

# Rule 2: letra(s) + dígito(s) [+ letra/dígito opcionales]: E6, F1, CH10, A1D2, E1A, FC-01
_ERROR_CODE_ALPHANUM = re.compile(
    r"\b[A-Z]{1,3}-?\d{1,3}[A-Z]?\d?\b",
    re.IGNORECASE,
)

# Rule 3: número puro con prefijo de contexto: "error 21", "falla 6", "alarm 88"
_ERROR_CODE_NUMERIC = re.compile(
    r"\b(?:error|falla|fault|alarm(?:a)?|código|codigo|avería|averia)\s+\d{1,3}\b",
    re.IGNORECASE,
)

# Rule 4: contexto de pantalla/parpadeo + número 2-3 dígitos: "pantalla muestra 88"
_ERROR_DISPLAY_CONTEXT = re.compile(
    r"\b(?:pantalla|display|screen|parpadea|parpadeando|blink(?:ing)?|muestra|indica)\b"
    r".{0,50}\b\d{2,3}\b",
    re.IGNORECASE | re.DOTALL,
)

# Tokens que matchean Rule 2 pero NO son códigos de error
_FALSE_POSITIVE_TOKENS = frozenset({
    "r32", "r410a", "r410", "r22", "r134a",
    "l1", "l2", "l3",
    "t1", "t2",
    "n1", "n2",
})

# Rule 1: keywords directas
_ERROR_CODE_KEYWORDS = (
    "código de error", "codigo de error",
    "código de falla", "codigo de falla",
    "código de alarma", "codigo de alarma",
    "código", "codigo",
    "fault code", "error code",
    "trouble code", "diagnostic code", "alarm code",
    "qué significa", "que significa",
)

# Substrings (accent-folded ASCII, lower) matched against ``_fold_accents(question)``.
_MANUAL_LOOKUP_HINTS = frozenset({
    "manual", "manuales", "servicio", "tecnico",
    "codigo", "error", "falla", "alarma", "fault", "trouble", "diagnostico",
    "voltaje", "amper", "presion", "temperatura",
    "compresor", "compressor", "evaporador", "condensador", "condenser",
    "refrigeran", "r32", "r410", "r22", "r134",
    "instalacion", "mantenimiento", "manten",
    "sensor", "pcb", "placa", "tablero", "electronic",
    "diagrama", "diagram", "despiece", "procedimiento",
    "medicion", "medir", "verifica", "comprobar", "resistencia",
    "inverter", "split", "ducto", "mini", "vrv", "vrf",
    "drenaje", "bomba", "calor", "frio",
    "fuga", "valvula", "electrov",
    "motor", "ventilador", "bobina", "defrost", "deshielo",
    "precaucion", "advertencia",
    "outdoor", "indoor", "equipo", "unidad", "aparato",
    "enfria", "calef", "arranc", "ruido", "vibra", "goteo", "hielo",
    "aire acondicionado", "climatiza",
    "tubo", "tubos", "linea", "lineas", "soldadura", "vacuum", "vacio",
    "superheat", "subcool", "lockout", "arranque", "parada",
    "filtro", "serpentin", "intercambiador", "gas caliente",
})

# Meta / off-topic: never attach «sources» for these (accent-folded substring match).
_SOURCE_EXPOSURE_BLOCKLIST = (
    "no muestres",
    "no mostrar",
    "no muestre",
    "sin respaldo",
    "sin fuentes",
    "don't show",
    "do not show",
    "ignore the manual",
    "ignore manual",
    "olvidate del manual",
    # Pruebas / meta (evitar falsos positivos; no usar frases demasiado cortas tipo "para probar").
    "solo para probar",
    "para probar el llm",
    "para probar el modelo",
    "probar el llm",
    "probar la ia",
    "prueba del llm",
    "solo un test",
    "es un test",
    "mensaje de test",
    "testing purposes",
    "unit test",
    "integration test",
)


def _fold_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    ).lower()


class RAGService:
    """
    Serves RAG queries from an existing ChromaDB collection.

    This service only reads — it never ingests documents. Ingestion is handled
    exclusively by ``IngestService``. If the collection is empty, ``query()``
    raises a ``ValueError`` with a user-facing message.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._index: VectorStoreIndex | None = None

    def invalidate_index(self) -> None:
        """Drop the cached index so the next query reloads from ChromaDB."""
        self._index = None

    def _ensure_api_key(self) -> None:
        if not self._settings.google_api_key:
            import os
            if not os.getenv("GOOGLE_API_KEY"):
                raise ValueError(
                    "Missing Google API key: set GOOGLE_API_KEY in the environment."
                )

    def _infer_mode(self, question: str) -> QueryMode:
        q = question.lower()

        # Rule 1 — keyword directa
        if any(kw in q for kw in _ERROR_CODE_KEYWORDS):
            return "error_code"

        # Rule 2 — token alfanumérico con filtro de falsos positivos
        for match in _ERROR_CODE_ALPHANUM.finditer(question):
            if match.group(0).lower() not in _FALSE_POSITIVE_TOKENS:
                return "error_code"

        # Rule 3 — número puro con prefijo de contexto de error
        if _ERROR_CODE_NUMERIC.search(q):
            return "error_code"

        # Rule 4 — contexto de pantalla/parpadeo con número
        if _ERROR_DISPLAY_CONTEXT.search(q):
            return "error_code"

        return "diagnosis"

    def _normalize_question(self, question: str) -> str:
        normalized = " ".join(question.split())
        return _ERROR_CODE_ALPHANUM.sub(lambda m: m.group(0).upper(), normalized)

    def _normalize_brand(self, brand: str | None) -> str | None:
        if not brand:
            return None
        cleaned = " ".join(brand.split()).strip()
        return cleaned.lower() if cleaned else None

    @staticmethod
    def _should_expose_document_sources(question: str, mode: QueryMode) -> bool:
        if mode == "error_code":
            return True
        folded = _fold_accents(" ".join(question.split()))
        if len(folded) < 8:
            return False
        for phrase in _SOURCE_EXPOSURE_BLOCKLIST:
            if phrase in folded:
                return False
        for hint in _MANUAL_LOOKUP_HINTS:
            if hint in folded:
                return True
        return False

    def _filter_sources_by_similarity(self, sources: list[RetrievedSourceChunk]) -> list[RetrievedSourceChunk]:
        scored = [s for s in sources if s.score is not None]
        if not scored:
            return []
        top = max(s.score for s in scored)
        floor = self._settings.rag_source_score_floor
        margin = self._settings.rag_source_score_margin_from_top
        cutoff = max(floor, top - margin)
        return [s for s in sources if s.score is not None and s.score >= cutoff]

    def _retrieval_profile(self, mode: QueryMode) -> tuple[int, str]:
        if mode == "error_code":
            return self._settings.rag_error_code_top_k, "compact"
        return self._settings.rag_diagnosis_top_k, "tree_summarize"

    def get_index(self) -> VectorStoreIndex:
        if self._index is None:
            self._ensure_api_key()
            embed_model = build_embedding_model(self._settings)
            self._index = open_chroma_index(
                persist_path=self._settings.chroma_db_absolute_path,
                collection_name=self._settings.chroma_collection_name,
                embed_model=embed_model,
            )
        return self._index

    def query(
        self,
        question: str,
        *,
        mode: QueryMode | None = None,
        brand: str | None = None,
    ) -> RAGQueryResult:
        if not question.strip():
            raise ValueError("Question must not be empty.")

        normalized_question = self._normalize_question(question)
        normalized_brand = self._normalize_brand(brand)
        effective_mode: QueryMode = mode or self._infer_mode(normalized_question)
        top_k, response_mode = self._retrieval_profile(effective_mode)

        index = self.get_index()
        llm = build_llm(self._settings)
        if len(normalized_question) >= 120:
            top_k += 1

        filters = None
        if normalized_brand:
            filters = MetadataFilters(
                filters=[MetadataFilter(key="brand", value=normalized_brand)],
            )

        template = ERROR_CODE_QA_TEMPLATE if effective_mode == "error_code" else TEXT_QA_TEMPLATE
        engine = index.as_query_engine(
            llm=llm,
            similarity_top_k=top_k,
            response_mode=response_mode,
            filters=filters,
            text_qa_template=template,
            node_postprocessors=[
                SkipEmptyNodePostprocessor(
                    min_chars=self._settings.rag_min_node_text_chars,
                ),
            ],
        )
        response = engine.query(normalized_question)

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
            raw_page = meta.get("page_number")
            page_number: int | None = None
            if raw_page is not None:
                try:
                    pn = int(raw_page)
                    page_number = pn if pn >= 1 else None
                except (TypeError, ValueError):
                    page_number = None
            has_diagram = bool(meta.get("has_diagram_context", False))
            raw_urls = meta.get("image_urls", "[]")
            try:
                image_urls: list[str] = (
                    json.loads(raw_urls) if isinstance(raw_urls, str)
                    else (raw_urls if isinstance(raw_urls, list) else [])
                )
            except (json.JSONDecodeError, ValueError):
                image_urls = []
            sources.append(
                RetrievedSourceChunk(
                    text=node_text,
                    file_name=file_name,
                    score=score,
                    page_number=page_number,
                    has_diagram_context=has_diagram,
                    image_urls=image_urls,
                )
            )

        if not self._should_expose_document_sources(normalized_question, effective_mode):
            sources = []
        else:
            sources = self._filter_sources_by_similarity(sources)

        return RAGQueryResult(answer=str(response), sources=sources)
