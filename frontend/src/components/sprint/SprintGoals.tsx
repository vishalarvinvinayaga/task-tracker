import { useState } from "react";
import { sprintsApi } from "../../api/sprints";
import type { SprintGoal } from "../../api/types";

export function SprintGoals({ sprintId, goals, onChanged }: { sprintId: number; goals: SprintGoal[]; onChanged: () => void }) {
  const [newTitle, setNewTitle] = useState("");

  async function addGoal() {
    if (!newTitle.trim()) return;
    await sprintsApi.createGoal(sprintId, newTitle.trim());
    setNewTitle("");
    onChanged();
  }

  return (
    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sprint goals</h3>
      <div className="space-y-2">
        {goals.map((g) => (
          <div key={g.id} className="flex items-center gap-3">
            <span className="w-48 truncate text-sm">{g.title}</span>
            <input
              type="range"
              min={0}
              max={100}
              defaultValue={g.progress_pct}
              onMouseUp={(e) => sprintsApi.updateGoal(sprintId, g.id, { progress_pct: Number((e.target as HTMLInputElement).value) }).then(onChanged)}
              className="flex-1"
            />
            <span className="w-10 text-right text-xs text-gray-400">{g.progress_pct}%</span>
            <button
              onClick={() => sprintsApi.deleteGoal(sprintId, g.id).then(onChanged)}
              className="text-xs text-gray-300 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
            placeholder="New goal…"
            className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <button onClick={addGoal} className="rounded-lg bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
