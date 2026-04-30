import ucaLogo from "../../assets/uca-logo.svg";
import { cn } from "../../lib/cn";

const DEFAULT_TITLE = "hvac-assistant";
const DEFAULT_SUBTITLE = "RAG - Diagnóstico técnico";

type SidebarBrandHeaderProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export function SidebarBrandHeader({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  className,
}: SidebarBrandHeaderProps) {
  return (
    <header className={cn("flex gap-3", className)}>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-active shadow-sm"
        aria-hidden
      >
        <img
          src={ucaLogo}
          alt=""
          width={20}
          height={28}
          className="h-7 w-auto object-contain"
          decoding="async"
        />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-text-primary">
          {title}
        </h1>
        <p className="mt-0.5 truncate text-xs leading-snug text-text-secondary">{subtitle}</p>
      </div>
    </header>
  );
}
