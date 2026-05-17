import type { SessionUser } from "../app/providers/auth-context";

export const DEMO_OWNER_STORAGE_KEY = "rag-hvac-assistant:demo-owner-v1";

export type DemoAccountDefinition = {
  id: string;
  label: string;
  sessionUser: SessionUser;
};

const TEST_USER_COUNT = 6;

function buildTestDemoAccounts(): DemoAccountDefinition[] {
  return Array.from({ length: TEST_USER_COUNT }, (_, index) => {
    const n = index + 1;
    const label = `Usuario ${n}`;
    return {
      id: `usuario-${n}`,
      label,
      sessionUser: {
        name: label,
        roleLabel: "Cuenta personal • demo",
        initials: String(n),
      },
    };
  });
}

export const DEMO_ACCOUNTS: DemoAccountDefinition[] = [
  {
    id: "default",
    label: "Usuario general",
    sessionUser: {
      name: "Usuario general",
      roleLabel: "Cuenta compartida",
      initials: "G",
    },
  },
  ...buildTestDemoAccounts(),
];

export function isKnownDemoOwnerId(id: string): boolean {
  return DEMO_ACCOUNTS.some((a) => a.id === id);
}

export function getDemoAccountOrDefault(id: string | null | undefined): DemoAccountDefinition {
  const raw = (id ?? "").trim();
  if (raw && isKnownDemoOwnerId(raw)) {
    return DEMO_ACCOUNTS.find((a) => a.id === raw)!;
  }
  return DEMO_ACCOUNTS[0]!;
}

export function readStoredDemoOwnerId(): string {
  if (typeof window === "undefined") return DEMO_ACCOUNTS[0]!.id;
  try {
    const raw = window.localStorage.getItem(DEMO_OWNER_STORAGE_KEY);
    return getDemoAccountOrDefault(raw).id;
  } catch {
    return DEMO_ACCOUNTS[0]!.id;
  }
}

export function writeStoredDemoOwnerId(id: string): void {
  if (typeof window === "undefined") return;
  const acc = getDemoAccountOrDefault(id);
  try {
    window.localStorage.setItem(DEMO_OWNER_STORAGE_KEY, acc.id);
  } catch {
    // ignore
  }
}

export function demoOwnerFetchHeaders(demoOwnerId: string): Record<string, string> {
  return { "X-Demo-User": demoOwnerId };
}
