import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { CommandBar } from "./components/layout/CommandBar";
import { SetupWizard } from "./components/setup/SetupWizard";
import { useProfile } from "./hooks/useProfile";
import { Dashboard } from "./pages/Dashboard";
import { Sprints } from "./pages/Sprints";
import { SprintDetail } from "./pages/SprintDetail";
import { SprintRetro } from "./pages/SprintRetro";
import { Notes } from "./pages/Notes";
import { NoteEditor } from "./pages/NoteEditor";
import { Kb } from "./pages/Kb";
import { KbArticlePage } from "./pages/KbArticle";
import { Calendar } from "./pages/Calendar";
import { Time } from "./pages/Time";
import { Inbox } from "./pages/Inbox";
import { Templates } from "./pages/Templates";
import { Settings } from "./pages/Settings";

function App() {
  const { profile, loading } = useProfile();

  if (loading) return null;
  if (!profile) return <SetupWizard />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sprints" element={<Sprints />} />
          <Route path="/sprints/:id" element={<SprintDetail />} />
          <Route path="/sprints/:id/retro" element={<SprintRetro />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:id" element={<NoteEditor />} />
          <Route path="/kb" element={<Kb />} />
          <Route path="/kb/:id" element={<KbArticlePage />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/time" element={<Time />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <CommandBar />
    </div>
  );
}

export default App;
