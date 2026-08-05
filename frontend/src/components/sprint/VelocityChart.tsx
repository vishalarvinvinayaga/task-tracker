import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SprintWithStats } from "../../api/types";

export function VelocityChart({ sprints }: { sprints: SprintWithStats[] }) {
  const data = [...sprints]
    // Only time-boxed sprints have velocity; lists carry no dates to order by.
    .filter((s) => s.container_type === "sprint" && s.start_date)
    .sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? ""))
    .slice(-8)
    .map((s) => ({
      name: s.name.length > 14 ? `${s.name.slice(0, 14)}…` : s.name,
      done: s.done_count,
      remaining: Math.max(s.task_count - s.done_count, 0),
    }));

  if (data.length === 0) return null;

  return (
    <div className="glass-card mb-4 rounded-xl p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Sprint velocity</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-white/10" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-gray-400" axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: "rgba(17,17,27,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="done" name="Done" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#e2e8f0" className="dark:fill-white/10" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
