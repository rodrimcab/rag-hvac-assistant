"""Node post-processors applied after vector retrieval."""

from typing import Optional

from llama_index.core.bridge.pydantic import Field
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import MetadataMode, NodeWithScore, QueryBundle


class SkipEmptyNodePostprocessor(BaseNodePostprocessor):
    """
    Removes retrieved nodes with little or no text (blank PDF pages, failed extraction).

    Frees ``similarity_top_k`` slots so the synthesizer sees substantive chunks instead of
    empty placeholders—especially important for broad questions where many neighbors are junk.
    """

    min_chars: int = Field(
        default=12,
        ge=1,
        description="Minimum trimmed text length to keep a node.",
    )

    @classmethod
    def class_name(cls) -> str:
        return "SkipEmptyNodePostprocessor"

    def _postprocess_nodes(
        self,
        nodes: list[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> list[NodeWithScore]:
        out: list[NodeWithScore] = []
        for nws in nodes:
            text = (nws.node.get_content(metadata_mode=MetadataMode.NONE) or "").strip()
            if len(text) >= self.min_chars:
                out.append(nws)
        return out
