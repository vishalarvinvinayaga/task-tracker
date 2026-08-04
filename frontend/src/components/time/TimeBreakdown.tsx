import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { timeApi, type TimeBreakdownEntry, type TimeLog } from "../../api/time";
import { tasksApi } from "../../api/tasks";
import type { Task } from "../../api/types";

export function TimeBreakdown() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [entries, setEntries] = useState<TimeBreakdownEntry[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [tasks, setTasks] = useState<Record<number, Task>>({});

  useEffect(() => {
    timeApi.breakdown(period).then(setEntries);
  }, [period]);

  useEffect(() => {
    timeApi.list({ log_type: "task_time" }).then((rows) => {
      setLogs(rows);
      Promise.all(Array.from(new Set(rows.map((r) => r.task_id).filter((id): id is number => id != null))).map((id) => tasksApi.get(id))).then(
        (fetched) => setTasks(Object.fromEntries(fetched.map((t) => [t.id, t]))),
      );
    });
  }, []);

  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              period === p ? "btn-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-gray-300"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Hours by workstream ({totalHours.toFixed(1)}h total)
          </h3>
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400">No task time logged in this period.</p>
          ) : entries.length === 1 ? (
            // Recharts' arc generator produces an empty path for a single 100% slice — draw it directly instead.
            <div className="flex h-60 flex-col items-center justify-center gap-2">
              <svg viewBox="0 0 100 100" width={160} height={160}>
                <circle cx={50} cy={50} r={40} fill={entries[0].color} />
              </svg>
              <span className="text-sm font-medium" style={{ color: entries[0].color }}>
                {entries[0].tag_name} — {entries[0].hours.toFixed(1)}h (100%)
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={entries} dataKey="hours" nameKey="tag_name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.tag_name}`}>
                  {entries.map((e) => (
                    <Cell key={e.tag_name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}h`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Time log entries</h3>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {logs.map((l) => {
              const task = l.task_id ? tasks[l.task_id] : undefined;
              return (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p>{task?.title ?? "—"}</p>
                    {task?.estimated_hours != null && (
                      <p className="text-xs text-gray-400">
                        Est. {task.estimated_hours}h · Actual {task.actual_hours ?? 0}h
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400">{l.duration_hours?.toFixed(2)}h</span>
                </div>
              );
            })}
            {logs.length === 0 && <p className="text-sm text-gray-400">No entries yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
