import { Link } from "react-router-dom";
import { IconTrash } from "../hud/Icons";
import type { Note } from "../../api/types";
import { NOTE_TYPE_LABELS, SOURCE_LABELS } from "../../api/types";

export function NoteCard({ note, onDelete }: { note: Note; onDelete?: (note: Note) => void }) {
  const preview = (note.content_md ?? "").replace(/[#*_`>-]/g, "").slice(0, 140);
  return (
    <Link
      to={`/notes/${note.id}`}
      className="group relative block rounded-lg glass-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate font-medium">{note.title}</h3>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
          {onDelete && (
            <button
              onClick={(e) => {
                // Inside a Link — stop the card navigating.
                e.preventDefault();
                e.stopPropagation();
                onDelete(note);
              }}
              aria-label={`Delete ${note.title}`}
              title="Delete note"
              className="text-[var(--hud-text-dim)] opacity-0 transition-all hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
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
