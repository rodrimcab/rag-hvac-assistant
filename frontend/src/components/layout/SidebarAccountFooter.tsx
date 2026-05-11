import { LogIn } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";

type SidebarAccountFooterProps = {
  className?: string;
  onSignInClick?: () => void;
};

export function SidebarAccountFooter({ className, onSignInClick }: SidebarAccountFooterProps) {
  const { user } = useAuth();

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
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-white/60 px-3 py-2.5",
        className,
      )}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-primary-active"
          aria-hidden
        >
          {user.initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
        <p className="truncate text-xs text-text-secondary">{user.roleLabel}</p>
      </div>
    </div>
  );
}
