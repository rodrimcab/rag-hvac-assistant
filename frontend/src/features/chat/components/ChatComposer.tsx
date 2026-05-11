import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../../lib/cn";
import { useChatWorkspace } from "../hooks/useChatWorkspace";

/** Equivalente a `max-h-40` (10rem) con `text-base` en raíz. */
const TEXTAREA_MAX_HEIGHT_PX = 160;
/** Equivalente a `min-h-[3rem]`. */
const TEXTAREA_MIN_HEIGHT_PX = 48;

type ChatComposerProps = {
  availableBrands: string[];
  interactionLocked?: boolean;
};

export function ChatComposer({ availableBrands, interactionLocked = false }: ChatComposerProps) {
  const { sendUserMessage, newDiagnosisFocusNonce, isChatLoading, chatError, clearChatError } =
    useChatWorkspace();
  const [draft, setDraft] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const baseId = useId();
  const brandSelectId = `${baseId}-brand`;

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
    if (newDiagnosisFocusNonce === 0) return;
    setSelectedBrand("");
    textareaRef.current?.focus();
  }, [newDiagnosisFocusNonce]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (isChatLoading || interactionLocked) return;
    clearChatError();
    const text = draft;
    setDraft("");
    await sendUserMessage(text, [], {
      brand: selectedBrand || undefined,
    });
  };

  const canSend = draft.trim().length > 0 && !isChatLoading && !interactionLocked;

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-white px-2 pb-2 pt-3 sm:px-4",
        interactionLocked && "pointer-events-none opacity-50",
      )}
      aria-disabled={interactionLocked || undefined}
    >
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
            className="max-h-40 min-h-[3rem] w-full resize-none rounded-t-2xl border-0 bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-0"
          />

          <div className="flex items-center justify-end gap-1 rounded-b-2xl border-t border-border/60 px-2 py-2">
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

        <div className="mt-1 flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
          <p className="text-center text-[11px] leading-snug text-text-secondary">
            hvac-assistant responde únicamente con base en manuales técnicos oficiales.
          </p>
          <div className="flex items-center gap-1.5">
            <label htmlFor={brandSelectId} className="text-[11px] text-text-secondary">
              Marca
            </label>
            <select
              id={brandSelectId}
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="rounded-md border border-border bg-white px-2 py-1 text-[11px] text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Todas</option>
              {availableBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
