import { useState } from "react";
import { Modal } from "../shared/Modal";

export function CreateSprintModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; goals_summary: string; start_date: string; end_date: string; status: string }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeks = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const [name, setName] = useState("");
  const [goalsSummary, setGoalsSummary] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(twoWeeks);
  const [makeActive, setMakeActive] = useState(true);

  return (
    <Modal title="Create sprint" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onCreate({
            name,
            goals_summary: goalsSummary,
            start_date: startDate,
            end_date: endDate,
            status: makeActive ? "active" : "planned",
          });
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="Sprint 12 — Aimee Webhook Overhaul"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Goals summary</label>
          <textarea
            value={goalsSummary}
            onChange={(e) => setGoalsSummary(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} />
          Make this the active sprint
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button type="submit" className="rounded-lg btn-primary px-3 py-2 text-sm font-medium text-white">
            Create sprint
          </button>
        </div>
      </form>
    </Modal>
  );
}
