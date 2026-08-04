import { useEffect, useRef, useState } from "react";
import type { Tag } from "../../api/types";

export function TagPicker({
  allTags,
  selectedIds,
  onChange,
}: {
  allTags: Tag[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(allTags);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setTags(allTags), [allTags]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = tags.filter((t) => selectedIds.includes(t.id));

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
      >
        {selected.length === 0 && <span className="text-gray-400">Add tags…</span>}
        {selected.map((t) => (
          <span
            key={t.id}
            className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: t.color }}
          >
            {t.name}
          </span>
        ))}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {tags.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggle(t.id)} />
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
