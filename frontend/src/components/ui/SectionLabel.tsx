import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type SectionLabelProps = {
  children: ReactNode;
  className?: string;
};

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "px-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary",
        className,
      )}
    >
      {children}
    </p>
  );
}
