import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { HudPanel } from "../components/hud/HudPanel";
import { SlipBadge } from "../components/plans/SlipBadge";
import { TaskDetail } from "../components/task/TaskDetail";
import { plansApi, REASON_LABEL, type DailyPlan, type PlanSuggestion } from "../api/plans";
import { tagsApi } from "../api/tags";
import { useToast } from "../hooks/useToast";
import type { Tag } from "../api/types";
import { PRIORITY_DOT } from "../api/types";

const OUTCOME_STYLE: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "var(--hud-text-dim)" },
  done: { label: "Done", color: "#34d399" },
  slipped: { label: "Slipped", color: "#fb7185" },
  dropped: { label: "Dropped", color: "var(--hud-text-dim)" },
};

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function Plans() {
  const toast = useToast();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [suggestions, setSuggestions] = useState<PlanSuggestion[]>([]);
  const [history, setHistory] = useState<DailyPlan[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [focusDraft, setFocusDraft] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    plansApi.today().then((r) => {
      setPlan(r.plan);
      setSuggestions(r.suggestions);
      setFocusDraft(r.plan?.focus ?? "");
      // Pre-select every suggestion — you remove what you won't do, which is
      // a faster and more honest decision than adding from nothing.
      if (!r.plan) setPicked(new Set(r.suggestions.map((s) => s.task.id)));
    });
    plansApi.history(14).then((h) => setHistory(h.filter((p) => p.closed_at)));
  }

  useEffect(() => {
    load();
    tagsApi.list().then(setAllTags);
  }, []);

  async function commit() {
    setBusy(true);
    try {
      await plansApi.commitToday(Array.from(picked), focusDraft || null);
      toast.show("Today's plan committed");
      load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't commit the plan", "error");
    } finally {
      setBusy(false);
    }
  }

  const doneCount = plan?.items.filter((i) => i.task.status === "done").length ?? 0;

  return (
    <>
      <Header title="Daily Plan" code="PLN" />

      <div className="mx-auto max-w-3xl space-y-5 p-5">
        {plan ? (
          <HudPanel
            label={formatDay(plan.plan_date)}
            meta={`${doneCount}/${plan.items.length} DONE`}
            className="hud-boot"
            scan
          >
            <input
              value={focusDraft}
              onChange={(e) => setFocusDraft(e.target.value)}
              onBlur={() => focusDraft !== (plan.focus ?? "") && plansApi.updateFocus(plan.id, focusDraft || null).then(load)}
              placeholder="Today's focus — one line on what matters"
              className="mb-4 w-full border-b border-[var(--hud-line)] bg-transparent pb-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
            />

            <div className="space-y-2">
              {plan.items.map((item) => (
                <div key={item.id} className="glass-card flex items-center gap-3 p-3">
                  <span className={`h-2 w-2 shrink-0 rotate-45 ${PRIORITY_DOT[item.task.priority]}`} />
                  <button
                    onClick={() => setOpenTaskId(item.task_id)}
                    className={`min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-[var(--accent-via)] ${
                      item.task.status === "done" ? "line-through opacity-55" : ""
                    }`}
                  >
                    {item.task.title}
                  </button>
                  <SlipBadge count={item.slip_count} />
                  {item.pinned && (
                    <span className="hud-mono text-[9px] uppercase tracking-wider text-[var(--accent-via)]" title="Pinned — re-planning won't remove this">
                      Pinned
                    </span>
                  )}
                  <span className="hud-mono shrink-0 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)]">
                    {item.container_name}
                  </span>
                  <button
                    onClick={() => plansApi.setPinned(plan.id, item.id, !item.pinned).then(load)}
                    className="hud-mono shrink-0 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)] transition-colors hover:text-[var(--accent-via)]"
                  >
                    {item.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    onClick={() => plansApi.removeItem(plan.id, item.id).then(load)}
                    className="hud-mono shrink-0 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)] transition-colors hover:text-rose-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {plan.items.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--hud-text-dim)]">
                  Nothing committed for today.
                </p>
              )}
            </div>

            {suggestions.length > 0 && (
              <div className="mt-5 border-t border-[var(--hud-line)] pt-4">
                <p className="hud-label mb-2">Not planned yet</p>
                <div className="space-y-1.5">
                  {suggestions.map((s) => (
                    <div key={s.task.id} className="flex items-center gap-2 text-sm">
                      <span className="hud-mono w-20 shrink-0 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)]">
                        {REASON_LABEL[s.reason]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[var(--hud-text-dim)]">{s.task.title}</span>
                      <SlipBadge count={s.slip_count} />
                      <button
                        onClick={() => plansApi.addItem(plan.id, s.task.id).then(load)}
                        className="hud-mono shrink-0 text-[9px] uppercase tracking-wider transition-colors hover:text-[var(--accent-via)]"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </HudPanel>
        ) : (
          <HudPanel label="Plan today" meta={`${suggestions.length} CANDIDATES`} className="hud-boot" scan>
            <input
              value={focusDraft}
              onChange={(e) => setFocusDraft(e.target.value)}
              placeholder="Today's focus — one line on what matters"
              className="mb-4 w-full border-b border-[var(--hud-line)] bg-transparent pb-2 text-sm outline-none focus:border-[var(--hud-line-strong)]"
            />

            {suggestions.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--hud-text-dim)]">
                Nothing due or in progress. Add tasks in the Tracker, then plan your day here.
              </p>
            ) : (
              <div className="space-y-1.5">
                {suggestions.map((s) => {
                  const on = picked.has(s.task.id);
                  return (
                    <label
                      key={s.task.id}
                      className="flex cursor-pointer items-center gap-3 border p-2.5 transition-colors"
                      style={{ borderColor: on ? "var(--hud-line-strong)" : "var(--hud-line)" }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            next.has(s.task.id) ? next.delete(s.task.id) : next.add(s.task.id);
                            return next;
                          })
                        }
                      />
                      <span className={`h-2 w-2 shrink-0 rotate-45 ${PRIORITY_DOT[s.task.priority]}`} />
                      <span className="min-w-0 flex-1 truncate text-sm">{s.task.title}</span>
                      <SlipBadge count={s.slip_count} />
                      <span className="hud-mono shrink-0 text-[9px] uppercase tracking-wider text-[var(--hud-text-dim)]">
                        {REASON_LABEL[s.reason]}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <button
              onClick={commit}
              disabled={busy || picked.size === 0}
              className="btn-primary mt-4 w-full px-4 py-2.5 text-sm font-semibold uppercase tracking-wider"
            >
              {busy ? "Committing…" : `Commit ${picked.size} task${picked.size === 1 ? "" : "s"} for today`}
            </button>
          </HudPanel>
        )}

        {/* ---- closed days: read-only record of intent vs reality ---- */}
        {history.length > 0 && (
          <HudPanel label="Previous days" meta={`${history.length} CLOSED`}>
            <div className="space-y-4">
              {history.map((past) => {
                const done = past.items.filter((i) => i.outcome === "done").length;
                const slipped = past.items.filter((i) => i.outcome === "slipped").length;
                return (
                  <div key={past.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{formatDay(past.plan_date)}</span>
                      <span className="hud-readout text-[10px] text-[var(--hud-text-dim)]">
                        {done}/{past.items.length} done
                        {slipped > 0 && <span className="ml-2 text-rose-400">{slipped} slipped</span>}
                      </span>
                    </div>
                    {past.focus && <p className="mb-1.5 text-xs italic text-[var(--hud-text-dim)]">{past.focus}</p>}
                    <div className="space-y-1">
                      {past.items.map((i) => (
                        <div key={i.id} className="flex items-center gap-2 text-xs">
                          <span
                            className="hud-mono w-14 shrink-0 uppercase tracking-wider"
                            style={{ color: OUTCOME_STYLE[i.outcome].color }}
                          >
                            {OUTCOME_STYLE[i.outcome].label}
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate ${i.outcome === "done" ? "opacity-55 line-through" : ""}`}
                          >
                            {i.task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </HudPanel>
        )}
      </div>

      {openTaskId && (
        <TaskDetail taskId={openTaskId} allTags={allTags} onClose={() => setOpenTaskId(null)} onChanged={load} />
      )}
    </>
  );
}
