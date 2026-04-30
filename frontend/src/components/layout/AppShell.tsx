import { Menu } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useMobileSidebar } from "../../hooks/useMobileSidebar";
import { cn } from "../../lib/cn";
import { AppSidebar } from "./AppSidebar";

type AppShellProps = {
  children: ReactNode;
  manualsCount: number;
  manualsNavActive: boolean;
  onManualsClick: () => void;
  onNewDiagnosis: () => void;
  onSelectThread: () => void;
};

export function AppShell({
  children,
  manualsCount,
  manualsNavActive,
  onManualsClick,
  onNewDiagnosis,
  onSelectThread,
}: AppShellProps) {
  const { open, setOpen } = useMobileSidebar();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <div className="flex h-full min-h-0">
      {/* Mobile sidebar backdrop */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <AppSidebar
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 transition-transform duration-200 ease-out lg:static",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        manualsCount={manualsCount}
        manualsNavActive={manualsNavActive}
        onManualsClick={() => {
          setOpen(false);
          onManualsClick();
        }}
        onNewDiagnosis={() => {
          setOpen(false);
          onNewDiagnosis();
        }}
        onSelectThread={() => {
          setOpen(false);
          onSelectThread();
        }}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white text-text-primary">
        {/* Mobile top navigation bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" strokeWidth={2} />
          </button>
          <span className="truncate text-base font-semibold tracking-tight text-text-primary">
            hvac-assistant
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}
