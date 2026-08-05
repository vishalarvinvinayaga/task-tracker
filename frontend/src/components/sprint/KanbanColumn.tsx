import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { TaskStatus } from "../../api/types";
import { STATUS_LABELS } from "../../api/types";

const STATUS_CODE: Record<TaskStatus, string> = {
  todo: "QUEUE",
  in_progress: "ACTIVE",
  review: "REVIEW",
  done: "CLEARED",
};

export function KanbanColumn({
  status,
  taskIds,
  count,
  children,
  headerAction,
}: {
  status: TaskStatus;
  taskIds: number[];
  count: number;
  children: ReactNode;
  headerAction?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={`hud-frame flex w-[19rem] shrink-0 flex-col ${isOver ? "hud-drop-target" : ""}`}>
      <div className="flex items-center justify-between border-b border-[var(--hud-line)] px-3 py-2">
        <span className="hud-label flex items-center gap-2">
          <span
            className="inline-block h-1 w-1 shrink-0"
            style={{ background: "var(--accent-via)", boxShadow: "0 0 6px 1px var(--accent-via)" }}
          />
          {STATUS_CODE[status]}
          <span className="opacity-50">[{count}]</span>
        </span>
        {headerAction}
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="relative flex-1 space-y-2 p-2.5 transition-colors"
          style={{ minHeight: 120 }}
        >
          {/* targeting reticle while a card hovers this column */}
          {isOver && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-2 border border-dashed"
              style={{ borderColor: "var(--hud-line-strong)" }}
            />
          )}
          {children}
          {count === 0 && !isOver && (
            <p className="hud-label py-6 text-center !text-[9px] opacity-45">{STATUS_LABELS[status]} empty</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
