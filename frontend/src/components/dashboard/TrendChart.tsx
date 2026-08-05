import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statsApi, type TrendPoint } from "../../api/stats";

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Reads the live accent tokens so charts track the user's theme preset. */
function useAccent() {
  const [accent, setAccent] = useState({ from: "#22d3ee", via: "#38bdf8", to: "#0ea5e9" });
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setAccent({
      from: style.getPropertyValue("--accent-from").trim() || "#22d3ee",
      via: style.getPropertyValue("--accent-via").trim() || "#38bdf8",
      to: style.getPropertyValue("--accent-to").trim() || "#0ea5e9",
    });
  }, []);
  return accent;
}

export function TrendChart({ days = 14, embedded = false }: { days?: number; embedded?: boolean }) {
  const [data, setData] = useState<TrendPoint[]>([]);
  const accent = useAccent();

  useEffect(() => {
    statsApi.trends(days).then(setData);
  }, [days]);

  const totalCompleted = data.reduce((s, d) => s + d.tasks_completed, 0);
  const totalHours = data.reduce((s, d) => s + d.hours_logged, 0);

  const chart = (
    <>
      {!embedded && (
        <h3 className="hud-label mb-3">
          Last {days} days — {totalCompleted} tasks completed, {totalHours.toFixed(1)}h logged
        </h3>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tasksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent.via} stopOpacity={0.55} />
              <stop offset="100%" stopColor={accent.via} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent.to} stopOpacity={0.4} />
              <stop offset="100%" stopColor={accent.to} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" stroke="var(--hud-line)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: "currentColor", fontFamily: "ui-monospace, monospace" }}
            className="text-[var(--hud-text-dim)]"
            axisLine={{ stroke: "var(--hud-line)" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "currentColor", fontFamily: "ui-monospace, monospace" }}
            className="text-[var(--hud-text-dim)]"
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            labelFormatter={(v) => formatDay(String(v))}
            contentStyle={{
              background: "rgba(3,7,17,0.94)",
              border: "1px solid var(--hud-line-strong)",
              borderRadius: 0,
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
            }}
          />
          <Area
            type="monotone"
            dataKey="tasks_completed"
            name="Tasks completed"
            stroke={accent.via}
            strokeWidth={1.8}
            fill="url(#tasksGradient)"
          />
          <Area
            type="monotone"
            dataKey="hours_logged"
            name="Hours logged"
            stroke={accent.to}
            strokeWidth={1.8}
            fill="url(#hoursGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4">
        <span className="hud-label flex items-center gap-1.5">
          <span className="h-1.5 w-1.5" style={{ background: accent.via, boxShadow: `0 0 6px 1px ${accent.via}` }} />
          Tasks completed · {totalCompleted}
        </span>
        <span className="hud-label flex items-center gap-1.5">
          <span className="h-1.5 w-1.5" style={{ background: accent.to, boxShadow: `0 0 6px 1px ${accent.to}` }} />
          Hours logged · {totalHours.toFixed(1)}
        </span>
      </div>
    </>
  );

  if (embedded) return chart;
  return <div className="glass-card p-4">{chart}</div>;
}
