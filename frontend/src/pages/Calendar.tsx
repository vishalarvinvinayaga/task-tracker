import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { DayView } from "../components/calendar/DayView";
import { WeekView } from "../components/calendar/WeekView";
import { TaskDetail } from "../components/task/TaskDetail";
import { tagsApi } from "../api/tags";
import type { Tag } from "../api/types";

export function Calendar() {
  const [mode, setMode] = useState<"day" | "week">("day");
  const [date, setDate] = useState(new Date());
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    tagsApi.list().then(setAllTags);
  }, []);

  function shift(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days * (mode === "week" ? 7 : 1));
    setDate(d);
  }

  return (
    <>
      <Header title="Calendar" />
      <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <button onClick={() => shift(-1)} className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
          ←
        </button>
        <button onClick={() => setDate(new Date())} className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
          Today
        </button>
        <button onClick={() => shift(1)} className="rounded-lg px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
          →
        </button>
        <span className="ml-2 text-sm font-medium">
          {mode === "day" ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <div className="ml-auto flex gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {(["day", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 text-sm font-medium capitalize ${mode === m ? "bg-white shadow dark:bg-gray-700" : "text-gray-500"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === "day" ? (
        <DayView date={date} onOpenTask={setOpenTaskId} />
      ) : (
        <WeekView
          anchor={date}
          onSelectDay={(d) => {
            setDate(d);
            setMode("day");
          }}
        />
      )}

      {openTaskId && (
        <TaskDetail taskId={openTaskId} allTags={allTags} onClose={() => setOpenTaskId(null)} onChanged={() => {}} />
      )}
    </>
  );
}
