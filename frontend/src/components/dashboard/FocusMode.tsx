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
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-400 dark:border-gray-700">
        No task in progress. Pick one up from your sprint board.
      </div>
    );
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="flex items-center justify-between">
        <button onClick={() => onOpenTask(focusTask.id)} className="flex items-center gap-2 text-left font-medium hover:underline">
          <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[focusTask.priority]}`} />
          {focusTask.title}
        </button>
        <span className="font-mono text-sm text-gray-500">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        {!running ? (
          <button onClick={start} className="rounded-lg btn-primary px-3 py-1.5 text-sm font-medium text-white">
            Start timer
          </button>
        ) : (
          <button onClick={stop} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
            Stop &amp; log time
          </button>
        )}
      </div>
    </div>
  );
}
