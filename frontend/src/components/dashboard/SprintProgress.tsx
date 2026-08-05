import { Link } from "react-router-dom";
import type { SprintWithStats } from "../../api/types";

export function SprintProgress({ sprint }: { sprint: SprintWithStats | null }) {
  if (!sprint) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-400 dark:border-gray-700">
        No active sprint.{" "}
        <Link to="/sprints" className="text-blue-600 underline">
          Create or activate one
        </Link>
        .
      </div>
    );
  }

  const pct = sprint.task_count > 0 ? Math.round((sprint.done_count / sprint.task_count) * 100) : 0;
  const daysLeft = sprint.end_date
    ? Math.ceil((new Date(sprint.end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <Link to={`/sprints/${sprint.id}`} className="block rounded-lg glass-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{sprint.name}</span>
        <span className="text-xs text-gray-400">
          {daysLeft === null ? "no deadline" : daysLeft >= 0 ? `${daysLeft} days left` : "overdue"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="progress-track flex-1">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400">
          {sprint.done_count}/{sprint.task_count} ({pct}%)
        </span>
      </div>
    </Link>
  );
}
