from llama_index.core import PromptTemplate

# Default LlamaIndex QA template is fine for MVP; centralize here for Phase 8 tuning.
TEXT_QA_TEMPLATE = PromptTemplate(
    "Context information from technical manuals is below.\n"
    "---------------------\n"
    "{context_str}\n"
    "---------------------\n"
    "Answer the technician's question using only the context when possible. "
    "If the context does not contain enough information, say what is missing.\n"
    "Query: {query_str}\n"
    "Answer: "
)
