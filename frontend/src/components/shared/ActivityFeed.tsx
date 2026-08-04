import { useEffect, useState } from "react";
import { activityApi, type ActivityLogEntry } from "../../api/activity";

const ENTITY_ICON: Record<string, string> = {
  sprint: "🏁",
  task: "✓",
  note: "📝",
  kb: "📚",
  time: "⏱",
  inbox: "📥",
  attachment: "📎",
};

function describe(entry: ActivityLogEntry): string {
  const detail = entry.detail_json ?? {};
  switch (entry.action) {
    case "created":
      return `${entry.entity_type} #${entry.entity_id} created${detail.title ? `: ${detail.title}` : ""}`;
    case "updated":
      return `${entry.entity_type} #${entry.entity_id} updated`;
    case "status_changed":
      return `${entry.entity_type} #${entry.entity_id} moved ${detail.from} → ${detail.to}`;
    case "closed":
      return `sprint #${entry.entity_id} closed (${detail.carried_count ?? 0} tasks carried)`;
    case "carried_over":
      return `task #${entry.entity_id} carried into next sprint`;
    case "linked":
      return `note #${entry.entity_id} linked (${detail.link_type})`;
    case "punch_in":
      return "punched in";
    case "punch_out":
      return `punched out (${typeof detail.duration_hours === "number" ? detail.duration_hours.toFixed(2) : "?"}h)`;
    case "task_time_logged":
      return `logged ${detail.duration_hours}h on task #${detail.task_id}`;
    default:
      return `${entry.entity_type} #${entry.entity_id} ${entry.action}`;
  }
}

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    activityApi.list({ limit }).then(setEntries);
  }, [limit]);

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No activity yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-2 text-sm">
          <span className="text-gray-400">{ENTITY_ICON[e.entity_type] ?? "•"}</span>
          <span className="flex-1 text-gray-600 dark:text-gray-300">{describe(e)}</span>
          <span className="shrink-0 text-xs text-gray-400">{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </li>
      ))}
    </ul>
  );
}
