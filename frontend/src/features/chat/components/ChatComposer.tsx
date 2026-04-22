import { ArrowUp, Camera, FileText, ImageIcon, Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../../lib/cn";
import { useChatWorkspace } from "../hooks/useChatWorkspace";
import type { ChatAttachment } from "../types/message.types";
import { CameraCaptureModal } from "./CameraCaptureModal";
import { ChatAttachmentsStrip, fileToAttachmentKind } from "./ChatAttachmentsStrip";

/** Equivalente a `max-h-40` (10rem) con `text-base` en raíz. */
const TEXTAREA_MAX_HEIGHT_PX = 160;
/** Equivalente a `min-h-[3rem]`. */
const TEXTAREA_MIN_HEIGHT_PX = 48;
const MAX_ATTACHMENTS = 12;

const DOC_ACCEPT =
  ".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function resetInput(el: HTMLInputElement | null) {
  if (el) el.value = "";
}

function newAttachmentId() {
  return globalThis.crypto?.randomUUID?.() ?? `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function filesToAttachments(files: File[]): ChatAttachment[] {
  return files.map((file) => ({
    id: newAttachmentId(),
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    kind: fileToAttachmentKind(file),
    previewUrl: URL.createObjectURL(file),
  }));
}

export function ChatComposer() {
  const { sendUserMessage, newDiagnosisFocusNonce, isChatLoading, chatError, clearChatError } =
    useChatWorkspace();
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(pendingAttachments);
  pendingRef.current = pendingAttachments;
  const baseId = useId();
  const imageInputId = `${baseId}-image`;
  const docInputId = `${baseId}-doc`;

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    const h = Math.min(Math.max(scrollH, TEXTAREA_MIN_HEIGHT_PX), TEXTAREA_MAX_HEIGHT_PX);
    el.style.height = `${h}px`;
    el.style.overflowY = scrollH > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [draft]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (newDiagnosisFocusNonce === 0) return;
    pendingRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setPendingAttachments([]);
    setCameraOpen(false);
    textareaRef.current?.focus();
  }, [newDiagnosisFocusNonce]);

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    setPendingAttachments((prev) => {
      const room = Math.max(0, MAX_ATTACHMENTS - prev.length);
      if (room === 0) return prev;
      const nextFiles = files.slice(0, room);
      return [...prev, ...filesToAttachments(nextFiles)];
    });
  }, []);

  const appendFromFileList = (list: FileList | null) => {
    if (!list?.length) return;
    addFiles(Array.from(list));
  };

  const removePending = (id: string) => {
    setPendingAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    if (isChatLoading) return;
    clearChatError();
    const text = draft;
    const attachments = pendingAttachments;
    const ok = await sendUserMessage(text, attachments);
    if (ok) {
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      setDraft("");
      setPendingAttachments([]);
    }
  };

  const canSend =
    (draft.trim().length > 0 || pendingAttachments.length > 0) && !isChatLoading;

  return (
    <div className="shrink-0 border-t border-border bg-white px-4 pb-2 pt-3">
      {cameraOpen ? (
        <CameraCaptureModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onPhoto={(file) => addFiles([file])}
        />
      ) : null}

      <div className="relative mx-auto max-w-3xl">
        {chatError ? (
          <div
            role="alert"
            className="mb-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
          >
            <span className="min-w-0 flex-1 leading-snug">{chatError}</span>
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium text-red-800 hover:bg-red-100"
              onClick={() => clearChatError()}
            >
              Cerrar
            </button>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-background/50 shadow-sm">
          {pendingAttachments.length > 0 ? (
            <div className="rounded-t-2xl border-b border-border/60 bg-white/90 px-3 py-2">
              <ChatAttachmentsStrip
                attachments={pendingAttachments}
                onRemove={removePending}
                tone="composer"
              />
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              if (chatError) clearChatError();
              setDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void handleSend();
              }
            }}
            placeholder="Describí el síntoma o código de error..."
            rows={1}
            className={cn(
              "max-h-40 min-h-[3rem] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-0",
              pendingAttachments.length > 0 ? "rounded-t-none" : "rounded-t-2xl",
            )}
          />

          <div className="flex items-center gap-1 rounded-b-2xl border-t border-border/60 px-2 py-2">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Adjuntar archivo o imagen"
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "rounded-lg p-2 text-text-secondary transition-colors",
                  "hover:bg-surface hover:text-text-primary",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
                  menuOpen && "bg-surface text-text-primary",
                )}
              >
                <Plus className="size-5" strokeWidth={2} />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute bottom-full left-0 z-20 mb-2 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-surface/80"
                    onClick={() => {
                      setMenuOpen(false);
                      setCameraOpen(true);
                    }}
                  >
                    <Camera className="size-4 shrink-0 text-text-secondary" />
                    Tomar foto
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-surface/80"
                    onClick={() => {
                      imageInputRef.current?.click();
                      setMenuOpen(false);
                    }}
                  >
                    <ImageIcon className="size-4 shrink-0 text-text-secondary" />
                    Imágenes
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-text-primary hover:bg-surface/80"
                    onClick={() => {
                      docInputRef.current?.click();
                      setMenuOpen(false);
                    }}
                  >
                    <FileText className="size-4 shrink-0 text-text-secondary" />
                    Archivos
                  </button>
                </div>
              ) : null}
            </div>

            <span className="min-w-0 flex-1" />

            <button
              type="button"
              aria-label={isChatLoading ? "Consultando manuales" : "Enviar mensaje"}
              aria-busy={isChatLoading}
              disabled={!canSend}
              onClick={() => void handleSend()}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-colors",
                "hover:bg-primary-hover active:bg-primary-active",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              {isChatLoading ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2.5} aria-hidden />
              ) : (
                <ArrowUp className="size-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>

        <p className="mt-1 text-center text-[11px] leading-snug text-text-secondary">
          hvac-assistant responde únicamente con base en manuales técnicos oficiales.
        </p>

        <input
          id={imageInputId}
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            appendFromFileList(e.target.files);
            resetInput(e.target);
          }}
        />
        <input
          id={docInputId}
          ref={docInputRef}
          type="file"
          accept={DOC_ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            appendFromFileList(e.target.files);
            resetInput(e.target);
          }}
        />
      </div>
    </div>
  );
}
