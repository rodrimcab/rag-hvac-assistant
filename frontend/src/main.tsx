import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers/AppProviders";
import App from "./App.tsx";
import { ChatWorkspaceProvider } from "./features/chat/context/ChatWorkspaceProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <ChatWorkspaceProvider>
        <App />
      </ChatWorkspaceProvider>
    </AppProviders>
  </StrictMode>,
);
