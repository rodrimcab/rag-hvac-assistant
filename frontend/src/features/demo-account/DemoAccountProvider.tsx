import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  DEMO_ACCOUNTS,
  readStoredDemoOwnerId,
  writeStoredDemoOwnerId,
  type DemoAccountDefinition,
} from "../../lib/demoAccounts";

export type DemoAccountContextValue = {
  ownerId: string;
  accounts: readonly DemoAccountDefinition[];
  setOwnerId: (id: string) => void;
};

const DemoAccountContext = createContext<DemoAccountContextValue | null>(null);

type DemoAccountProviderProps = {
  children: ReactNode;
};

export function DemoAccountProvider({ children }: DemoAccountProviderProps) {
  const { setUser } = useAuth();
  const [ownerId, setOwnerIdState] = useState(readStoredDemoOwnerId);

  const applyAccount = useCallback(
    (id: string) => {
      const acc = DEMO_ACCOUNTS.find((a) => a.id === id) ?? DEMO_ACCOUNTS[0]!;
      writeStoredDemoOwnerId(acc.id);
      setOwnerIdState(acc.id);
      setUser({ ...acc.sessionUser });
    },
    [setUser],
  );

  useLayoutEffect(() => {
    applyAccount(readStoredDemoOwnerId());
  }, [applyAccount]);

  const setOwnerId = useCallback(
    (id: string) => {
      applyAccount(id);
    },
    [applyAccount],
  );

  const value = useMemo(
    () => ({
      ownerId,
      accounts: DEMO_ACCOUNTS,
      setOwnerId,
    }),
    [ownerId, setOwnerId],
  );

  return <DemoAccountContext.Provider value={value}>{children}</DemoAccountContext.Provider>;
}

export function useDemoAccount(): DemoAccountContextValue {
  const ctx = useContext(DemoAccountContext);
  if (!ctx) {
    throw new Error("useDemoAccount debe usarse dentro de DemoAccountProvider");
  }
  return ctx;
}
