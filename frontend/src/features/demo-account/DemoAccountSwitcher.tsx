import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "../../lib/cn";
import { useDemoAccount } from "./DemoAccountProvider";

type DemoAccountSwitcherProps = {
  className?: string;
  disabled?: boolean;
};

export function DemoAccountSwitcher({ className, disabled = false }: DemoAccountSwitcherProps) {
  const selectId = useId();
  const { ownerId, accounts, setOwnerId } = useDemoAccount();

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={selectId} className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary">
        Cuenta demo
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={ownerId}
          disabled={disabled}
          onChange={(e) => setOwnerId(e.target.value)}
          className={cn(
            "w-full cursor-pointer appearance-none rounded-xl border border-border bg-white py-2.5 pl-3 pr-10 text-sm text-text-primary",
            "shadow-sm transition-colors hover:border-border/80",
            "focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30",
            "disabled:cursor-not-allowed disabled:bg-surface/80 disabled:opacity-60",
          )}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  );
}
