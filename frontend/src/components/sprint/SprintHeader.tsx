import { useEffect, useState } from "react";
import type { ContainerView, SprintWithStats } from "../../api/types";
import { IconTrash } from "../hud/Icons";

const STATUS_STYLE: Record<string, string> = {
  active: "text-emerald-400 border-emerald-400/40",
  planned: "text-sky-400 border-sky-400/40",
  closed: "text-slate-400 border-slate-400/30",
};

export function SprintHeader({
  sprint,
  view,
  onViewChange,
  onCloseSprint,
  onRename,
  onDelete,
}: {
  sprint: SprintWithStats;
  view: ContainerView;
  onViewChange: (v: ContainerView) => void;
  onCloseSprint: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const pct = sprint.task_count > 0 ? Math.round((sprint.done_count / sprint.task_count) * 100) : 0;
  const isSprint = sprint.container_type === "sprint";
  const daysLeft = sprint.end_date
    ? Math.ceil((new Date(sprint.end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  const [nameDraft, setNameDraft] = useState(sprint.name);
  useEffect(() => setNameDraft(sprint.name), [sprint.name]);

  return (
    <div className="border-b border-[var(--hud-line)] px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Click-to-rename, saved on blur — same pattern as task titles. */}
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                const next = nameDraft.trim();
                if (next && next !== sprint.name) onRename(next);
                else setNameDraft(sprint.name);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setNameDraft(sprint.name);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-label="Rename container"
              className="min-w-0 flex-1 border-none bg-transparent text-lg font-semibold outline-none focus:underline"
            />
            {isSprint ? (
              <span
                className={`hud-mono shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${STATUS_STYLE[sprint.status]}`}
              >
                {sprint.status}
              </span>
            ) : (
              <span className="hud-mono shrink-0 border border-[var(--hud-line)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)]">
                {sprint.is_protected ? "backlog" : "list"}
              </span>
            )}
          </div>

          {isSprint && sprint.start_date && (
            <p className="hud-readout mt-1.5 text-xs text-[var(--hud-text-dim)]">
              {sprint.start_date} → {sprint.end_date}
              {sprint.status !== "closed" && daysLeft !== null &&
                ` · ${daysLeft >= 0 ? `${daysLeft} days left` : "overdue"}`}
            </p>
          )}
          {!isSprint && (
            <p className="mt-1.5 text-xs text-[var(--hud-text-dim)]">
              {sprint.is_protected
                ? "Anything captured without a home lands here."
                : "A standing list — no dates, no closing."}
            </p>
          )}

          {sprint.goals_summary && (
            <p className="mt-2 max-w-xl text-sm text-[var(--hud-text-dim)]">{sprint.goals_summary}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Board vs checklist — a view preference, independent of container type */}
          <div className="flex">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                title={v === "board" ? "Kanban board" : "Checklist"}
                className="hud-mono px-2.5 py-1.5 text-[10px] uppercase tracking-wider transition-all"
                style={{
                  border: `1px solid ${view === v ? "var(--accent-via)" : "var(--hud-line)"}`,
                  color: view === v ? "var(--accent-via)" : "var(--hud-text-dim)",
                }}
              >
                {v === "board" ? "Board" : "List"}
              </button>
            ))}
          </div>

          {isSprint && sprint.status !== "closed" && (
            <button onClick={onCloseSprint} className="btn-ghost px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
              Close sprint
            </button>
          )}

          {/* The Backlog is protected — deleting it would leave nowhere to
              capture a task, so the control isn't offered. */}
          {!sprint.is_protected && (
            <button
              onClick={onDelete}
              title={`Delete ${isSprint ? "sprint" : "list"}`}
              aria-label={`Delete ${sprint.name}`}
              className="btn-ghost px-2.5 py-1.5 text-[var(--hud-text-dim)] transition-colors hover:text-rose-400"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between">
          <span className="hud-label">
            {sprint.done_count} / {sprint.task_count} done
          </span>
          <span className="hud-readout text-[11px] text-[var(--hud-text-dim)]">{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
