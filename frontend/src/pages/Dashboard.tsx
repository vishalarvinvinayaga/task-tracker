import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { TodayView } from "../components/dashboard/TodayView";
import { FocusMode } from "../components/dashboard/FocusMode";
import { SprintProgress } from "../components/dashboard/SprintProgress";
import { ActivityFeed } from "../components/shared/ActivityFeed";
import { TrendChart } from "../components/dashboard/TrendChart";
import { TaskDetail } from "../components/task/TaskDetail";
import { sprintsApi } from "../api/sprints";
import { tasksApi } from "../api/tasks";
import { tagsApi } from "../api/tags";
import { useProfile } from "../hooks/useProfile";
import { timeOfDayGreeting } from "../lib/greeting";
import type { SprintWithStats, Tag, Task } from "../api/types";

export function Dashboard() {
  const { profile } = useProfile();
  const [activeSprint, setActiveSprint] = useState<SprintWithStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function load() {
    sprintsApi.list().then((sprints) => {
      const active = sprints.find((s) => s.status === "active") ?? null;
      setActiveSprint(active);
      if (active) tasksApi.list({ sprint_id: active.id }).then(setTasks);
      else setTasks([]);
    });
    tagsApi.list().then(setAllTags);
  }

  useEffect(load, [refreshKey]);

  function bump() {
    setRefreshKey((k) => k + 1);
  }

  const firstName = profile?.name.split(" ")[0] ?? "";

  return (
    <>
      <Header title={firstName ? `${timeOfDayGreeting(profile!.timezone)}, ${firstName}` : "Dashboard"} />
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Focus</h2>
            <FocusMode tasks={tasks} onOpenTask={setOpenTaskId} onLogged={bump} />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Current sprint</h2>
            <SprintProgress sprint={activeSprint} />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Today</h2>
            <TodayView tasks={tasks} onOpenTask={setOpenTaskId} />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Trends</h2>
            <TrendChart days={14} />
          </section>
        </div>

        <div>
          <section className="glass-card rounded-xl p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Recent activity</h2>
            <ActivityFeed limit={12} />
          </section>
        </div>
      </div>

      {openTaskId && <TaskDetail taskId={openTaskId} allTags={allTags} onClose={() => setOpenTaskId(null)} onChanged={bump} />}
    </>
  );
}
