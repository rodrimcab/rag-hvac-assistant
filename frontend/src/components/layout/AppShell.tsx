import type { ReactNode } from "react";
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
  return (
    <div className="flex h-full min-h-0">
      <AppSidebar
        manualsCount={manualsCount}
        manualsNavActive={manualsNavActive}
        onManualsClick={onManualsClick}
        onNewDiagnosis={onNewDiagnosis}
        onSelectThread={onSelectThread}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white text-text-primary">
        {children}
      </main>
    </div>
  );
}
