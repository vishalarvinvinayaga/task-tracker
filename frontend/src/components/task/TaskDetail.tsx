import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tasksApi } from "../../api/tasks";
import { timeApi } from "../../api/time";
import type { Tag, TaskDetail as TaskDetailType, TaskPriority, TaskStatus, TaskType } from "../../api/types";
import { STATUS_LABELS } from "../../api/types";
import { TagPicker } from "../shared/TagPicker";
import { SlideOver } from "../shared/SlideOver";
import { FileUploader } from "../shared/FileUploader";
import { TicketBadge } from "./TicketBadge";
import { TaskNotes } from "./TaskNotes";
import { ConfirmDialog } from "../shared/ConfirmDialog";

export function TaskDetail({
  taskId,
  allTags,
  onClose,
  onChanged,
}: {
  taskId: number;
  allTags: Tag[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [task, setTask] = useState<TaskDetailType | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [logHoursDraft, setLogHoursDraft] = useState("");

  function load() {
    tasksApi.get(taskId).then((t) => {
      setTask(t);
      setTitleDraft(t.title);
      setDescDraft(t.description_md ?? "");
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function patch(data: Parameters<typeof tasksApi.update>[1]) {
    await tasksApi.update(taskId, data);
    load();
    onChanged();
  }

  if (!task) {
    return (
      <SlideOver onClose={onClose}>
        <p className="text-sm text-gray-400">Loading…</p>
      </SlideOver>
    );
  }

  return (
    <SlideOver onClose={onClose}>
      <div className="space-y-6">
        <div>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleDraft.trim() && titleDraft !== task.title) patch({ title: titleDraft });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xl font-semibold dark:border-gray-700 dark:bg-gray-900"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="cursor-text rounded-lg px-2 py-1 text-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {task.title}
            </h2>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={task.status}
              onChange={(e) => patch({ status: e.target.value as TaskStatus })}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={task.priority}
              onChange={(e) => patch({ priority: e.target.value as TaskPriority })}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={task.task_type}
              onChange={(e) => patch({ task_type: e.target.value as TaskType })}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="general">General</option>
              <option value="development">Development</option>
            </select>
            {task.ticket_id && <TicketBadge ticketId={task.ticket_id} ticketUrl={task.ticket_url} />}
          </div>

          {task.task_type === "development" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                placeholder="Ticket ID"
                defaultValue={task.ticket_id ?? ""}
                onBlur={(e) => patch({ ticket_id: e.target.value || null })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                placeholder="Ticket URL"
                defaultValue={task.ticket_url ?? ""}
                onBlur={(e) => patch({ ticket_url: e.target.value || null })}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
          )}

          <div className="mt-3">
            <TagPicker
              allTags={allTags}
              selectedIds={task.tags.map((t) => t.id)}
              onChange={(ids) => patch({ tag_ids: ids })}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Description</label>
          <textarea
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={() => descDraft !== (task.description_md ?? "") && patch({ description_md: descDraft })}
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            placeholder="Markdown description…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Due date</label>
            <input
              type="date"
              defaultValue={task.due_date ?? ""}
              onBlur={(e) => patch({ due_date: e.target.value || null })}
              className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Estimated / actual hours</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                defaultValue={task.estimated_hours ?? ""}
                onBlur={(e) => patch({ estimated_hours: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                placeholder="Est."
              />
              <span className="self-center text-sm text-gray-400">
                {task.actual_hours != null ? `${task.actual_hours}h actual` : "—"}
              </span>
            </div>
          </div>
        </div>

        {task.carry_chain.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Carried from</label>
            <ul className="space-y-1 text-sm">
              {task.carry_chain.map((t) => (
                <li key={t.id} className="text-gray-500">
                  ↳ {t.title}
                </li>
              ))}
            </ul>
          </div>
        )}

        <TaskNotes taskId={taskId} />

        <div>
          <label className="mb-1 block text-xs font-medium uppercase text-gray-400">Log time</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.25"
              placeholder="Hours"
              value={logHoursDraft}
              onChange={(e) => setLogHoursDraft(e.target.value)}
              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              onClick={async () => {
                const hours = Number(logHoursDraft);
                if (!hours || hours <= 0) return;
                await timeApi.logTaskTime(taskId, hours);
                setLogHoursDraft("");
                load();
                onChanged();
              }}
              className="rounded-lg bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              Add
            </button>
          </div>
        </div>

        <FileUploader parent={{ taskId }} />

        <div className="flex items-center justify-between gap-3 border-t border-[var(--hud-line)] pt-3">
          <span className="text-xs text-[var(--hud-text-dim)]">
            In <Link to={`/sprints/${task.sprint_id}`} className="underline">{task.sprint_name}</Link> · Created{" "}
            {new Date(task.created_at).toLocaleDateString()} · Updated{" "}
            {new Date(task.updated_at).toLocaleDateString()}
          </span>
          <button
            onClick={() => setDeleting(true)}
            className="hud-mono shrink-0 text-[10px] uppercase tracking-wider text-[var(--hud-text-dim)] transition-colors hover:text-rose-400"
          >
            Delete task
          </button>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Delete "${task.title}"?`}
          body={
            <>
              This permanently deletes the task along with its time logs and attachments. Any notes
              written against it survive as standalone notes. This cannot be undone.
            </>
          }
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await tasksApi.remove(taskId);
            onChanged();
            onClose();
          }}
        />
      )}
    </SlideOver>
  );
}
