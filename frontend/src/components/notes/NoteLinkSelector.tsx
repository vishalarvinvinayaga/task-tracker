import { useState } from "react";
import type { LinkType } from "../../api/types";
import { notesApi } from "../../api/notes";

export function NoteLinkSelector({ noteId, onLinked }: { noteId: number; onLinked: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: number; title: string }[]>([]);
  const [linkType, setLinkType] = useState<LinkType>("reference");

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const hits = await notesApi.search(q, 8);
    setResults(hits.filter((h) => h.id !== noteId).map((h) => ({ id: h.id, title: h.title })));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search notes to link…"
          className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <select
          value={linkType}
          onChange={(e) => setLinkType(e.target.value as LinkType)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="reference">Reference</option>
          <option value="related">Related</option>
          <option value="followup">Follow-up</option>
        </select>
      </div>
      {results.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={async () => {
                await notesApi.createLink(noteId, r.id, linkType);
                setQuery("");
                setResults([]);
                onLinked();
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {r.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
