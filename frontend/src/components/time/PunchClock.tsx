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
        className={`w-full rounded-lg px-2 py-2 text-xs font-medium ${
          status.punched_in ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"
        }`}
      >
        {status.punched_in ? "⏱" : "⏸"}
      </button>
    );
  }

  return (
    <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
      <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{status.punched_in ? `Session: ${formatHours(liveElapsed)}` : "Not punched in"}</span>
        <span>{formatHours(todayTotal)} today</span>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium ${
          status.punched_in
            ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {status.punched_in ? "Punch Out" : "Punch In"}
      </button>
    </div>
  );
}
