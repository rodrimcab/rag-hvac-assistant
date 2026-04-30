import { Search } from "lucide-react";
import { cn } from "../../../lib/cn";

type SidebarSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SidebarSearchInput({
  value,
  onChange,
  placeholder = "Buscar chats...",
  className,
}: SidebarSearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-disabled",
          "focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30",
        )}
        autoComplete="off"
      />
    </div>
  );
}
