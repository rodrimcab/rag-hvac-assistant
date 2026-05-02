import { AlertCircle, Check, Circle, Loader2 } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { IngestStatus } from "../types/manual.types";

type StepVisual = "done" | "active" | "pending";

type ManualImportProgressDockProps = {
  filename: string | null;
  isUploadingFile: boolean;
  ingestStatus: IngestStatus;
  completionHold: boolean;
};

function StepRow({
  label,
  hint,
  visual,
}: {
  label: string;
  hint?: string | null;
  visual: StepVisual;
}) {
  return (
    <li className="flex gap-3 py-1.5">
      <span className="mt-0.5 shrink-0" aria-hidden>
        {visual === "done" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="size-3.5 stroke-[2.5]" />
          </span>
        ) : visual === "active" ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-3.5 animate-spin" strokeWidth={2.5} />
          </span>
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full bg-surface text-text-disabled">
            <Circle className="size-3.5" strokeWidth={2} />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            visual === "pending" ? "text-text-secondary" : "font-medium text-text-primary",
          )}
        >
          {label}
        </p>
        {hint ? <p className="mt-0.5 text-xs text-text-secondary">{hint}</p> : null}
      </div>
    </li>
  );
}

function getRowVisual(
  row: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  p: {
    isUploadingFile: boolean;
    ingestStatus: IngestStatus;
    completionHold: boolean;
  },
): StepVisual {
  const { isUploadingFile, ingestStatus, completionHold } = p;

  if (ingestStatus.status === "done" || completionHold) {
    return "done";
  }

  if (isUploadingFile) {
    if (row === 1) return "active";
    return "pending";
  }

  const step = ingestStatus.ingest_step;
  if (ingestStatus.status !== "processing") {
    return "pending";
  }

  if (row === 1) return "done";

  if (row === 2) {
    if (step === "validating" || step === null) return "active";
    return "done";
  }

  if (row === 3) {
    if (step === "reading_pages") return "active";
    if (step === "validating" || step === null) return "pending";
    return "done";
  }

  if (row === 4) {
    if (step === "chunking") return "active";
    if (step === "validating" || step === null || step === "reading_pages") return "pending";
    return "done";
  }

  if (row === 5 || row === 6) {
    if (step === "indexing") return "active";
    if (step === "validating" || step === null || step === "reading_pages" || step === "chunking") {
      return "pending";
    }
    return "done";
  }

  return "pending";
}

export function ManualImportProgressDock({
  filename,
  isUploadingFile,
  ingestStatus,
  completionHold,
}: ManualImportProgressDockProps) {
  const name = filename?.trim() || "Manual";
  const isError = ingestStatus.status === "error";
  const ctx = { isUploadingFile, ingestStatus, completionHold };

  const pageHint =
    ingestStatus.status === "processing" &&
    ingestStatus.ingest_step === "reading_pages" &&
    ingestStatus.chunks_total > 0
      ? `Página ${ingestStatus.chunks_done} de ${ingestStatus.chunks_total}`
      : null;

  const fragmentHint =
    ingestStatus.status === "processing" &&
    ingestStatus.ingest_step === "indexing" &&
    ingestStatus.chunks_total > 0
      ? ingestStatus.chunks_done > 0
        ? `${ingestStatus.chunks_done} / ${ingestStatus.chunks_total} fragmentos`
        : `${ingestStatus.chunks_total} fragmento${ingestStatus.chunks_total === 1 ? "" : "s"} a vectorizar`
      : null;

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-lg rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm",
        "sm:px-5 sm:py-4",
      )}
      role="status"
      aria-live="polite"
      aria-busy={isUploadingFile || ingestStatus.status === "processing"}
    >
      <div className="mb-3 border-b border-border/70 pb-3">
        <h2 className="text-sm font-semibold leading-snug text-text-primary">
          Importando manual al asistente RAG
        </h2>
        <p className="mt-1.5 break-words text-xs font-medium leading-snug text-text-secondary whitespace-normal">
          {name}
        </p>
      </div>

      {isError ? (
        <div className="flex gap-3 rounded-lg bg-error/5 px-3 py-2.5">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-error">No se pudo completar la indexación</p>
            <p className="mt-1 text-xs leading-snug text-text-secondary">
              Revisá si el PDF contiene texto legible o intentá nuevamente.
            </p>
          </div>
        </div>
      ) : (
        <ol className="list-none space-y-0.5 p-0">
          <StepRow
            label="Subiendo el archivo"
            hint="Guardando el PDF en el sistema."
            visual={getRowVisual(1, ctx)}
          />
          <StepRow
            label="Validando el documento"
            hint="Comprobando que el manual pueda procesarse correctamente."
            visual={getRowVisual(2, ctx)}
          />
          <StepRow
            label="Extrayendo el contenido"
            hint={pageHint || "Leyendo texto y estructura técnica útil."}
            visual={getRowVisual(3, ctx)}
          />
          <StepRow
            label="Fragmentando el manual"
            hint="Preparando bloques de información para consulta."
            visual={getRowVisual(4, ctx)}
          />
          <StepRow
            label="Generando embeddings"
            hint="Creando representaciones semánticas del contenido."
            visual={getRowVisual(5, ctx)}
          />
          <StepRow
            label="Indexando para RAG"
            hint={fragmentHint || "Conectando el manual al motor de recuperación del asistente."}
            visual={getRowVisual(6, ctx)}
          />
          <StepRow
            label="¡Listo!"
            hint="Ya podés hacer consultas con respaldo de este manual."
            visual={getRowVisual(7, ctx)}
          />
        </ol>
      )}
    </div>
  );
}
