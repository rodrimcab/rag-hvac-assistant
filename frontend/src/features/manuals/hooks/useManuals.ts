import { useCallback, useEffect, useState } from "react";
import { deleteManual, getIngestStatus, listManuals, uploadManual } from "../services/manualsApi";
import type { IngestStatus, ManualDocument } from "../types/manual.types";

const POLL_INTERVAL_MS = 3_000;

const IDLE_STATUS: IngestStatus = {
  status: "idle",
  filename: null,
  chunks_total: 0,
  chunks_done: 0,
  error_message: null,
};

export type UseManualsReturn = {
  manuals: ManualDocument[];
  ingestStatus: IngestStatus;
  isLoading: boolean;
  error: string | null;
  upload: (file: File) => Promise<void>;
  remove: (filename: string) => Promise<void>;
};

export function useManuals(): UseManualsReturn {
  const [manuals, setManuals] = useState<ManualDocument[]>([]);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>(IDLE_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al conectar con el servidor");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Polling while ingestion is running ──────────────────────────────────────
  useEffect(() => {
    if (ingestStatus.status !== "processing") return;

    const id = setInterval(async () => {
      try {
        const s = await getIngestStatus();
        setIngestStatus(s);
        if (s.status !== "processing") {
          // Ingestion finished (done or error) — refresh the manual list
          const data = await listManuals();
          setManuals(data);
        }
      } catch {
        // Silently ignore transient poll failures; next tick will retry
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [ingestStatus.status]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const upload = useCallback(async (file: File) => {
    await uploadManual(file);
    setIngestStatus({
      status: "processing",
      filename: file.name,
      chunks_total: 0,
      chunks_done: 0,
      error_message: null,
    });
    // Optimistically add the card so it appears immediately in the grid
    setManuals((prev) => [
      ...prev,
      { file_name: file.name, size_bytes: file.size, indexed: false },
    ]);
  }, []);

  const remove = useCallback(async (filename: string) => {
    await deleteManual(filename);
    setManuals((prev) => prev.filter((m) => m.file_name !== filename));
  }, []);

  return { manuals, ingestStatus, isLoading, error, upload, remove };
}
