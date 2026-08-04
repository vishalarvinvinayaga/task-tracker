import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { inboxApi, type InboxItem as InboxItemType } from "../../api/inbox";

export function InboxItem({ item, onResolved }: { item: InboxItemType; onResolved: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function resolve(to: "task" | "note" | "kb" | "dismissed", navigateAfter?: (id: number) => string) {
    setBusy(true);
    try {
      const resolved = await inboxApi.resolve(item.id, to);
      if (navigateAfter && resolved.resolved_id) navigate(navigateAfter(resolved.resolved_id));
      onResolved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg glass-card p-3">
      <div className="flex-1">
        <p className="text-sm">{item.content}</p>
        <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleString()}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          disabled={busy}
          onClick={() => resolve("task")}
          className="rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
        >
          → Task
        </button>
        <button
          disabled={busy}
          onClick={() => resolve("note", (id) => `/notes/${id}`)}
          className="rounded-lg bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300"
        >
          → Note
        </button>
        <button
          disabled={busy}
          onClick={() => resolve("kb", (id) => `/kb/${id}`)}
          className="rounded-lg bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
        >
          → KB
        </button>
        <button disabled={busy} onClick={() => resolve("dismissed")} className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:bg-gray-800">
          Dismiss
        </button>
      </div>
    </div>
  );
}
