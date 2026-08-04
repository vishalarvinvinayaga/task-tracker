import { Link } from "react-router-dom";
import type { Note } from "../../api/types";
import { NOTE_TYPE_LABELS, SOURCE_LABELS } from "../../api/types";

export function NoteCard({ note }: { note: Note }) {
  const preview = (note.content_md ?? "").replace(/[#*_`>-]/g, "").slice(0, 140);
  return (
    <Link
      to={`/notes/${note.id}`}
      className="block rounded-lg glass-card p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{note.title}</h3>
        <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
      </div>
      {preview && <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{preview}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {NOTE_TYPE_LABELS[note.note_type]}
        </span>
        {note.source !== "manual" && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {SOURCE_LABELS[note.source]}
          </span>
        )}
        {note.tags.map((t) => (
          <span key={t.id} className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: t.color }}>
            {t.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
