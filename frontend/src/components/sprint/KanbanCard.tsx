import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "../../api/types";
import { PRIORITY_DOT } from "../../api/types";
import { TicketBadge } from "../task/TicketBadge";

/**
 * `overlay` renders the floating copy that follows the cursor — it gets the
 * full lift treatment (tilt, bloom, brackets). The in-column original fades
 * to a ghost slot while its overlay is airborne.
 */
export function KanbanCard({ task, onClick, overlay = false }: { task: Task; onClick: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style: React.CSSProperties = overlay
    ? {
        transform: "rotate(-2.2deg) scale(1.04)",
        cursor: "grabbing",
      }
    : {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: isDragging ? 0.25 : 1,
        filter: isDragging ? "grayscale(0.6)" : undefined,
      };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={onClick}
      className={`glass-card cursor-grab touch-none select-none p-3 active:cursor-grabbing ${
        overlay ? "hud-dragging hud-bracket" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rotate-45 ${PRIORITY_DOT[task.priority]}`} />
        <p className="text-sm font-medium leading-snug">{task.title}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {task.tags.map((t) => (
          <span
            key={t.id}
            className="px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{
              backgroundColor: `color-mix(in srgb, ${t.color} 22%, transparent)`,
              border: `1px solid ${t.color}`,
              color: t.color,
            }}
          >
            {t.name}
          </span>
        ))}
        {task.ticket_id && <TicketBadge ticketId={task.ticket_id} ticketUrl={task.ticket_url} />}
        {task.due_date && (
          <span className="hud-readout text-[10px] text-[var(--hud-text-dim)]">
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
