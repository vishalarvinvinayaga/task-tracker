import { useEffect, useState } from "react";
import { sprintsApi } from "../../api/sprints";
import { tasksApi } from "../../api/tasks";
import type { SprintWithStats, Task } from "../../api/types";
import { Modal } from "../shared/Modal";

export function SprintCloseModal({
  sprint,
  onClose,
  onClosed,
}: {
  sprint: SprintWithStats;
  onClose: () => void;
  onClosed: (nextSprintId: number) => void;
}) {
  const [incomplete, setIncomplete] = useState<Task[]>([]);
  const [carryIds, setCarryIds] = useState<Set<number>>(new Set());
  const [otherSprints, setOtherSprints] = useState<SprintWithStats[]>([]);
  const [target, setTarget] = useState<"new" | number>("new");
  const [newName, setNewName] = useState(`${sprint.name} (cont.)`);
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [newEnd, setNewEnd] = useState(new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    tasksApi.list({ sprint_id: sprint.id }).then((tasks) => {
      const inc = tasks.filter((t) => t.status !== "done");
      setIncomplete(inc);
      setCarryIds(new Set(inc.map((t) => t.id)));
    });
    // Carry-over targets: any open container that isn't this one. Lists are
    // valid destinations too — parking work on the Backlog is a real choice.
    sprintsApi
      .list()
      .then((containers) =>
        setOtherSprints(containers.filter((c) => c.id !== sprint.id && c.status !== "closed")),
      );
  }, [sprint.id]);

  function toggle(id: number) {
    setCarryIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit() {
    setBusy(true);
    try {
      let nextSprintId: number;
      if (target === "new") {
        const created = await sprintsApi.create({ name: newName, start_date: newStart, end_date: newEnd, status: "planned" });
        nextSprintId = created.id;
      } else {
        nextSprintId = target;
      }
      await sprintsApi.close(sprint.id, Array.from(carryIds), nextSprintId);
      onClosed(nextSprintId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Close "${sprint.name}"`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-gray-500">
            {incomplete.length} incomplete task{incomplete.length === 1 ? "" : "s"}. Choose which to carry forward.
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
            {incomplete.length === 0 && <p className="text-sm text-gray-400">Nothing incomplete — nice.</p>}
            {incomplete.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                <input type="checkbox" checked={carryIds.has(t.id)} onChange={() => toggle(t.id)} />
                <span className="truncate">{t.title}</span>
                <span className="ml-auto text-xs text-gray-400">{t.status}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Carry into</label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value === "new" ? "new" : Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="new">Create a new sprint…</option>
            {otherSprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>

        {target === "new" && (
          <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              placeholder="New sprint name"
            />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
              <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            disabled={busy || (target === "new" && !newName.trim())}
            onClick={submit}
            className="rounded-lg btn-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Closing…" : "Close sprint"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
