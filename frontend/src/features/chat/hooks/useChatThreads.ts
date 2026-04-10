import { useMemo, useState } from "react";
import type { ChatThread } from "../types/thread.types";
import { getMockThreads } from "../services/thread.service";

export function useChatThreads(): ChatThread[] {
  const [anchor] = useState(() => new Date());
  return useMemo(() => getMockThreads(anchor), [anchor]);
}
