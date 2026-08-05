import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { KanbanBoard } from "../components/sprint/KanbanBoard";
import { TaskChecklist } from "../components/sprint/TaskChecklist";
import { SprintHeader } from "../components/sprint/SprintHeader";
import { SprintGoals } from "../components/sprint/SprintGoals";
import { SprintCloseModal } from "../components/sprint/SprintCloseModal";
import { TaskDetail } from "../components/task/TaskDetail";
import { TaskForm, type TaskFormValues } from "../components/task/TaskForm";
import { Modal } from "../components/shared/Modal";
import { sprintsApi } from "../api/sprints";
import { tasksApi } from "../api/tasks";
import { tagsApi } from "../api/tags";
import { useToast } from "../hooks/useToast";
import type { ContainerView, SprintWithStats, Tag, TaskStatus } from "../api/types";

export function SprintDetail() {
  const { id } = useParams();
  const containerId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [container, setContainer] = useState<SprintWithStats | null>(null);
  const [view, setView] = useState<ContainerView | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [addingStatus, setAddingStatus] = useState<TaskStatus | null>(null);
  const [closing, setClosing] = useState(false);

  function load() {
    sprintsApi.get(containerId).then((c) => {
      setContainer(c);
      // Adopt the container's saved preference on first load only, so a manual
      // toggle isn't undone by a background refresh.
      setView((current) => current ?? c.default_view);
    });
  }

  useEffect(() => {
    setView(null);
    load();
    tagsApi.list().then(setAllTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  function bump() {
    load();
    setRefreshKey((k) => k + 1);
  }

  function changeView(next: ContainerView) {
    setView(next);
    sprintsApi.update(containerId, { default_view: next }).catch(() => {
      toast.show("Couldn't save view preference", "error");
    });
  }

  async function createTask(values: TaskFormValues) {
    await tasksApi.create({
      title: values.title,
      description_md: values.description_md || undefined,
      priority: values.priority,
      task_type: values.task_type,
      ticket_id: values.task_type === "development" ? values.ticket_id || undefined : undefined,
      ticket_url: values.task_type === "development" ? values.ticket_url || undefined : undefined,
      due_date: values.due_date || undefined,
      estimated_hours: values.estimated_hours ? Number(values.estimated_hours) : undefined,
      sprint_id: containerId,
      tag_ids: values.tag_ids,
      status: addingStatus ?? "todo",
    });
    setAddingStatus(null);
    bump();
    toast.show("Task created");
  }

  if (!container || !view) return null;

  const isSprint = container.container_type === "sprint";

  return (
    <>
      <Header title={isSprint ? "Sprint board" : container.name} code={isSprint ? "SPR" : "LST"} />
      <SprintHeader sprint={container} view={view} onViewChange={changeView} onCloseSprint={() => setClosing(true)} />

      {/* Goals are sprint ceremony — a plain list has nothing to track against. */}
      {isSprint && <SprintGoals sprintId={containerId} goals={container.goals} onChanged={load} />}

      {view === "board" ? (
        <KanbanBoard
          sprintId={containerId}
          onOpenTask={setOpenTaskId}
          refreshKey={refreshKey}
          onAddTask={(status) => setAddingStatus(status)}
        />
      ) : (
        <TaskChecklist
          containerId={containerId}
          refreshKey={refreshKey}
          onOpenTask={setOpenTaskId}
          onChanged={bump}
          onAddTask={() => setAddingStatus("todo")}
        />
      )}

      {addingStatus && (
        <Modal title="New task" onClose={() => setAddingStatus(null)}>
          <TaskForm allTags={allTags} onSubmit={createTask} onCancel={() => setAddingStatus(null)} />
        </Modal>
      )}

      {openTaskId && (
        <TaskDetail taskId={openTaskId} allTags={allTags} onClose={() => setOpenTaskId(null)} onChanged={bump} />
      )}

      {closing && (
        <SprintCloseModal
          sprint={container}
          onClose={() => setClosing(false)}
          onClosed={() => {
            setClosing(false);
            navigate(`/sprints/${containerId}/retro`);
          }}
        />
      )}
    </>
  );
}
