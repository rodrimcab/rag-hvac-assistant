export type ChatMessageRole = "user" | "assistant";

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
};
