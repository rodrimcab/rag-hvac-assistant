import { Camera, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../lib/cn";

type CameraCaptureModalProps = {
  open: boolean;
  onClose: () => void;
  /** JPEG u otro tipo que devuelva el canvas o el input fallback */
  onPhoto: (file: File) => void;
};

type Phase = "starting" | "live" | "error";

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function CameraCaptureModal({ open, onClose, onPhoto }: CameraCaptureModalProps) {
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorHint, setErrorHint] = useState("");

  const detachVideo = useCallback(() => {
    const el = videoRef.current;
    if (el) el.srcObject = null;
  }, []);

  const stopCamera = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    detachVideo();
  }, [detachVideo]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase("starting");
      setErrorHint("");
      return;
    }

    let cancelled = false;

    const attachStream = async (stream: MediaStream) => {
      if (cancelled) {
        stopTracks(stream);
        return;
      }
      streamRef.current = stream;
      const el = videoRef.current;
      if (!el) {
        stopTracks(stream);
        streamRef.current = null;
        return;
      }
      el.srcObject = stream;
      try {
        await el.play();
      } catch {
        /* autoplay policies: el usuario ya interactuó al abrir el modal */
      }
      if (cancelled) {
        stopTracks(stream);
        streamRef.current = null;
        detachVideo();
        return;
      }
      setPhase("live");
    };

    const start = async () => {
      setPhase("starting");
      setErrorHint("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase("error");
        setErrorHint(
          "Este navegador no permite abrir la cámara desde la página. Usá el botón de abajo para abrir la cámara del sistema.",
        );
        return;
      }

      try {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });
          if (cancelled) {
            stopTracks(stream);
            return;
          }
          await attachStream(stream);
        } catch {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (cancelled) {
            stopTracks(stream);
            return;
          }
          await attachStream(stream);
        }
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Permiso de cámara denegado. Podés permitirlo en la barra del navegador o usar el selector inferior."
            : err instanceof Error
              ? err.message
              : "No se pudo usar la cámara.";
        setErrorHint(msg);
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopTracks(streamRef.current);
      streamRef.current = null;
      detachVideo();
    };
  }, [open, detachVideo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || phase !== "live") return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `Foto-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        stopCamera();
        onPhoto(file);
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  }, [phase, stopCamera, onPhoto, onClose]);

  const handleFallbackChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onPhoto(file);
    onClose();
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => {
          stopCamera();
          onClose();
        }}
      />

      <div
        className={cn(
          "relative z-[1] flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-xl max-h-[85dvh]",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-text-primary">
            Tomar foto
          </h2>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            aria-label="Cerrar"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="relative aspect-[4/3] w-full bg-slate-900">
          <video
            ref={videoRef}
            className={cn("h-full w-full object-cover", phase !== "live" && "invisible")}
            playsInline
            muted
            autoPlay
          />

          {phase === "starting" ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/90">
              Iniciando cámara…
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 px-4 text-center">
              <Camera className="size-10 text-white/50" strokeWidth={1.5} aria-hidden />
              <p className="text-sm leading-relaxed text-white/90">{errorHint}</p>
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
              >
                Abrir cámara del sistema
              </button>
              <input
                ref={fallbackInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                tabIndex={-1}
                onChange={handleFallbackChange}
              />
            </div>
          ) : null}
        </div>

        {phase === "live" ? (
          <div className="flex gap-2 border-t border-border bg-background p-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="flex-1 rounded-xl border border-border bg-white py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={captureFrame}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            >
              <Camera className="size-4" strokeWidth={2} aria-hidden />
              Capturar
            </button>
          </div>
        ) : phase === "error" ? (
          <div className="border-t border-border bg-background p-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="w-full rounded-xl border border-border bg-white py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface/80"
            >
              Cerrar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
