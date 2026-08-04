import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../../api/types";
import { PRIORITY_DOT } from "../../api/types";
import { TicketBadge } from "../task/TicketBadge";

export function KanbanCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-pointer rounded-lg glass-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {task.tags.map((t) => (
          <span
            key={t.id}
            className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: t.color }}
          >
            {t.name}
          </span>
        ))}
        {task.ticket_id && <TicketBadge ticketId={task.ticket_id} ticketUrl={task.ticket_url} />}
        {task.due_date && (
          <span className="text-[11px] text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
