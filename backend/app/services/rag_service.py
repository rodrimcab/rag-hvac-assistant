import json
import re
import unicodedata

from llama_index.core.vector_stores import MetadataFilter, MetadataFilters
from llama_index.core import VectorStoreIndex

from app.core.config import Settings
from app.rag.embeddings import build_embedding_model
from app.rag.google_keys import has_google_api_key, is_retryable_google_quota_error, iter_google_api_keys
from app.rag.llm import build_llm
from app.rag.postprocessors import SkipEmptyNodePostprocessor
from app.rag.prompts import ERROR_CODE_QA_TEMPLATE, TEXT_QA_TEMPLATE
from app.rag.vector_store import open_chroma_index
from app.schemas.chat import QueryMode, RAGQueryResult, RetrievedSourceChunk
from app.util.query_language import answer_language_directive, detect_answer_language

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

# Solo consultas explícitas sobre figuras — evita subir top_k en cualquier «procedimiento».
_DIAGRAM_QUERY_HINTS = frozenset({
    "diagrama", "diagram", "despiece", "figura", "esquema", "cableado", "wiring",
    "grafico", "ilustracion", "assembly", "disassembly", "paso a paso",
    "como se instala", "como instalar", "como desmontar", "como montar",
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
        if not has_google_api_key(self._settings):
            raise ValueError(
                "Missing Google API key: set GOOGLE_API_KEY and/or GOOGLE_API_KEY_FREE."
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

    @staticmethod
    def _is_diagram_heavy_query(question: str) -> bool:
        folded = _fold_accents(" ".join(question.split()))
        return any(hint in folded for hint in _DIAGRAM_QUERY_HINTS)

    def _filter_sources_by_similarity(
        self,
        sources: list[RetrievedSourceChunk],
        *,
        margin_from_top: float | None = None,
    ) -> list[RetrievedSourceChunk]:
        scored = [s for s in sources if s.score is not None]
        if not scored:
            return []
        top = max(s.score for s in scored)
        floor = self._settings.rag_source_score_floor
        margin = (
            margin_from_top
            if margin_from_top is not None
            else self._settings.rag_source_score_margin_from_top
        )
        cutoff = max(floor, top - margin)
        return [s for s in sources if s.score is not None and s.score >= cutoff]

    @staticmethod
    def _parse_image_urls(meta: dict) -> list[str]:
        raw_urls = meta.get("image_urls", "[]")
        try:
            if isinstance(raw_urls, str):
                parsed = json.loads(raw_urls)
                return parsed if isinstance(parsed, list) else []
            return raw_urls if isinstance(raw_urls, list) else []
        except (json.JSONDecodeError, ValueError):
            return []

    def _chunk_from_node(
        self,
        node: object,
        *,
        score: float | None,
        min_src: int,
    ) -> RetrievedSourceChunk | None:
        node_text = node.get_text()  # type: ignore[attr-defined]
        if len((node_text or "").strip()) < min_src:
            return None
        meta = getattr(node, "metadata", None) or {}
        file_name = meta.get("file_name")
        if not isinstance(file_name, str):
            file_name = None
        raw_page = meta.get("page_number")
        page_number: int | None = None
        if raw_page is not None:
            try:
                pn = int(raw_page)
                page_number = pn if pn >= 1 else None
            except (TypeError, ValueError):
                page_number = None
        return RetrievedSourceChunk(
            text=node_text,
            file_name=file_name,
            score=score,
            page_number=page_number,
            has_diagram_context=bool(meta.get("has_diagram_context", False)),
            image_urls=self._parse_image_urls(meta),
        )

    @staticmethod
    def _source_key(chunk: RetrievedSourceChunk) -> tuple[str | None, int | None]:
        return (chunk.file_name, chunk.page_number)

    def _merge_source_chunks(self, *groups: list[RetrievedSourceChunk]) -> list[RetrievedSourceChunk]:
        merged: dict[tuple[str | None, int | None], RetrievedSourceChunk] = {}
        for group in groups:
            for chunk in group:
                key = self._source_key(chunk)
                prev = merged.get(key)
                if prev is None:
                    merged[key] = chunk
                    continue
                urls = list(dict.fromkeys((prev.image_urls or []) + (chunk.image_urls or [])))
                best = chunk if (chunk.score or 0) >= (prev.score or 0) else prev
                other = prev if best is chunk else chunk
                merged[key] = best.model_copy(
                    update={
                        "image_urls": urls,
                        "has_diagram_context": prev.has_diagram_context or chunk.has_diagram_context,
                        "text": best.text if len(best.text) >= len(other.text) else other.text,
                    },
                )
        return list(merged.values())

    def _collect_sources_from_scored_nodes(
        self,
        nodes: list[object] | None,
        min_src: int,
    ) -> list[RetrievedSourceChunk]:
        out: list[RetrievedSourceChunk] = []
        for item in nodes or []:
            score = float(item.score) if getattr(item, "score", None) is not None else None  # type: ignore[attr-defined]
            node = getattr(item, "node", item)
            chunk = self._chunk_from_node(node, score=score, min_src=min_src)
            if chunk is not None:
                out.append(chunk)
        return out

    def _filter_sources_for_diagrams(self, sources: list[RetrievedSourceChunk]) -> list[RetrievedSourceChunk]:
        """
        Filtra por margen respecto al mejor hit en cada grupo.

        Las páginas con figura se comparan entre sí (no contra chunks solo texto,
        que suelen puntuar más alto). Sin fallback: si ninguna figura pasa el
        umbral, no se muestran diagramas irrelevantes.
        """
        with_images = [s for s in sources if s.image_urls]
        text_only = [s for s in sources if not s.image_urls]
        images_kept = self._filter_sources_by_similarity(
            with_images,
            margin_from_top=self._settings.rag_diagram_image_score_margin,
        )
        text_kept = self._filter_sources_by_similarity(text_only)
        return self._merge_source_chunks(images_kept, text_kept)

    def _gallery_eligible_image_keys(
        self,
        sources: list[RetrievedSourceChunk],
        *,
        diagram_heavy: bool,
        max_pages: int,
    ) -> set[tuple[str | None, int | None]]:
        """Páginas cuya figura coincide con el contexto del prompt; 0..max_pages (no relleno)."""
        with_images = [s for s in sources if s.image_urls and s.score is not None]
        if not with_images or max_pages <= 0:
            return set()

        if diagram_heavy:
            eligible = self._filter_sources_by_similarity(
                with_images,
                margin_from_top=self._settings.rag_diagram_image_score_margin,
            )
        else:
            scored_all = [s for s in sources if s.score is not None]
            if not scored_all:
                return set()
            top_global = max(s.score for s in scored_all)  # type: ignore[type-var]
            margin = self._settings.rag_gallery_context_score_margin
            cutoff = max(self._settings.rag_source_score_floor, top_global - margin)
            eligible = [s for s in with_images if (s.score or 0) >= cutoff]

        ranked = sorted(eligible, key=lambda s: s.score or 0.0, reverse=True)
        return {self._source_key(s) for s in ranked[:max_pages]}

    def _apply_gallery_image_policy(
        self,
        sources: list[RetrievedSourceChunk],
        *,
        diagram_heavy: bool,
        max_pages: int,
    ) -> list[RetrievedSourceChunk]:
        """Quita image_urls de páginas que no pasan relevancia contextual (snippets intactos)."""
        allowed = self._gallery_eligible_image_keys(
            sources,
            diagram_heavy=diagram_heavy,
            max_pages=max_pages,
        )
        out: list[RetrievedSourceChunk] = []
        for s in sources:
            if s.image_urls and self._source_key(s) not in allowed:
                out.append(s.model_copy(update={"image_urls": []}))
            else:
                out.append(s)
        return out

    def _retrieval_profile(self, mode: QueryMode, question: str) -> tuple[int, str]:
        if mode == "error_code":
            return self._settings.rag_error_code_top_k, "compact"
        top_k = self._settings.rag_diagnosis_top_k
        if self._is_diagram_heavy_query(question):
            top_k = max(top_k, self._settings.rag_diagram_top_k)
        return top_k, "tree_summarize"

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
        conversation_context: str | None = None,
    ) -> RAGQueryResult:
        if not question.strip():
            raise ValueError("Question must not be empty.")

        normalized_question = self._normalize_question(question)
        normalized_brand = self._normalize_brand(brand)
        effective_mode: QueryMode = mode or self._infer_mode(normalized_question)
        top_k, response_mode = self._retrieval_profile(effective_mode, normalized_question)

        index = self.get_index()
        if len(normalized_question) >= 120:
            top_k += 1

        filters = None
        if normalized_brand:
            filters = MetadataFilters(
                filters=[MetadataFilter(key="brand", value=normalized_brand)],
            )

        template = ERROR_CODE_QA_TEMPLATE if effective_mode == "error_code" else TEXT_QA_TEMPLATE
        postprocessors = [
            SkipEmptyNodePostprocessor(
                min_chars=self._settings.rag_min_node_text_chars,
            ),
        ]
        if conversation_context and conversation_context.strip():
            query_for_engine = (
                "[Contexto reciente de la misma conversación — referencia; "
                "la pregunta actual es la última línea después de «PREGUNTA ACTUAL:».]\n"
                f"{conversation_context.strip()}\n\n"
                f"PREGUNTA ACTUAL:\n{normalized_question}"
            )
        else:
            query_for_engine = f"PREGUNTA ACTUAL:\n{normalized_question}"

        answer_lang = detect_answer_language(normalized_question)
        query_for_engine = (
            f"{answer_language_directive(answer_lang)}\n\n{query_for_engine}"
        )

        api_keys = list(iter_google_api_keys(self._settings))
        response = None
        last_exc: BaseException | None = None
        for index_key, api_key in enumerate(api_keys):
            llm = build_llm(self._settings, api_key=api_key)
            engine = index.as_query_engine(
                llm=llm,
                similarity_top_k=top_k,
                response_mode=response_mode,
                filters=filters,
                text_qa_template=template,
                node_postprocessors=postprocessors,
            )
            try:
                response = engine.query(query_for_engine)
                break
            except BaseException as exc:
                last_exc = exc
                if index_key >= len(api_keys) - 1 or not is_retryable_google_quota_error(exc):
                    raise
        if response is None:
            assert last_exc is not None
            raise last_exc

        min_src = self._settings.rag_min_node_text_chars
        diagram_heavy = self._is_diagram_heavy_query(normalized_question)
        expose_sources = self._should_expose_document_sources(normalized_question, effective_mode)

        engine_sources = self._collect_sources_from_scored_nodes(response.source_nodes, min_src)
        follow_up = bool(conversation_context and conversation_context.strip())

        # tree_summarize suele devolver pocas source_nodes; el retriever trae todas las páginas top_k.
        retrieved_sources: list[RetrievedSourceChunk] = []
        if expose_sources:
            retriever = index.as_retriever(similarity_top_k=top_k, filters=filters)
            # En seguimientos, el embedding con todo el hilo prioriza el tema anterior
            # (p. ej. indoor/outdoor) y la galería muestra diagramas equivocados.
            retrieval_query = normalized_question if follow_up else query_for_engine
            retrieved = retriever.retrieve(retrieval_query)
            retrieved_sources = self._collect_sources_from_scored_nodes(retrieved, min_src)
            if follow_up:
                sources = retrieved_sources
            else:
                sources = self._merge_source_chunks(engine_sources, retrieved_sources)
        else:
            sources = engine_sources

        if not expose_sources:
            sources = []
        elif diagram_heavy:
            sources = self._filter_sources_for_diagrams(sources)
        else:
            sources = self._filter_sources_by_similarity(sources)

        if expose_sources and sources:
            sources = self._apply_gallery_image_policy(
                sources,
                diagram_heavy=diagram_heavy,
                max_pages=self._settings.rag_max_gallery_image_sources,
            )

        return RAGQueryResult(answer=str(response), sources=sources)
