import { AppShell } from "./components/layout/AppShell";
import { ChatPanel } from "./features/chat/components/ChatPanel";

function App() {
  return (
    <div className="h-screen min-h-0 bg-background font-sans text-text-primary antialiased">
      <AppShell>
        <ChatPanel />
      </AppShell>
    </div>
  );
}

export default App;