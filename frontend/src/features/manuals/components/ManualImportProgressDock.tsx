import { Check, Circle, Loader2 } from "lucide-react";
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

function stepVisual(current: number, index: 1 | 2 | 3 | 4 | 5): StepVisual {
  if (current < index) return "pending";
  if (current === index) return "active";
  return "done";
}

/**
 * Phases 1–5 for the import UX. ``0`` = not started (should not render dock).
 */
function derivePhase(
  isUploadingFile: boolean,
  ingestStatus: IngestStatus,
  completionHold: boolean,
): number {
  if (ingestStatus.status === "error") return -1;
  if (completionHold || ingestStatus.status === "done") return 5;
  if (isUploadingFile) return 1;
  if (ingestStatus.status !== "processing") return 0;
  if (ingestStatus.ingest_step === "building_index") return 4;
  if (ingestStatus.ingest_step === "reading_pages" && ingestStatus.chunks_total > 0) return 3;
  // Processing, still waiting for first page batch or server thread start
  return 2;
}

export function ManualImportProgressDock({
  filename,
  isUploadingFile,
  ingestStatus,
  completionHold,
}: ManualImportProgressDockProps) {
  const name = filename?.trim() || "Manual";
  const phase = derivePhase(isUploadingFile, ingestStatus, completionHold);
  const isError = ingestStatus.status === "error";

  const pageHint =
    ingestStatus.status === "processing" &&
    ingestStatus.ingest_step === "reading_pages" &&
    ingestStatus.chunks_total > 0
      ? `Página ${ingestStatus.chunks_done} de ${ingestStatus.chunks_total}`
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
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-border/70 pb-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Importación</p>
          <p className="truncate text-sm font-semibold text-text-primary" title={name || undefined}>
            {name}
          </p>
        </div>
      </div>

      {isError ? (
        <p className="rounded-lg bg-error/5 px-3 py-2 text-sm leading-snug text-error">
          No pudimos terminar de preparar el manual. Esperá un momento y volvé a intentarlo. Si el problema
          continúa, probá con otro archivo.
        </p>
      ) : (
        <ol className="list-none space-y-0.5 p-0">
          <StepRow
            label="Subiendo el archivo"
            hint="Enviando el PDF de forma segura."
            visual={stepVisual(phase, 1)}
          />
          <StepRow
            label="Recibiendo el manual"
            hint="Guardando una copia para el asistente."
            visual={stepVisual(phase, 2)}
          />
          <StepRow
            label="Revisando el manual página por página"
            hint={pageHint || "Leyendo el contenido útil de cada página."}
            visual={stepVisual(phase, 3)}
          />
          <StepRow
            label="Dejando listo el manual para las consultas"
            hint="Conectando el contenido con el buscador del asistente."
            visual={stepVisual(phase, 4)}
          />
          <StepRow
            label="¡Listo!"
            hint="Ya podés hacer preguntas con respaldo de este manual."
            visual={stepVisual(phase, 5)}
          />
        </ol>
      )}
    </div>
  );
}
