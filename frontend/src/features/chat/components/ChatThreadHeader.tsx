import { Check, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

type ChatThreadHeaderProps = {
  title: string;
  canRename?: boolean;
  onRename?: (nextTitle: string) => void;
};

export function ChatThreadHeader({ title, canRename = false, onRename }: ChatThreadHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
    setIsEditing(false);
  }, [title]);

  const save = () => {
    const next = draft.trim();
    if (!next.length) return;
    onRename?.(next);
    setIsEditing(false);
  };

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6 sm:py-3.5">
      {isEditing ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setDraft(title);
              setIsEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-base font-semibold tracking-tight text-text-primary outline-none ring-0 focus:border-primary sm:text-lg"
          autoFocus
        />
      ) : (
        <h1 className="truncate text-base font-semibold tracking-tight text-text-primary sm:text-lg">
          {title}
        </h1>
      )}
      {canRename ? (
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                aria-label="Guardar nombre de chat"
                onClick={save}
                className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Cancelar edición"
                onClick={() => {
                  setDraft(title);
                  setIsEditing(false);
                }}
                className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Editar nombre del chat"
              onClick={() => setIsEditing(true)}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            >
              <Pencil className="size-4" />
            </button>
          )}
        </div>
      ) : null}
    </header>
  );
}
