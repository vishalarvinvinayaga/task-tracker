import type { SprintWithStats } from "../../api/types";

export function SprintHeader({ sprint, onCloseSprint }: { sprint: SprintWithStats; onCloseSprint: () => void }) {
  const pct = sprint.task_count > 0 ? Math.round((sprint.done_count / sprint.task_count) * 100) : 0;
  const daysLeft = Math.ceil((new Date(sprint.end_date).getTime() - Date.now()) / 86_400_000);

  return (
    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{sprint.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                sprint.status === "active"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  : sprint.status === "closed"
                    ? "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              }`}
            >
              {sprint.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {sprint.start_date} → {sprint.end_date}
            {sprint.status !== "closed" && ` · ${daysLeft >= 0 ? `${daysLeft} days left` : "overdue"}`}
          </p>
          {sprint.goals_summary && <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-300">{sprint.goals_summary}</p>}
        </div>
        {sprint.status !== "closed" && (
          <button
            onClick={onCloseSprint}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close sprint
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>
            {sprint.done_count} / {sprint.task_count} tasks done
          </span>
          <span>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
