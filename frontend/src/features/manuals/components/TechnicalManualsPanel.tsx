import { AlertCircle, Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import { cn } from "../../../lib/cn";
import type { IngestStatus, ManualDocument } from "../types/manual.types";

type TechnicalManualsPanelProps = {
  manuals: ManualDocument[];
  ingestStatus: IngestStatus;
  isLoading: boolean;
  error: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: (filename: string) => Promise<void>;
};

function parseManualName(fileName: string): { brand: string; model: string } {
  const stem = fileName.replace(/\.pdf$/i, "").replace(/^\d+_ServiceManual_/, "");
  const parts = stem.split("_");
  return {
    brand: parts[0] ?? fileName,
    model: parts.slice(1).join(" ") || fileName,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ManualsHeader() {
  return (
    <header className="shrink-0 border-b border-border bg-white px-4 py-3 sm:px-6 sm:py-3.5">
      <h1 className="truncate text-base font-semibold tracking-tight text-text-primary sm:text-lg">
        Manuales técnicos
      </h1>
      <p className="mt-0.5 truncate text-sm text-text-secondary">
        PDFs de referencia para diagnóstico. Sube, descarga o elimina manuales.
      </p>
    </header>
  );
}

function SkeletonCard() {
  return (
    <div className="flex min-h-[140px] animate-pulse flex-col rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-lg bg-surface" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-2.5 w-1/3 rounded bg-surface" />
          <div className="h-3.5 w-4/5 rounded bg-surface" />
          <div className="h-2.5 w-1/2 rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}

function UploadManualCard({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setUploadError(null);
      try {
        await onUpload(file);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Error al subir el archivo");
      }
    },
    [onUpload],
  );

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="sr-only"
        onChange={handleChange}
        aria-label="Seleccionar PDF"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
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
      {uploadError && (
        <p className="flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs text-error">
          <AlertCircle className="size-3.5 shrink-0" />
          {uploadError}
        </p>
      )}
    </div>
  );
}

type ManualCardProps = {
  manual: ManualDocument;
  isCurrentlyIngesting: boolean;
  onRemove: (filename: string) => Promise<void>;
};

function ManualCard({ manual, isCurrentlyIngesting, onRemove }: ManualCardProps) {
  const { brand, model } = parseManualName(manual.file_name);
  const downloadUrl = `${getApiBaseUrl()}/api/documents/${encodeURIComponent(manual.file_name)}/download`;
  const isIndexing = isCurrentlyIngesting;

  const confirmRemove = useCallback(async () => {
    if (window.confirm(`¿Eliminar "${manual.file_name}" de la base de conocimiento?`)) {
      await onRemove(manual.file_name);
    }
  }, [manual.file_name, onRemove]);

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
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{brand}</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
            {model}
          </p>
          <p className="mt-1 truncate text-xs text-text-secondary" title={manual.file_name}>
            {formatBytes(manual.size_bytes)}
          </p>
        </div>
      </div>

      {/* Indexing spinner overlay */}
      {isIndexing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-[2px]">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs font-medium text-text-secondary">Indexando…</span>
        </div>
      )}

      {/* Desktop hover overlay — hidden on mobile */}
      {!isIndexing && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 hidden items-center justify-center gap-2 rounded-xl bg-white/90 opacity-0 backdrop-blur-[2px] transition-opacity duration-200",
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "sm:flex",
          )}
        >
          <a
            href={downloadUrl}
            download={manual.file_name}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-white text-text-primary shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            title="Descargar"
            aria-label={`Descargar ${manual.file_name}`}
          >
            <Download className="size-4" strokeWidth={2} aria-hidden />
          </a>
          <button
            type="button"
            onClick={confirmRemove}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-white text-error shadow-sm transition-colors hover:border-error hover:bg-error/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            title="Eliminar"
            aria-label={`Eliminar ${manual.file_name}`}
          >
            <Trash2 className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      {/* Mobile action buttons — always visible, hidden on desktop */}
      {!isIndexing && (
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3 sm:hidden">
          <a
            href={downloadUrl}
            download={manual.file_name}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-text-primary shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            aria-label={`Descargar ${manual.file_name}`}
          >
            <Download className="size-3.5" strokeWidth={2} aria-hidden />
            Descargar
          </a>
          <button
            type="button"
            onClick={confirmRemove}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-white py-2 text-xs font-medium text-error shadow-sm transition-colors hover:border-error hover:bg-error/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            aria-label={`Eliminar ${manual.file_name}`}
          >
            <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

export function TechnicalManualsPanel({
  manuals,
  ingestStatus,
  isLoading,
  error,
  onUpload,
  onRemove,
}: TechnicalManualsPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <ManualsHeader />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <div className="mx-auto mb-4 flex max-w-5xl items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <UploadManualCard onUpload={onUpload} />
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)
            : manuals.map((manual) => (
                <ManualCard
                  key={manual.file_name}
                  manual={manual}
                  isCurrentlyIngesting={
                    ingestStatus.status === "processing" &&
                    ingestStatus.filename === manual.file_name
                  }
                  onRemove={onRemove}
                />
              ))}
        </div>
      </div>
    </div>
  );
}
