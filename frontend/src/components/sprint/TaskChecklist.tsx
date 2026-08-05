import { useEffect, useState } from "react";
import { tasksApi } from "../../api/tasks";
import type { Task } from "../../api/types";
import { PRIORITY_DOT } from "../../api/types";

/**
 * Flat checklist view — the alternative to kanban columns for people who just
 * want a list of things to tick off. Toggling the checkbox moves a task
 * between `todo` and `done`, so it stays consistent with the board.
 */
export function TaskChecklist({
  containerId,
  refreshKey,
  onOpenTask,
  onChanged,
  onAddTask,
}: {
  containerId: number;
  refreshKey: number;
  onOpenTask: (id: number) => void;
  onChanged: () => void;
  onAddTask: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    tasksApi.list({ sprint_id: containerId }).then(setTasks);
  }, [containerId, refreshKey]);

  async function toggle(task: Task) {
    const next = task.status === "done" ? "todo" : "done";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    await tasksApi.move(task.id, next);
    onChanged();
  }

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  function row(task: Task) {
    const isDone = task.status === "done";
    return (
      <div key={task.id} className="glass-card flex items-center gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => toggle(task)}
          className="shrink-0 cursor-pointer accent-[var(--accent-via)]"
          aria-label={`Mark ${task.title} ${isDone ? "not done" : "done"}`}
        />
        <button
          onClick={() => onOpenTask(task.id)}
          className={`flex min-w-0 flex-1 items-center gap-2 text-left text-sm transition-colors hover:text-[var(--accent-via)] ${
            isDone ? "text-[var(--hud-text-dim)] line-through" : ""
          }`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rotate-45 ${PRIORITY_DOT[task.priority]}`} />
          <span className="truncate">{task.title}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.tags.map((t) => (
            <span
              key={t.id}
              className="px-1.5 py-0.5 text-[10px] font-medium"
              style={{ border: `1px solid ${t.color}`, color: t.color }}
            >
              {t.name}
            </span>
          ))}
          {task.due_date && (
            <span className="hud-readout text-[10px] text-[var(--hud-text-dim)]">
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="space-y-2">
        {open.map(row)}
        <button
          onClick={onAddTask}
          className="hud-label w-full border border-dashed border-[var(--hud-line)] py-2.5 transition-colors hover:border-[var(--hud-line-strong)] hover:text-[var(--accent-via)]"
        >
          + Add task
        </button>
      </div>

      {done.length > 0 && (
        <div>
          <h3 className="hud-label mb-2">Done · {done.length}</h3>
          <div className="space-y-2 opacity-60">{done.map(row)}</div>
        </div>
      )}
    </div>
  );
}
