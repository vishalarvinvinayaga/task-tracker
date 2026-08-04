import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notesApi } from "../../api/notes";
import { kbApi } from "../../api/kb";
import { inboxApi } from "../../api/inbox";
import { tasksApi } from "../../api/tasks";
import { useToast } from "../../hooks/useToast";
import type { KbSearchResult, NoteSearchResult } from "../../api/types";

const NAV_SHORTCUTS = [
  { label: "Go to Dashboard", path: "/" },
  { label: "Go to Sprints", path: "/sprints" },
  { label: "Go to Notes", path: "/notes" },
  { label: "Go to Knowledge Base", path: "/kb" },
  { label: "Go to Calendar", path: "/calendar" },
  { label: "Go to Time", path: "/time" },
  { label: "Go to Inbox", path: "/inbox" },
  { label: "Go to Templates", path: "/templates" },
];

export function CommandBar() {
  const [mode, setMode] = useState<"closed" | "search" | "task">("closed");
  const [query, setQuery] = useState("");
  const [noteResults, setNoteResults] = useState<NoteSearchResult[]>([]);
  const [kbResults, setKbResults] = useState<KbSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode((m) => (m === "search" ? "closed" : "search"));
      } else if (cmd && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        const note = await notesApi.create({ title: "Untitled note", note_type: "general" });
        toast.show("New note created");
        navigate(`/notes/${note.id}`);
      } else if (cmd && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setMode("task");
      } else if (e.key === "Escape") {
        setMode("closed");
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "closed") setTimeout(() => inputRef.current?.focus(), 0);
    else {
      setQuery("");
      setNoteResults([]);
      setKbResults([]);
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "search" || query.trim().length < 2) {
      setNoteResults([]);
      setKbResults([]);
      return;
    }
    const handle = setTimeout(() => {
      notesApi.search(query, 4).then(setNoteResults);
      kbApi.search(query, 4).then(setKbResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [query, mode]);

  if (mode === "closed") return null;

  const filteredNav = NAV_SHORTCUTS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));

  async function captureQuick() {
    if (!query.trim()) return;
    await inboxApi.capture(query.trim());
    toast.show("Captured to inbox");
    setMode("closed");
  }

  async function createTask() {
    if (!query.trim()) return;
    try {
      const task = await tasksApi.create({ title: query.trim() });
      toast.show("Task created in active sprint");
      setMode("closed");
      navigate(`/sprints/${task.sprint_id}`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not create task", "error");
    }
  }

  function go(path: string) {
    navigate(path);
    setMode("closed");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={() => setMode("closed")}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (mode === "task") return createTask();
            if (filteredNav.length === 0 && noteResults.length === 0 && kbResults.length === 0) captureQuick();
          }}
          placeholder={mode === "task" ? "New task title — Enter to create in active sprint…" : "Search, navigate, or type to quick-capture…"}
          className="w-full border-b border-gray-200 px-4 py-3 text-sm focus:outline-none dark:border-gray-800 dark:bg-gray-900"
        />
        {mode === "task" ? (
          <div className="p-3 text-xs text-gray-400">Press Enter to create · Esc to cancel</div>
        ) : (
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredNav.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase text-gray-400">Navigate</p>
                {filteredNav.map((n) => (
                  <button key={n.path} onClick={() => go(n.path)} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                    {n.label}
                  </button>
                ))}
              </div>
            )}
            {noteResults.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase text-gray-400">Notes</p>
                {noteResults.map((r) => (
                  <button key={r.id} onClick={() => go(`/notes/${r.id}`)} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                    {r.title}
                  </button>
                ))}
              </div>
            )}
            {kbResults.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase text-gray-400">Knowledge base</p>
                {kbResults.map((r) => (
                  <button key={r.id} onClick={() => go(`/kb/${r.id}`)} className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                    {r.title}
                  </button>
                ))}
              </div>
            )}
            {query.trim() && (
              <button onClick={captureQuick} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                Quick capture: "{query.trim()}"
              </button>
            )}
            {!query.trim() && filteredNav.length === NAV_SHORTCUTS.length && (
              <p className="px-2 py-1 text-xs text-gray-400">
                Type to search notes, KB, or navigate. Enter captures free text to your inbox. ⌘N new task · ⌘⇧N new note.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
