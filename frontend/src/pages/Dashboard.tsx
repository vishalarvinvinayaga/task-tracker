import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { TodayView } from "../components/dashboard/TodayView";
import { FocusMode } from "../components/dashboard/FocusMode";
import { ActivityFeed } from "../components/shared/ActivityFeed";
import { TrendChart } from "../components/dashboard/TrendChart";
import { TaskDetail } from "../components/task/TaskDetail";
import { HudPanel } from "../components/hud/HudPanel";
import { ArcRing } from "../components/hud/ArcRing";
import { CountUp } from "../components/hud/CountUp";
import { sprintsApi } from "../api/sprints";
import { tasksApi } from "../api/tasks";
import { tagsApi } from "../api/tags";
import { timeApi, type TimeStatus } from "../api/time";
import { useProfile } from "../hooks/useProfile";
import { timeOfDayGreeting } from "../lib/greeting";
import type { SprintWithStats, Tag, Task } from "../api/types";

function StatCell({ label, value, decimals = 0, suffix = "" }: { label: string; value: number; decimals?: number; suffix?: string }) {
  return (
    <div className="flex-1 px-4 py-3">
      <div className="hud-label mb-1">{label}</div>
      <CountUp value={value} decimals={decimals} suffix={suffix} className="text-2xl font-semibold" />
    </div>
  );
}

export function Dashboard() {
  const { profile } = useProfile();
  const [activeSprint, setActiveSprint] = useState<SprintWithStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function load() {
    sprintsApi.list().then((containers) => {
      // Prefer the running sprint; otherwise show the Backlog so the dashboard
      // is useful to people who don't work in cycles at all.
      const focus =
        containers.find((c) => c.container_type === "sprint" && c.status === "active") ??
        containers.find((c) => c.is_protected) ??
        null;
      setActiveSprint(focus);
      if (focus) tasksApi.list({ sprint_id: focus.id }).then(setTasks);
      else setTasks([]);
    });
    tagsApi.list().then(setAllTags);
    timeApi.status().then(setTimeStatus);
  }

  useEffect(load, [refreshKey]);

  function bump() {
    setRefreshKey((k) => k + 1);
  }

  const firstName = profile?.name.split(" ")[0] ?? "";
  const pct = activeSprint && activeSprint.task_count > 0
    ? Math.round((activeSprint.done_count / activeSprint.task_count) * 100)
    : 0;
  const daysLeft = activeSprint?.end_date
    ? Math.ceil((new Date(activeSprint.end_date).getTime() - Date.now()) / 86_400_000)
    : 0;
  const openCount = tasks.filter((t) => t.status !== "done").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <>
      <Header
        title={firstName ? `${timeOfDayGreeting(profile!.timezone)}, ${firstName}` : "Dashboard"}
        code="DSH"
      />

      <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* ---- primary readout: arc reactor + telemetry ---- */}
          <HudPanel
            label="Sprint Telemetry"
            meta={activeSprint ? `${activeSprint.start_date} → ${activeSprint.end_date}` : "NO ACTIVE CYCLE"}
            scan
            className="hud-boot"
          >
            {activeSprint ? (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <ArcRing value={pct} label="Complete" sublabel={`${activeSprint.done_count}/${activeSprint.task_count} tasks`} />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/sprints/${activeSprint.id}`}
                    className="block truncate text-lg font-semibold transition-colors hover:text-[var(--accent-via)]"
                  >
                    {activeSprint.name}
                  </Link>
                  {activeSprint.goals_summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--hud-text-dim)]">{activeSprint.goals_summary}</p>
                  )}
                  <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--hud-line)] border-y border-[var(--hud-line)] sm:grid-cols-4 sm:divide-y-0">
                    <StatCell label="Open" value={openCount} />
                    <StatCell label="Active" value={inProgressCount} />
                    <StatCell label="Days left" value={Math.max(daysLeft, 0)} />
                    <StatCell label="Logged" value={timeStatus?.today_total_hours ?? 0} decimals={1} suffix="h" />
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-[var(--hud-text-dim)]">
                No active sprint.{" "}
                <Link to="/sprints" className="underline transition-colors hover:text-[var(--accent-via)]">
                  Initialise one
                </Link>
                .
              </p>
            )}
          </HudPanel>

          <HudPanel label="Focus Lock" className="hud-boot" meta={inProgressCount > 0 ? "ENGAGED" : "IDLE"}>
            <FocusMode tasks={tasks} onOpenTask={setOpenTaskId} onLogged={bump} />
          </HudPanel>

          <HudPanel label="Today" className="hud-boot" meta={`${tasks.filter((t) => t.status !== "done").length} PENDING`}>
            <TodayView tasks={tasks} onOpenTask={setOpenTaskId} />
          </HudPanel>

          <HudPanel label="Trend Analysis" className="hud-boot" meta="14D">
            <TrendChart days={14} embedded />
          </HudPanel>
        </div>

        <div className="space-y-5">
          <HudPanel label="Activity Log" className="hud-boot" meta="LIVE">
            <ActivityFeed limit={14} />
          </HudPanel>
        </div>
      </div>

      {openTaskId && <TaskDetail taskId={openTaskId} allTags={allTags} onClose={() => setOpenTaskId(null)} onChanged={bump} />}
    </>
  );
}
