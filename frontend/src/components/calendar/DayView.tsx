import { useEffect, useState } from "react";
import { timeApi, type TimeLog } from "../../api/time";
import { tasksApi } from "../../api/tasks";
import type { Task } from "../../api/types";
import { PRIORITY_DOT } from "../../api/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DayView({ date, onOpenTask }: { date: Date; onOpenTask: (id: number) => void }) {
  const [sessions, setSessions] = useState<TimeLog[]>([]);
  const [dueTasks, setDueTasks] = useState<Task[]>([]);
  const dateStr = toDateStr(date);

  useEffect(() => {
    timeApi.list({ log_type: "punch_in" }).then((logs) =>
      setSessions(logs.filter((l) => l.start_time.slice(0, 10) === dateStr && l.end_time)),
    );
    tasksApi.list().then((tasks) => setDueTasks(tasks.filter((t) => t.due_date === dateStr)));
  }, [dateStr]);

  function blockStyle(log: TimeLog) {
    const start = new Date(log.start_time);
    const end = new Date(log.end_time!);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = Math.max(8, (end.getTime() - start.getTime()) / 60000);
    return { top: `${(startMinutes / 60) * 40}px`, height: `${(durationMinutes / 60) * 40}px` };
  }

  return (
    <div className="flex gap-6 p-6">
      <div className="relative flex-1">
        <div className="relative border-l border-gray-200 dark:border-gray-800" style={{ height: 24 * 40 }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute left-0 flex w-full items-start border-t border-gray-100 text-xs text-gray-400 dark:border-gray-800/60" style={{ top: h * 40, height: 40 }}>
              <span className="-mt-2 ml-1 w-10 shrink-0">{h.toString().padStart(2, "0")}:00</span>
            </div>
          ))}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="absolute left-14 right-2 rounded-md bg-green-200/70 px-2 py-0.5 text-[11px] text-green-800 dark:bg-green-900/40 dark:text-green-300"
              style={blockStyle(s)}
              title={s.notes ?? "Punched in"}
            >
              Punched in {s.duration_hours ? `(${s.duration_hours.toFixed(1)}h)` : ""}
            </div>
          ))}
        </div>
      </div>

      <div className="w-64 shrink-0">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Due today</h3>
        <div className="space-y-2">
          {dueTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => onOpenTask(t.id)}
              className="flex w-full items-center gap-2 rounded-lg glass-card p-2 text-left text-sm"
            >
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[t.priority]}`} />
              <span className="truncate">{t.title}</span>
            </button>
          ))}
          {dueTasks.length === 0 && <p className="text-sm text-gray-400">Nothing due today.</p>}
        </div>
      </div>
    </div>
  );
}
