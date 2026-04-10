import type { ReactNode } from "react";
import type { SessionUser } from "./auth-context";
import { AuthProvider } from "./AuthProvider";

type AppProvidersProps = {
  children: ReactNode;
  initialUser?: SessionUser | null;
};

export function AppProviders({ children, initialUser }: AppProvidersProps) {
  return <AuthProvider initialUser={initialUser}>{children}</AuthProvider>;
}
