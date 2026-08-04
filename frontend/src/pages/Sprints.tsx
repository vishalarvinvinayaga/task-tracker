import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { CreateSprintModal } from "../components/sprint/CreateSprintModal";
import { VelocityChart } from "../components/sprint/VelocityChart";
import { sprintsApi } from "../api/sprints";
import { useToast } from "../hooks/useToast";
import type { SprintWithStats } from "../api/types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  closed: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function Sprints() {
  const [sprints, setSprints] = useState<SprintWithStats[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  function load() {
    sprintsApi.list().then(setSprints);
  }

  useEffect(load, []);

  return (
    <>
      <Header title="Sprints" />
      <div className="p-6">
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg btn-primary px-4 py-2 text-sm font-medium text-white"
          >
            Create Sprint
          </button>
        </div>

        {sprints.length === 0 && (
          <p className="text-sm text-gray-400">No sprints yet. Create one to get started.</p>
        )}

        <VelocityChart sprints={sprints} />

        <div className="space-y-2">
          {sprints.map((s) => {
            const pct = s.task_count > 0 ? Math.round((s.done_count / s.task_count) * 100) : 0;
            return (
              <Link
                key={s.id}
                to={`/sprints/${s.id}`}
                className="block rounded-lg glass-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {s.start_date} → {s.end_date}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="progress-track h-1.5">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">
                    {s.done_count}/{s.task_count}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {showCreate && (
        <CreateSprintModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            try {
              await sprintsApi.create(data);
              setShowCreate(false);
              load();
              toast.show("Sprint created");
            } catch (err) {
              toast.show(err instanceof Error ? err.message : "Failed to create sprint", "error");
            }
          }}
        />
      )}
    </>
  );
}
