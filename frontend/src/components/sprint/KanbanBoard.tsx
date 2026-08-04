import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { tasksApi } from "../../api/tasks";
import type { Task, TaskStatus } from "../../api/types";
import { TASK_STATUSES } from "../../api/types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";

type Board = Record<TaskStatus, Task[]>;

function group(tasks: Task[]): Board {
  const board: Board = { todo: [], in_progress: [], review: [], done: [] };
  for (const t of [...tasks].sort((a, b) => a.sort_order - b.sort_order)) {
    board[t.status].push(t);
  }
  return board;
}

export function KanbanBoard({
  sprintId,
  onOpenTask,
  refreshKey,
  onAddTask,
}: {
  sprintId: number;
  onOpenTask: (id: number) => void;
  refreshKey: number;
  onAddTask: (status: TaskStatus) => void;
}) {
  const [board, setBoard] = useState<Board>({ todo: [], in_progress: [], review: [], done: [] });
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function load() {
    tasksApi.list({ sprint_id: sprintId }).then((tasks) => setBoard(group(tasks)));
  }

  useEffect(load, [sprintId, refreshKey]);

  function findColumn(id: number | string): TaskStatus | null {
    if (TASK_STATUSES.includes(id as TaskStatus)) return id as TaskStatus;
    for (const status of TASK_STATUSES) {
      if (board[status].some((t) => t.id === id)) return status;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    const col = findColumn(e.active.id as number);
    if (col) setActiveTask(board[col].find((t) => t.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const fromCol = findColumn(active.id as number);
    const toCol = findColumn(over.id as number);
    if (!fromCol || !toCol) return;

    setBoard((prev) => {
      const next = { ...prev, [fromCol]: [...prev[fromCol]], [toCol]: fromCol === toCol ? prev[fromCol] : [...prev[toCol]] };
      const fromIndex = next[fromCol].findIndex((t) => t.id === active.id);
      const [moved] = next[fromCol].splice(fromIndex, 1);
      const overIsColumn = TASK_STATUSES.includes(over.id as TaskStatus);
      const toIndex = overIsColumn ? next[toCol].length : next[toCol].findIndex((t) => t.id === over.id);

      if (fromCol === toCol) {
        next[fromCol] = arrayMove(prev[fromCol], fromIndex, toIndex < 0 ? next[fromCol].length : toIndex);
      } else {
        moved.status = toCol;
        next[toCol].splice(toIndex < 0 ? next[toCol].length : toIndex, 0, moved);
      }

      const sortOrder = next[toCol].findIndex((t) => t.id === active.id);
      tasksApi.move(active.id as number, toCol, sortOrder).catch(load);
      return next;
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            taskIds={board[status].map((t) => t.id)}
            count={board[status].length}
            headerAction={
              status === "todo" ? (
                <button
                  onClick={() => onAddTask(status)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  + Add
                </button>
              ) : undefined
            }
          >
            {board[status].map((task) => (
              <KanbanCard key={task.id} task={task} onClick={() => onOpenTask(task.id)} />
            ))}
          </KanbanColumn>
        ))}
      </div>
      <DragOverlay>{activeTask && <KanbanCard task={activeTask} onClick={() => {}} />}</DragOverlay>
    </DndContext>
  );
}
