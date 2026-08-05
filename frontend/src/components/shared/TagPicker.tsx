import { useEffect, useRef, useState } from "react";
import type { Tag } from "../../api/types";
import { tagsApi } from "../../api/tags";

export function TagPicker({
  allTags,
  selectedIds,
  onChange,
  onTagsChanged,
}: {
  allTags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** Lets the parent refetch after a tag is created inline. */
  onTagsChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(allTags);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setTags(allTags), [allTags]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = tags.filter((t) => selectedIds.includes(t.id));
  const query = filter.trim();
  const visible = query ? tags.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())) : tags;
  const exactExists = tags.some((t) => t.name.toLowerCase() === query.toLowerCase());

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  /** Create-and-select, so a missing tag doesn't derail what you were doing. */
  async function createInline() {
    if (!query || exactExists || creating) return;
    setCreating(true);
    try {
      const tag = await tagsApi.create(query);
      setTags((prev) => [...prev, tag]);
      onChange([...selectedIds, tag.id]);
      setFilter("");
      onTagsChanged?.();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 border border-[var(--hud-line)] bg-transparent px-2 py-1.5 text-sm"
      >
        {selected.length === 0 && <span className="text-[var(--hud-text-dim)]">Add tags…</span>}
        {selected.map((t) => (
          <span
            key={t.id}
            className="px-1.5 py-0.5 text-[11px] font-medium"
            style={{ border: `1px solid ${t.color}`, color: t.color }}
          >
            {t.name}
          </span>
        ))}
      </button>

      {open && (
        <div className="glass-panel absolute z-20 mt-1 w-60 p-1 shadow-xl">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!exactExists) createInline();
              }
            }}
            placeholder="Filter or type a new tag…"
            className="mb-1 w-full border border-[var(--hud-line)] bg-transparent px-2 py-1.5 text-xs outline-none focus:border-[var(--hud-line-strong)]"
          />

          <div className="max-h-52 overflow-y-auto">
            {visible.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--accent-via)_12%,transparent)]"
              >
                <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggle(t.id)} />
                <span className="inline-block h-2 w-2 shrink-0 rotate-45" style={{ backgroundColor: t.color }} />
                <span className="truncate">{t.name}</span>
              </label>
            ))}
            {visible.length === 0 && !query && (
              <p className="px-2 py-2 text-xs text-[var(--hud-text-dim)]">No tags yet.</p>
            )}
          </div>

          {query && !exactExists && (
            <button
              type="button"
              onClick={createInline}
              disabled={creating}
              className="hud-label mt-1 w-full border-t border-[var(--hud-line)] px-2 py-2 text-left transition-colors hover:text-[var(--accent-via)]"
            >
              {creating ? "Creating…" : `+ Create "${query}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
