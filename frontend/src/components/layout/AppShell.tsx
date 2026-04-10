import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-full min-h-0">
      <AppSidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-background p-4 text-text-primary">
        {children}
      </main>
    </div>
  );
}
