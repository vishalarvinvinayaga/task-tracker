import { useEffect, useState } from "react";
import { timeApi, type TimeStatus } from "../../api/time";

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function PunchClock({ collapsed }: { collapsed: boolean }) {
  const [status, setStatus] = useState<TimeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveElapsed, setLiveElapsed] = useState(0);

  function load() {
    timeApi.status().then(setStatus);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!status?.punched_in || !status.session_start) return;
    const start = new Date(status.session_start).getTime();
    const tick = () => setLiveElapsed((Date.now() - start) / 3_600_000);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status?.punched_in, status?.session_start]);

  async function toggle() {
    setBusy(true);
    try {
      if (status?.punched_in) {
        await timeApi.punchOut();
      } else {
        await timeApi.punchIn();
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const todayTotal = status.punched_in ? status.today_total_hours - (status.session_duration_hours ?? 0) + liveElapsed : status.today_total_hours;

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        title={status.punched_in ? "Punch out" : "Punch in"}
        className="btn-ghost w-full px-2 py-2 text-xs"
        style={status.punched_in ? { borderColor: "var(--hud-line-strong)", color: "var(--accent-via)" } : undefined}
      >
        {status.punched_in ? "◉" : "◎"}
      </button>
    );
  }

  return (
    <div className="hud-frame p-2" style={{ "--hud-notch": "6px" } as React.CSSProperties}>
      <div className="mb-2 flex items-center justify-between">
        <span className="hud-label flex items-center gap-1.5">
          {status.punched_in && (
            <span
              className="hud-live-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ color: "var(--accent-via)", background: "var(--accent-via)" }}
            />
          )}
          {status.punched_in ? formatHours(liveElapsed) : "Standby"}
        </span>
        <span className="hud-readout text-[10px] text-[var(--hud-text-dim)]">{formatHours(todayTotal)}</span>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
          status.punched_in ? "btn-ghost text-rose-400" : "btn-primary"
        }`}
        style={status.punched_in ? { borderColor: "rgba(244,63,94,0.5)" } : undefined}
      >
        {status.punched_in ? "Punch Out" : "Punch In"}
      </button>
    </div>
  );
}
