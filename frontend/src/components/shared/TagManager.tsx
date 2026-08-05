import { useEffect, useState } from "react";
import { tagsApi } from "../../api/tags";
import type { TagWithUsage } from "../../api/types";
import { useToast } from "../../hooks/useToast";

/** Sensible starting palette — any hex still works via the colour input. */
const SWATCHES = [
  "#3B82F6", "#06B6D4", "#10B981", "#84CC16",
  "#F59E0B", "#F97316", "#EF4444", "#EC4899",
  "#A855F7", "#6366F1", "#64748B", "#78716C",
];

function usageLabel(tag: TagWithUsage): string | null {
  const parts: string[] = [];
  if (tag.task_count) parts.push(`${tag.task_count} task${tag.task_count === 1 ? "" : "s"}`);
  if (tag.note_count) parts.push(`${tag.note_count} note${tag.note_count === 1 ? "" : "s"}`);
  if (tag.kb_count) parts.push(`${tag.kb_count} article${tag.kb_count === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : null;
}

function TagRow({ tag, onChanged }: { tag: TagWithUsage; onChanged: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(tag.name);
    setColor(tag.color);
  }, [tag.name, tag.color]);

  async function save(patch: { name?: string; color?: string }) {
    setBusy(true);
    try {
      await tagsApi.update(tag.id, patch);
      onChanged();
    } catch (err) {
      // Roll the field back so the UI never shows an unsaved value as saved.
      setName(tag.name);
      setColor(tag.color);
      toast.show(err instanceof Error ? err.message : "Couldn't update tag", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const usage = usageLabel(tag);
    const warning = usage
      ? `Delete "${tag.name}"? It's currently on ${usage}. They'll keep existing — they just lose this tag.`
      : `Delete "${tag.name}"?`;
    if (!window.confirm(warning)) return;

    setBusy(true);
    try {
      await tagsApi.remove(tag.id);
      toast.show(`Deleted "${tag.name}"`);
      onChanged();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't delete tag", "error");
    } finally {
      setBusy(false);
    }
  }

  const usage = usageLabel(tag);

  return (
    <div className="hud-frame flex items-center gap-3 px-3 py-2" style={{ "--hud-notch": "6px" } as React.CSSProperties}>
      <input
        type="color"
        value={color}
        disabled={busy}
        onChange={(e) => setColor(e.target.value)}
        onBlur={() => color.toLowerCase() !== tag.color.toLowerCase() && save({ color })}
        title="Change colour"
        className="h-6 w-6 shrink-0 cursor-pointer border-0 bg-transparent p-0"
      />

      {/* The colour input and the name field already convey how the chip will
          look, so no separate preview — it only stole width from the name. */}
      <input
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== tag.name && save({ name: name.trim() })}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium outline-none focus:underline"
        style={{ color }}
        aria-label={`Rename ${tag.name}`}
      />

      <span
        className="hud-readout shrink-0 whitespace-nowrap text-[10px] text-[var(--hud-text-dim)]"
        title={usage ?? "Not used anywhere yet"}
      >
        {usage ?? "unused"}
      </span>

      <button
        onClick={remove}
        disabled={busy}
        className="hud-mono shrink-0 text-[10px] uppercase tracking-wider text-[var(--hud-text-dim)] transition-colors hover:text-rose-400"
      >
        Delete
      </button>
    </div>
  );
}

export function TagManager() {
  const toast = useToast();
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [busy, setBusy] = useState(false);

  function load() {
    tagsApi.list().then(setTags);
  }

  useEffect(load, []);

  async function create() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await tagsApi.create(newName.trim(), newColor);
      setNewName("");
      setNewColor(SWATCHES[(SWATCHES.indexOf(newColor) + 1) % SWATCHES.length]);
      load();
      toast.show("Tag created");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't create tag", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {tags.map((t) => (
          <TagRow key={t.id} tag={t} onChanged={load} />
        ))}
        {tags.length === 0 && <p className="text-sm text-[var(--hud-text-dim)]">No tags yet.</p>}
      </div>

      <div className="border-t border-[var(--hud-line)] pt-4">
        <label className="hud-label mb-2 block">New tag</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            title="Pick a colour"
            className="h-8 w-8 shrink-0 cursor-pointer border-0 bg-transparent p-0"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Tag name"
            className="min-w-0 flex-1 border border-[var(--hud-line)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--hud-line-strong)]"
          />
          <button
            onClick={create}
            disabled={busy || !newName.trim()}
            className="btn-primary shrink-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
          >
            Add
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              title={c}
              aria-label={`Use colour ${c}`}
              className="h-5 w-5 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: newColor.toLowerCase() === c.toLowerCase() ? "2px solid var(--accent-via)" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
