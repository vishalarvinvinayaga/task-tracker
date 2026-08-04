import { useState } from "react";
import type { RecurringTaskInput } from "../../api/recurring";
import { Modal } from "../shared/Modal";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RecurringTaskForm({ onSubmit, onCancel }: { onSubmit: (data: RecurringTaskInput) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [tagNames, setTagNames] = useState("");

  return (
    <Modal title="New recurring task" onClose={onCancel}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Frequency</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as typeof frequency)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        {frequency === "weekly" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Day of week</label>
            <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {DOW_LABELS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
        {frequency === "monthly" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Day of month</label>
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tags (comma-separated)</label>
          <input
            value={tagNames}
            onChange={(e) => setTagNames(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="Aimee, Research"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              onSubmit({
                title,
                frequency,
                day_of_week: frequency === "weekly" ? dayOfWeek : undefined,
                day_of_month: frequency === "monthly" ? dayOfMonth : undefined,
                tag_names: tagNames || undefined,
              });
            }}
            className="rounded-lg btn-primary px-3 py-2 text-sm font-medium text-white"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
