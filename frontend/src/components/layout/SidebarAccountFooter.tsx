import { Check, ChevronsUpDown, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDemoAccount } from "../../features/demo-account/DemoAccountProvider";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";

type SidebarAccountFooterProps = {
  className?: string;
  onSignInClick?: () => void;
};

export function SidebarAccountFooter({ className, onSignInClick }: SidebarAccountFooterProps) {
  const { user } = useAuth();
  const { ownerId, accounts, setOwnerId } = useDemoAccount();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (!user) {
    return (
      <div className={cn("pt-2", className)}>
        <button
          type="button"
          onClick={onSignInClick}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-primary transition-colors",
            "hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
          )}
        >
          <LogIn className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          Iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      {open ? (
        <div
          role="listbox"
          aria-label="Seleccionar cuenta demo"
          className={cn(
            "absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-lg shadow-black/10",
          )}
        >
          <div className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            Cuenta demo
          </div>
          {accounts.map((account) => {
            const selected = account.id === ownerId;
            return (
              <button
                key={account.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setOwnerId(account.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                  "hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
                  selected && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    selected
                      ? "bg-primary text-white"
                      : "bg-surface text-primary-active",
                  )}
                  aria-hidden
                >
                  {account.sessionUser.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-primary">
                    {account.label}
                  </span>
                  <span className="block truncate text-xs text-text-secondary">
                    {account.sessionUser.roleLabel}
                  </span>
                </span>
                {selected ? (
                  <Check className="size-4 shrink-0 text-primary" strokeWidth={2.2} aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border bg-white/70 px-3 py-2.5 text-left shadow-sm transition-colors",
          "hover:border-border/80 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-active"
            aria-hidden
          >
            {user.initials}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text-primary">{user.name}</span>
          <span className="block truncate text-xs text-text-secondary">{user.roleLabel}</span>
        </span>
        <ChevronsUpDown
          className="size-4 shrink-0 text-text-secondary"
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
  );
}
