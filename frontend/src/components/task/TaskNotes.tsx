import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { notesApi } from "../../api/notes";
import type { Note } from "../../api/types";
import { SOURCE_LABELS } from "../../api/types";

export function TaskNotes({ taskId }: { taskId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function load() {
    notesApi.list({ task_id: taskId }).then(setNotes);
  }

  useEffect(load, [taskId]);

  async function addNote() {
    if (!draft.trim()) return;
    await notesApi.create({
      title: draft.split("\n")[0].slice(0, 80) || "Note",
      content_md: draft,
      task_id: taskId,
      note_type: "general",
    });
    setDraft("");
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium uppercase text-gray-400">Notes</label>
        <button onClick={() => setAdding((a) => !a)} className="text-xs font-medium text-blue-600 hover:underline">
          + Add Note
        </button>
      </div>

      {adding && (
        <div className="mb-3 space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Markdown note…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="text-sm text-gray-500 hover:underline">
              Cancel
            </button>
            <button onClick={addNote} className="rounded-lg btn-primary px-3 py-1.5 text-sm font-medium text-white">
              Save note
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {notes.map((n) => (
          <Link
            key={n.id}
            to={`/notes/${n.id}`}
            className="block rounded-lg border border-gray-200 p-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{n.title}</span>
              {n.source !== "manual" && (
                <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {SOURCE_LABELS[n.source]}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</p>
          </Link>
        ))}
        {notes.length === 0 && !adding && <p className="text-sm text-gray-400">No notes yet.</p>}
      </div>
    </div>
  );
}
