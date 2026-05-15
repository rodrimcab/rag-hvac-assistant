import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "./app/providers/AppProviders";
import App from "./App.tsx";
import { ChatWorkspaceProvider } from "./features/chat/context/ChatWorkspaceProvider";
import { DemoAccountProvider } from "./features/demo-account/DemoAccountProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <DemoAccountProvider>
        <ChatWorkspaceProvider>
          <App />
        </ChatWorkspaceProvider>
      </DemoAccountProvider>
    </AppProviders>
  </StrictMode>,
);
