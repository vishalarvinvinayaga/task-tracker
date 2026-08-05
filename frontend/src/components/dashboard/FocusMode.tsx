import { useEffect, useRef, useState } from "react";
import type { Task } from "../../api/types";
import { PRIORITY_DOT } from "../../api/types";
import { timeApi } from "../../api/time";

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function FocusMode({ tasks, onOpenTask, onLogged }: { tasks: Task[]; onOpenTask: (id: number) => void; onLogged: () => void }) {
  const inProgress = tasks.filter((t) => t.status === "in_progress").sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const focusTask = inProgress[0];

  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function start() {
    setRunning(true);
    setStartedAt(Date.now());
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  async function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    if (focusTask && startedAt) {
      const hours = (Date.now() - startedAt) / 3_600_000;
      if (hours > 0.001) await timeApi.logTaskTime(focusTask.id, Math.round(hours * 100) / 100);
    }
    setElapsed(0);
    setStartedAt(null);
    onLogged();
  }

  if (!focusTask) {
    return (
      <div
        className="hud-frame flex items-center gap-3 px-4 py-5 text-sm text-[var(--hud-text-dim)]"
        style={{ borderStyle: "dashed" }}
      >
        <span className="hud-mono text-[10px] tracking-widest opacity-60">STANDBY</span>
        No task in progress. Pick one up from your sprint board.
      </div>
    );
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div
      className="hud-frame hud-bracket relative px-5 py-4"
      style={{
        borderColor: "var(--hud-line-strong)",
        boxShadow: "inset 0 0 60px -22px color-mix(in srgb, var(--accent-via) 85%, transparent)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => onOpenTask(focusTask.id)}
          className="flex min-w-0 items-center gap-2.5 text-left font-medium transition-colors hover:text-[var(--accent-via)]"
        >
          <span className={`h-2.5 w-2.5 shrink-0 rotate-45 ${PRIORITY_DOT[focusTask.priority]}`} />
          <span className="truncate">{focusTask.title}</span>
        </button>
        <span
          className={`hud-readout shrink-0 text-lg tabular-nums ${running ? "hud-live-dot" : ""}`}
          style={running ? { color: "var(--accent-via)" } : { color: "var(--hud-text-dim)" }}
        >
          {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="mt-3.5 flex gap-2">
        {!running ? (
          <button onClick={start} className="btn-primary px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider">
            Engage timer
          </button>
        ) : (
          <button
            onClick={stop}
            className="btn-ghost px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400"
            style={{ borderColor: "rgba(244,63,94,0.5)" }}
          >
            Disengage &amp; log
          </button>
        )}
      </div>
    </div>
  );
}
