import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/cn";

type DeleteChatConfirmModalProps = {
  open: boolean;
  chatTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteChatConfirmModal({
  open,
  chatTitle,
  onCancel,
  onConfirm,
}: DeleteChatConfirmModalProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      <div
        className={cn(
          "relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-text-primary">
            ¿Eliminar esta conversación?
          </h2>
          <p id={descId} className="mt-2 text-sm leading-relaxed text-text-secondary">
            Se borrará del historial local{" "}
            <span className="font-medium text-text-primary">«{chatTitle}»</span>. Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="flex gap-2 bg-background px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-white py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
