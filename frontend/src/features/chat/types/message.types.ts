export type ChatMessageRole = "user" | "assistant";

/** Fragmento recuperado del corpus (mismo contrato que `POST /api/chat`). */
export type ChatDocumentSource = {
  text: string;
  file_name?: string | null;
  score?: number | null;
  /** 1-based page in the PDF when the chunk was tied to a page at ingest time. */
  page_number?: number | null;
  /** True when this chunk includes a Gemini vision description of figures on that page. */
  has_diagram_context?: boolean | null;
};

export type ChatAttachmentKind = "image" | "file";

/** Adjunto en UI; `previewUrl` suele ser un object URL del navegador. */
export type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: ChatAttachmentKind;
  previewUrl: string;
};

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: Date;
  attachments?: ChatAttachment[];
  /** Solo mensajes del asistente con respaldo RAG. */
  sources?: ChatDocumentSource[];
};
