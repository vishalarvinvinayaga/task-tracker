import type { Task } from "../../api/types";
import { PRIORITY_DOT, STATUS_LABELS } from "../../api/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function TodayView({ tasks, onOpenTask }: { tasks: Task[]; onOpenTask: (id: number) => void }) {
  const today = todayStr();
  const relevant = tasks.filter((t) => t.due_date === today || t.status === "in_progress");

  if (relevant.length === 0) {
    return <p className="text-sm text-gray-400">Nothing due today, and nothing in progress. Clear board.</p>;
  }

  return (
    <div className="space-y-2">
      {relevant.map((t) => (
        <button
          key={t.id}
          onClick={() => onOpenTask(t.id)}
          className="flex w-full items-center gap-3 rounded-lg glass-card p-3 text-left"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[t.priority]}`} />
          <span className="flex-1 truncate text-sm font-medium">{t.title}</span>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
            {STATUS_LABELS[t.status]}
          </span>
          {t.due_date === today && <span className="shrink-0 text-xs text-orange-500">Due today</span>}
        </button>
      ))}
    </div>
  );
}
