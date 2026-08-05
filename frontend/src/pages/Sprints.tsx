import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { CreateSprintModal } from "../components/sprint/CreateSprintModal";
import { VelocityChart } from "../components/sprint/VelocityChart";
import { sprintsApi } from "../api/sprints";
import { useToast } from "../hooks/useToast";
import type { SprintWithStats } from "../api/types";

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-400 border-emerald-400/40",
  planned: "text-sky-400 border-sky-400/40",
  closed: "text-slate-400 border-slate-400/30",
};

function ContainerCard({ container }: { container: SprintWithStats }) {
  const pct = container.task_count > 0 ? Math.round((container.done_count / container.task_count) * 100) : 0;
  const isSprint = container.container_type === "sprint";

  return (
    <Link to={`/sprints/${container.id}`} className="glass-card block p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{container.name}</span>
          {isSprint ? (
            <span
              className={`hud-mono shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${STATUS_STYLE[container.status]}`}
            >
              {container.status}
            </span>
          ) : (
            <span className="hud-mono shrink-0 border border-[var(--hud-line)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)]">
              {container.is_protected ? "backlog" : "list"}
            </span>
          )}
        </div>
        {isSprint && container.start_date && (
          <span className="hud-readout shrink-0 text-[11px] text-[var(--hud-text-dim)]">
            {container.start_date} → {container.end_date}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div className="progress-track h-1.5">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="hud-readout shrink-0 text-[11px] text-[var(--hud-text-dim)]">
          {container.done_count}/{container.task_count}
        </span>
      </div>
    </Link>
  );
}

export function Sprints() {
  const [containers, setContainers] = useState<SprintWithStats[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const toast = useToast();

  function load() {
    sprintsApi.list().then(setContainers);
  }

  useEffect(load, []);

  const sprints = containers.filter((c) => c.container_type === "sprint");
  const lists = containers.filter((c) => c.container_type === "list");

  return (
    <>
      <Header title="Boards" code="SPR" />
      <div className="space-y-6 p-5">
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider"
          >
            New container
          </button>
        </div>

        {containers.length === 0 && (
          <p className="text-sm text-[var(--hud-text-dim)]">
            Nothing here yet. Create a sprint if you work in cycles, or a list if you just want somewhere to
            put tasks.
          </p>
        )}

        {sprints.length > 0 && (
          <section>
            <h2 className="hud-label mb-2.5">Sprints</h2>
            <VelocityChart sprints={sprints} />
            <div className="space-y-2">
              {sprints.map((s) => (
                <ContainerCard key={s.id} container={s} />
              ))}
            </div>
          </section>
        )}

        {lists.length > 0 && (
          <section>
            <h2 className="hud-label mb-2.5">Lists</h2>
            <div className="space-y-2">
              {lists.map((l) => (
                <ContainerCard key={l.id} container={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showCreate && (
        <CreateSprintModal
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            try {
              await sprintsApi.create(data);
              setShowCreate(false);
              load();
              toast.show(`${data.container_type === "list" ? "List" : "Sprint"} created`);
            } catch (err) {
              toast.show(err instanceof Error ? err.message : "Failed to create", "error");
            }
          }}
        />
      )}
    </>
  );
}
