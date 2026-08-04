import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { TemplateForm } from "../components/templates/TemplateForm";
import { RecurringTaskForm } from "../components/templates/RecurringTaskForm";
import { templatesApi } from "../api/templates";
import { recurringApi, type RecurringTask } from "../api/recurring";
import type { Template, TemplateType } from "../api/types";

const TYPE_LABELS: Record<TemplateType, string> = { task: "Task", meeting_note: "Meeting note", sprint: "Sprint" };

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creatingRecurring, setCreatingRecurring] = useState(false);

  function load() {
    templatesApi.list().then(setTemplates);
    recurringApi.list().then(setRecurring);
  }

  useEffect(load, []);

  const grouped = new Map<TemplateType, Template[]>();
  for (const t of templates) {
    if (!grouped.has(t.template_type)) grouped.set(t.template_type, []);
    grouped.get(t.template_type)!.push(t);
  }

  return (
    <>
      <Header title="Templates" />
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Templates</h2>
            <button onClick={() => setCreating(true)} className="rounded-lg btn-primary px-3 py-1.5 text-sm font-medium text-white">
              New Template
            </button>
          </div>
          {Array.from(grouped.entries()).map(([type, items]) => (
            <div key={type} className="mb-4">
              <h3 className="mb-1.5 text-xs font-medium text-gray-500">{TYPE_LABELS[type]}</h3>
              <div className="space-y-1.5">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg glass-card px-3 py-2">
                    <span className="text-sm">{t.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(t)} className="text-xs text-gray-400 hover:text-blue-600">
                        Edit
                      </button>
                      <button
                        onClick={() => window.confirm(`Delete "${t.name}"?`) && templatesApi.remove(t.id).then(load)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="text-sm text-gray-400">No templates yet.</p>}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Recurring tasks</h2>
            <div className="flex gap-2">
              <button onClick={() => recurringApi.runNow().then(load)} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 dark:bg-gray-800">
                Run now
              </button>
              <button onClick={() => setCreatingRecurring(true)} className="rounded-lg btn-primary px-3 py-1.5 text-sm font-medium text-white">
                New Recurring Task
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {recurring.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg glass-card px-3 py-2">
                <div>
                  <span className="text-sm">{r.title}</span>
                  <span className="ml-2 text-xs text-gray-400 capitalize">{r.frequency}</span>
                  {!r.active && <span className="ml-2 text-xs text-gray-400">(paused)</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => recurringApi.update(r.id, { active: !r.active }).then(load)}
                    className="text-xs text-gray-400 hover:text-blue-600"
                  >
                    {r.active ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => recurringApi.remove(r.id).then(load)} className="text-xs text-gray-400 hover:text-red-500">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {recurring.length === 0 && <p className="text-sm text-gray-400">No recurring tasks yet.</p>}
          </div>
        </section>
      </div>

      {creating && (
        <TemplateForm
          onCancel={() => setCreating(false)}
          onSubmit={async (data) => {
            await templatesApi.create(data);
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <TemplateForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSubmit={async (data) => {
            await templatesApi.update(editing.id, { name: data.name, content_json: data.content_json });
            setEditing(null);
            load();
          }}
        />
      )}
      {creatingRecurring && (
        <RecurringTaskForm
          onCancel={() => setCreatingRecurring(false)}
          onSubmit={async (data) => {
            await recurringApi.create(data);
            setCreatingRecurring(false);
            load();
          }}
        />
      )}
    </>
  );
}
