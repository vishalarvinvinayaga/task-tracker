import { useState } from "react";
import { Modal } from "../shared/Modal";
import type { ContainerType } from "../../api/types";
import type { SprintCreateInput } from "../../api/sprints";

const TYPE_COPY: Record<ContainerType, { label: string; blurb: string }> = {
  sprint: {
    label: "Sprint",
    blurb: "Time-boxed. Closes with carry-over and a retro, and feeds velocity. One runs at a time.",
  },
  list: {
    label: "List",
    blurb: "A plain bucket — no dates, never closes. Run as many as you like, side by side.",
  },
};

export function CreateSprintModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: SprintCreateInput) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const [containerType, setContainerType] = useState<ContainerType>("sprint");
  const [name, setName] = useState("");
  const [goalsSummary, setGoalsSummary] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(twoWeeks);
  const [makeActive, setMakeActive] = useState(true);
  const [defaultView, setDefaultView] = useState<"board" | "list">("board");

  const isSprint = containerType === "sprint";

  return (
    <Modal title="New container" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onCreate(
            isSprint
              ? {
                  name,
                  container_type: "sprint",
                  goals_summary: goalsSummary || null,
                  start_date: startDate,
                  end_date: endDate,
                  status: makeActive ? "active" : "planned",
                  default_view: defaultView,
                }
              : { name, container_type: "list", default_view: defaultView },
          );
        }}
      >
        <div>
          <label className="hud-label mb-2 block">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_COPY) as ContainerType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setContainerType(t);
                  setDefaultView(t === "list" ? "list" : "board");
                }}
                className="border p-3 text-left transition-all"
                style={{
                  borderColor: containerType === t ? "var(--accent-via)" : "var(--hud-line)",
                  boxShadow: containerType === t ? "0 0 18px -6px var(--accent-via)" : undefined,
                }}
              >
                <span className="block text-sm font-semibold">{TYPE_COPY[t].label}</span>
                <span className="mt-1 block text-[11px] leading-snug text-[var(--hud-text-dim)]">
                  {TYPE_COPY[t].blurb}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="hud-label mb-1.5 block">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
            placeholder={isSprint ? "Sprint 12 — Checkout rewrite" : "Someday / Reading / Errands"}
          />
        </div>

        {isSprint && (
          <>
            <div>
              <label className="hud-label mb-1.5 block">Goals summary</label>
              <textarea
                value={goalsSummary}
                onChange={(e) => setGoalsSummary(e.target.value)}
                rows={2}
                className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="hud-label mb-1.5 block">Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
                />
              </div>
              <div>
                <label className="hud-label mb-1.5 block">End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--hud-text-dim)]">
              <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />
              Make this the active sprint
            </label>
          </>
        )}

        <div>
          <label className="hud-label mb-1.5 block">Opens as</label>
          <div className="flex gap-2">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setDefaultView(v)}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={{
                  border: `1px solid ${defaultView === v ? "var(--accent-via)" : "var(--hud-line)"}`,
                  color: defaultView === v ? "var(--accent-via)" : undefined,
                }}
              >
                {v === "board" ? "Kanban board" : "Checklist"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost px-3 py-2 text-sm">
            Cancel
          </button>
          <button type="submit" className="btn-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider">
            Create {isSprint ? "sprint" : "list"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
