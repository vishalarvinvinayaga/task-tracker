import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import type { TaskStatus } from "../../api/types";
import { STATUS_LABELS } from "../../api/types";

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
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-gray-100 dark:bg-gray-900/50">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {STATUS_LABELS[status]} <span className="text-gray-400">({count})</span>
        </h3>
        {headerAction}
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 rounded-lg p-2 transition-colors ${isOver ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
          style={{ minHeight: 80 }}
        >
          {children}
        </div>
      </SortableContext>
    </div>
  );
}
