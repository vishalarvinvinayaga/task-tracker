import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { NoteCard } from "../components/notes/NoteCard";
import { notesApi } from "../api/notes";
import type { Note, NoteSearchResult, NoteType } from "../api/types";
import { NOTE_TYPE_LABELS } from "../api/types";

export function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteType, setNoteType] = useState<NoteType | "">("");
  const [standaloneOnly, setStandaloneOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NoteSearchResult[] | null>(null);

  function load() {
    notesApi.list({ note_type: noteType || undefined, standalone_only: standaloneOnly }).then(setNotes);
  }

  useEffect(load, [noteType, standaloneOnly]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      notesApi.search(query).then(setSearchResults);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function createNote() {
    const note = await notesApi.create({ title: "Untitled note", note_type: "general" });
    navigate(`/notes/${note.id}`);
  }

  return (
    <>
      <Header title="Notes" />
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as NoteType | "")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All types</option>
            {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={standaloneOnly} onChange={(e) => setStandaloneOnly(e.target.checked)} />
            Standalone only
          </label>
          <button
            onClick={createNote}
            className="ml-auto rounded-lg btn-primary px-4 py-2 text-sm font-medium text-white"
          >
            New Note
          </button>
        </div>

        {searchResults ? (
          <div className="space-y-2">
            <p className="text-xs uppercase text-gray-400">{searchResults.length} search result(s)</p>
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/notes/${r.id}`)}
                className="block w-full rounded-lg glass-card p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.title}</h3>
                  <span className="text-xs text-gray-400">{NOTE_TYPE_LABELS[r.note_type]}</span>
                </div>
                <p
                  className="mt-1 text-sm text-gray-500 dark:text-gray-400 [&_b]:text-blue-600 dark:[&_b]:text-blue-400"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
            {notes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
          </div>
        )}
      </div>
    </>
  );
}
