import { AppShell } from "./components/layout/AppShell";

function App() {
  return (
    <div className="h-screen min-h-0 bg-background font-sans text-text-primary antialiased">
      <AppShell>
        <p className="text-text-secondary">Área de chat</p>
      </AppShell>
    </div>
  );
}

export default App;