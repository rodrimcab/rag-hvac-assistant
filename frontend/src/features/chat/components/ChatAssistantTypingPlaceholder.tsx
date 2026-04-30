import ucaLogo from "../../../assets/uca-logo.svg";
import { cn } from "../../../lib/cn";

type ChatAssistantTypingPlaceholderProps = {
  className?: string;
};

/** Placeholder en el hilo mientras llega la respuesta del asistente (misma silueta que la burbuja). */
export function ChatAssistantTypingPlaceholder({ className }: ChatAssistantTypingPlaceholderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("flex justify-start gap-2", className)}
    >
      <span className="sr-only">El asistente está generando una respuesta</span>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-active shadow-sm"
        aria-hidden
      >
        <img
          src={ucaLogo}
          alt=""
          width={16}
          height={22}
          className="h-5 w-auto object-contain"
          decoding="async"
        />
      </div>
      <div
        className={cn(
          "max-w-[min(100%,36rem)] rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-sm shadow-sm",
        )}
      >
        <div className="flex items-center gap-1.5 py-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 shrink-0 rounded-full bg-text-secondary/45 motion-safe:animate-[typing-dot_1s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 0.16}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
