import { useEffect, useState } from "react";
import type { Tag, TaskPriority, TaskType } from "../../api/types";
import { TagPicker } from "../shared/TagPicker";

export type TaskFormValues = {
  title: string;
  description_md: string;
  priority: TaskPriority;
  task_type: TaskType;
  ticket_id: string;
  ticket_url: string;
  due_date: string;
  estimated_hours: string;
  tag_ids: number[];
};

const EMPTY: TaskFormValues = {
  title: "",
  description_md: "",
  priority: "medium",
  task_type: "general",
  ticket_id: "",
  ticket_url: "",
  due_date: "",
  estimated_hours: "",
  tag_ids: [],
};

export function TaskForm({
  allTags,
  initial,
  submitLabel = "Create task",
  onSubmit,
  onCancel,
}: {
  allTags: Tag[];
  initial?: Partial<TaskFormValues>;
  submitLabel?: string;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<TaskFormValues>({ ...EMPTY, ...initial });

  useEffect(() => {
    setValues({ ...EMPTY, ...initial });
  }, [initial]);

  function set<K extends keyof TaskFormValues>(key: K, val: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.title.trim()) return;
        onSubmit(values);
      }}
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
        <input
          autoFocus
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          placeholder="Task title"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Description (markdown)</label>
        <textarea
          value={values.description_md}
          onChange={(e) => set("description_md", e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
          <select
            value={values.priority}
            onChange={(e) => set("priority", e.target.value as TaskPriority)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
          <select
            value={values.task_type}
            onChange={(e) => set("task_type", e.target.value as TaskType)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="general">General</option>
            <option value="development">Development</option>
          </select>
        </div>
      </div>

      {values.task_type === "development" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Ticket ID</label>
            <input
              value={values.ticket_id}
              onChange={(e) => set("ticket_id", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              placeholder="PROJ-347"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Ticket URL</label>
            <input
              value={values.ticket_url}
              onChange={(e) => set("ticket_url", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              placeholder="https://…"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Due date</label>
          <input
            type="date"
            value={values.due_date}
            onChange={(e) => set("due_date", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Estimated hours</label>
          <input
            type="number"
            step="0.5"
            value={values.estimated_hours}
            onChange={(e) => set("estimated_hours", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Tags</label>
        <TagPicker allTags={allTags} selectedIds={values.tag_ids} onChange={(ids) => set("tag_ids", ids)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Cancel
        </button>
        <button type="submit" className="rounded-lg btn-primary px-3 py-2 text-sm font-medium text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
