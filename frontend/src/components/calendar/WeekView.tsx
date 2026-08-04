import { useEffect, useState } from "react";
import { tasksApi } from "../../api/tasks";
import type { Task } from "../../api/types";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function WeekView({ anchor, onSelectDay }: { anchor: Date; onSelectDay: (d: Date) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    tasksApi.list().then(setTasks);
  }, []);

  const todayStr = toDateStr(new Date());

  return (
    <div className="grid grid-cols-7 gap-3 p-6">
      {days.map((d) => {
        const dateStr = toDateStr(d);
        const dayTasks = tasks.filter((t) => t.due_date === dateStr);
        const isToday = dateStr === todayStr;
        return (
          <button
            key={dateStr}
            onClick={() => onSelectDay(d)}
            className={`flex min-h-40 flex-col rounded-lg p-2 text-left ${
              isToday ? "border border-indigo-400/70 bg-indigo-50 dark:border-indigo-400/50 dark:bg-indigo-500/10" : "glass-card"
            }`}
          >
            <span className="text-xs font-medium text-gray-500">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
            <span className="text-sm font-semibold">{d.getDate()}</span>
            <div className="mt-2 space-y-1">
              {dayTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center gap-1 truncate text-[11px]">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.tags[0]?.color ?? "#9CA3AF" }}
                  />
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
              {dayTasks.length > 4 && <span className="text-[11px] text-gray-400">+{dayTasks.length - 4} more</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
