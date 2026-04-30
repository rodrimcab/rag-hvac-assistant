import { useCallback, useEffect, useRef, useState } from "react";
import { deleteManual, getIngestStatus, listManuals, uploadManual } from "../services/manualsApi";
import type { IngestStatus, ManualDocument } from "../types/manual.types";

const POLL_PROCESSING_MS = 2_000;

const IDLE_STATUS: IngestStatus = {
  status: "idle",
  filename: null,
  chunks_total: 0,
  chunks_done: 0,
  error_message: null,
  ingest_step: null,
};

export type UseManualsReturn = {
  manuals: ManualDocument[];
  ingestStatus: IngestStatus;
  isLoading: boolean;
  error: string | null;
  upload: (file: File) => Promise<void>;
  remove: (filename: string) => Promise<void>;
  /** True while the PDF is uploading or the server is processing it (or brief “listo” hold). */
  manualsWorkflowLocked: boolean;
  /** True only during the HTTP upload of the file. */
  isUploadingFile: boolean;
  /** Filename to show in the import dock during HTTP upload (before ingest status updates). */
  uploadDisplayName: string | null;
  /** Short beat after success so the user sees the final step. */
  completionHold: boolean;
};

export function useManuals(): UseManualsReturn {
  const [manuals, setManuals] = useState<ManualDocument[]>([]);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>(IDLE_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadDisplayName, setUploadDisplayName] = useState<string | null>(null);
  const [completionHold, setCompletionHold] = useState(false);
  const prevIngestStatusRef = useRef<IngestStatus["status"]>(IDLE_STATUS.status);

  const manualsWorkflowLocked =
    isUploadingFile || ingestStatus.status === "processing" || completionHold;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [manualsData, statusData] = await Promise.all([
          listManuals(),
          getIngestStatus(),
        ]);
        if (cancelled) return;
        setManuals(manualsData);
        setIngestStatus(statusData);
        prevIngestStatusRef.current = statusData.status;
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al conectar con el servidor");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Brief “all done” state for the progress dock ────────────────────────────
  useEffect(() => {
    const prev = prevIngestStatusRef.current;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (prev === "processing" && ingestStatus.status === "done") {
      setCompletionHold(true);
      t = window.setTimeout(() => setCompletionHold(false), 2000);
    }
    prevIngestStatusRef.current = ingestStatus.status;
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [ingestStatus.status]);

  // ── Polling while ingestion is running ──────────────────────────────────────
  useEffect(() => {
    if (ingestStatus.status !== "processing") return;

    const tick = async () => {
      try {
        const s = await getIngestStatus();
        setIngestStatus(s);
        if (s.status !== "processing") {
          const data = await listManuals();
          setManuals(data);
        }
      } catch {
        // ignore transient poll failures; next tick will retry
      }
    };

    void tick();
    const id = window.setInterval(tick, POLL_PROCESSING_MS);
    return () => window.clearInterval(id);
  }, [ingestStatus.status]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const upload = useCallback(async (file: File) => {
    setIsUploadingFile(true);
    setUploadDisplayName(file.name);
    try {
      await uploadManual(file);
      setIngestStatus({
        status: "processing",
        filename: file.name,
        chunks_total: 0,
        chunks_done: 0,
        error_message: null,
        ingest_step: null,
      });
      setManuals((prev) => [
        ...prev,
        { file_name: file.name, size_bytes: file.size, indexed: false },
      ]);
      try {
        const s = await getIngestStatus();
        setIngestStatus(s);
      } catch {
        // first poll will pick it up
      }
    } finally {
      setIsUploadingFile(false);
      setUploadDisplayName(null);
    }
  }, []);

  const remove = useCallback(async (filename: string) => {
    await deleteManual(filename);
    setManuals((prev) => prev.filter((m) => m.file_name !== filename));
  }, []);

  return {
    manuals,
    ingestStatus,
    isLoading,
    error,
    upload,
    remove,
    manualsWorkflowLocked,
    isUploadingFile,
    uploadDisplayName,
    completionHold,
  };
}
