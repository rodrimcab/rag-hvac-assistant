import { Plus } from "lucide-react";
import { cn } from "../../../lib/cn";

type NewDiagnosisButtonProps = {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

export function NewDiagnosisButton({ onClick, className, disabled = false }: NewDiagnosisButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
        "hover:bg-primary-hover active:bg-primary-active",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
        "disabled:pointer-events-none disabled:opacity-45",
        className,
      )}
    >
      <Plus className="size-4 shrink-0 stroke-[2.5]" aria-hidden />
      Nuevo diagnóstico
    </button>
  );
}
