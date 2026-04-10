import { createContext } from "react";

export type SessionUser = {
  name: string;
  roleLabel: string;
  initials: string;
  avatarUrl?: string | null;
};

export type AuthContextValue = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
