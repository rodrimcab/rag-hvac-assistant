import { Download, Eye, FileText, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { cn } from "../../../lib/cn";
import { SAMPLE_MANUALS, type ManualItem } from "../sample-manuals";

type TechnicalManualsPanelProps = {
  removedIds: Set<string>;
  onRemoveManual: (id: string) => void;
};

function ManualsHeader() {
  return (
    <header className="shrink-0 border-b border-border bg-white px-6 py-3.5">
      <h1 className="truncate text-lg font-semibold tracking-tight text-text-primary">
        Manuales técnicos
      </h1>
      <p className="mt-0.5 truncate text-sm text-text-secondary">
        PDFs de referencia para diagnóstico. Vista previa, descarga o eliminación local.
      </p>
    </header>
  );
}

function AddManualCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-white",
        "text-sm font-medium text-primary transition-colors",
        "hover:border-primary hover:bg-surface/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-surface text-primary">
        <Plus className="size-6" strokeWidth={2} aria-hidden />
      </span>
      <span>Agregar manual</span>
    </button>
  );
}

type ManualCardProps = {
  manual: ManualItem;
  onRemove: (id: string) => void;
};

function ManualCard({ manual, onRemove }: ManualCardProps) {
  const openPreview = useCallback(() => {
    window.open(manual.url, "_blank", "noopener,noreferrer");
  }, [manual.url]);

  const confirmRemove = useCallback(() => {
    if (window.confirm(`¿Eliminar "${manual.title}" de la lista local?`)) {
      onRemove(manual.id);
    }
  }, [manual, onRemove]);

  return (
    <div
      className={cn(
        "group relative flex min-h-[140px] flex-col rounded-xl border border-border bg-white p-4 transition-shadow",
        "hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface/90 text-primary">
          <FileText className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{manual.brand}</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
            {manual.title}
          </p>
          <p className="mt-1 truncate text-xs text-text-secondary" title={manual.fileName}>
            {manual.fileName}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-white/90 opacity-0 backdrop-blur-[2px] transition-opacity duration-200",
          "group-hover:pointer-events-auto group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={openPreview}
          className="flex size-10 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
          title="Ver"
          aria-label={`Ver ${manual.title}`}
        >
          <Eye className="size-4" strokeWidth={2} aria-hidden />
        </button>
        <a
          href={manual.url}
          download={manual.fileName}
          className="flex size-10 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
          title="Descargar"
          aria-label={`Descargar ${manual.title}`}
        >
          <Download className="size-4" strokeWidth={2} aria-hidden />
        </a>
        <button
          type="button"
          onClick={confirmRemove}
          className="flex size-10 items-center justify-center rounded-lg border border-border bg-white text-error shadow-sm transition-colors hover:border-error hover:bg-error/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
          title="Eliminar"
          aria-label={`Eliminar ${manual.title}`}
        >
          <Trash2 className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

export function TechnicalManualsPanel({ removedIds, onRemoveManual }: TechnicalManualsPanelProps) {
  const manuals = useMemo(
    () => SAMPLE_MANUALS.filter((m) => !removedIds.has(m.id)),
    [removedIds],
  );

  const handleAddPlaceholder = useCallback(() => {
    window.alert("Aquí irá el flujo de carga de manuales (API o selector de archivos).");
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <ManualsHeader />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-6 py-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AddManualCard onClick={handleAddPlaceholder} />
          {manuals.map((manual) => (
            <ManualCard key={manual.id} manual={manual} onRemove={onRemoveManual} />
          ))}
        </div>
      </div>
    </div>
  );
}
