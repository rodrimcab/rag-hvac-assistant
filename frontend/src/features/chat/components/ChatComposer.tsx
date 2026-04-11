import { ArrowUp, FileText, ImageIcon, Plus } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../../lib/cn";
import { useChatWorkspace } from "../hooks/useChatWorkspace";

/** Equivalente a `max-h-40` (10rem) con `text-base` en raíz. */
const TEXTAREA_MAX_HEIGHT_PX = 160;
/** Equivalente a `min-h-[3rem]`. */
const TEXTAREA_MIN_HEIGHT_PX = 48;

function resetInput(el: HTMLInputElement | null) {
  if (el) el.value = "";
}

export function ChatComposer() {
  const { sendUserMessage } = useChatWorkspace();
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
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

  const handleSend = () => {
    sendUserMessage(draft);
    setDraft("");
  };

  const handleFilesPicked = () => {
    /* Reservado: integrar adjuntos con el backend o estado del compositor. */
  };

  return (
    <div className="shrink-0 border-t border-border bg-white px-4 pb-2 pt-3">
      <div className="relative mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-background/50 shadow-sm">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describí el síntoma o código de error..."
            rows={1}
            className="max-h-40 min-h-[3rem] w-full resize-none rounded-t-2xl border-0 bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-0"
          />

          <div className="flex items-center gap-1 border-t border-border/60 px-2 py-2">
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
                  className="absolute bottom-full left-0 z-20 mb-2 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg"
                >
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
                    Subir imagen
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
                    Subir archivo
                  </button>
                </div>
              ) : null}
            </div>

            <span className="min-w-0 flex-1" />

            <button
              type="button"
              aria-label="Enviar mensaje"
              disabled={!draft.trim()}
              onClick={handleSend}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition-colors",
                "hover:bg-primary-hover active:bg-primary-active",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
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
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) handleFilesPicked();
            resetInput(e.target);
          }}
        />
        <input
          id={docInputId}
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) handleFilesPicked();
            resetInput(e.target);
          }}
        />
      </div>
    </div>
  );
}
