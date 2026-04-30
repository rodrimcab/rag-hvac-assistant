import { useContext } from "react";
import {
  ChatWorkspaceContext,
  type ChatWorkspaceContextValue,
} from "../context/chat-workspace-context";

export function useChatWorkspace(): ChatWorkspaceContextValue {
  const ctx = useContext(ChatWorkspaceContext);
  if (!ctx) {
    throw new Error("useChatWorkspace debe usarse dentro de ChatWorkspaceProvider");
  }
  return ctx;
}
