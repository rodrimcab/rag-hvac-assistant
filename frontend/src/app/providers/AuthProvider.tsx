import { useMemo, useState, type ReactNode } from "react";
import { AuthContext, type SessionUser } from "./auth-context";

const demoUser: SessionUser = {
  name: "Usuario de Prueba",
  roleLabel: "Técnico • UCA 2026",
  initials: "U",
};

type AuthProviderProps = {
  children: ReactNode;
  /** Cambia a `null` para probar el estado “Iniciar sesión”. */
  initialUser?: SessionUser | null;
};

export function AuthProvider({ children, initialUser = demoUser }: AuthProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  const value = useMemo(
    () => ({
      user,
      setUser,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
