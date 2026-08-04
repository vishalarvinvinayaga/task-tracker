import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { sprintsApi } from "../api/sprints";
import type { SprintRetro as SprintRetroType, SprintWithStats } from "../api/types";

export function SprintRetro() {
  const { id } = useParams();
  const sprintId = Number(id);
  const navigate = useNavigate();

  const [sprint, setSprint] = useState<SprintWithStats | null>(null);
  const [retro, setRetro] = useState<Partial<SprintRetroType>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sprintsApi.get(sprintId).then(setSprint);
    sprintsApi.getRetro(sprintId).then((r) => r && setRetro(r));
  }, [sprintId]);

  async function save() {
    await sprintsApi.upsertRetro(sprintId, {
      went_well: retro.went_well ?? "",
      needs_improvement: retro.needs_improvement ?? "",
      action_items: retro.action_items ?? "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!sprint) return null;

  return (
    <>
      <Header title={`${sprint.name} — Retrospective`} />
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800">
          <div>
            Tasks completed: <strong>{sprint.done_count}</strong> / {sprint.task_count}
          </div>
          <div>
            Sprint dates: <strong>{sprint.start_date} → {sprint.end_date}</strong>
          </div>
        </div>

        {(
          [
            ["went_well", "What went well"],
            ["needs_improvement", "What needs improvement"],
            ["action_items", "Action items"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium uppercase text-gray-400">{label}</label>
            <textarea
              value={retro[key] ?? ""}
              onChange={(e) => setRetro((r) => ({ ...r, [key]: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        ))}

        <div className="flex items-center gap-3">
          <button onClick={save} className="rounded-lg btn-primary px-4 py-2 text-sm font-medium text-white">
            Save retro
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
          <button onClick={() => navigate(`/sprints/${sprintId}`)} className="ml-auto text-sm text-gray-500 hover:underline">
            Back to sprint
          </button>
        </div>
      </div>
    </>
  );
}
