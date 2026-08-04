import { useState } from "react";
import type { Template, TemplateType } from "../../api/types";
import { Modal } from "../shared/Modal";

const DEFAULT_JSON: Record<TemplateType, string> = {
  task: `{
  "title_prefix": "",
  "default_priority": "medium",
  "default_tags": [],
  "subtasks": []
}`,
  meeting_note: `{
  "sections": ["Updates", "Discussion Points", "Action Items"]
}`,
  sprint: `{
  "default_duration_days": 14,
  "default_tasks": []
}`,
};

export function TemplateForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Template;
  onSubmit: (data: { name: string; template_type: TemplateType; content_json: Record<string, unknown> }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<TemplateType>(initial?.template_type ?? "task");
  const [json, setJson] = useState(initial ? JSON.stringify(initial.content_json, null, 2) : DEFAULT_JSON.task);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal title={initial ? "Edit template" : "New template"} onClose={onCancel}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        {!initial && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
            <select
              value={type}
              onChange={(e) => {
                const t = e.target.value as TemplateType;
                setType(t);
                setJson(DEFAULT_JSON[t]);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="task">Task</option>
              <option value="meeting_note">Meeting note</option>
              <option value="sprint">Sprint</option>
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Content JSON</label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              try {
                const content_json = JSON.parse(json);
                setError(null);
                onSubmit({ name, template_type: type, content_json });
              } catch {
                setError("Invalid JSON");
              }
            }}
            className="rounded-lg btn-primary px-3 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
