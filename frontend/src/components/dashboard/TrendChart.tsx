import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statsApi, type TrendPoint } from "../../api/stats";

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TrendChart({ days = 14 }: { days?: number }) {
  const [data, setData] = useState<TrendPoint[]>([]);

  useEffect(() => {
    statsApi.trends(days).then(setData);
  }, [days]);

  const totalCompleted = data.reduce((s, d) => s + d.tasks_completed, 0);
  const totalHours = data.reduce((s, d) => s + d.hours_logged, 0);

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Last {days} days — {totalCompleted} tasks completed, {totalHours.toFixed(1)}h logged
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-white/10" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400" axisLine={false} tickLine={false} width={28} />
          <Tooltip
            labelFormatter={(v) => formatDay(String(v))}
            contentStyle={{ background: "rgba(17,17,27,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          />
          <Area type="monotone" dataKey="tasks_completed" name="Tasks completed" stroke="#6366f1" strokeWidth={2} fill="url(#tasksGradient)" />
          <Area type="monotone" dataKey="hours_logged" name="Hours logged" stroke="#a855f7" strokeWidth={2} fill="url(#hoursGradient)" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#6366f1" }} /> Tasks completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#a855f7" }} /> Hours logged
        </span>
      </div>
    </div>
  );
}
