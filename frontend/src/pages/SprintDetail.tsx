import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { KanbanBoard } from "../components/sprint/KanbanBoard";
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
import type { SprintWithStats, Tag, TaskStatus } from "../api/types";

export function SprintDetail() {
  const { id } = useParams();
  const sprintId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [sprint, setSprint] = useState<SprintWithStats | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [addingStatus, setAddingStatus] = useState<TaskStatus | null>(null);
  const [closing, setClosing] = useState(false);

  function load() {
    sprintsApi.get(sprintId).then(setSprint);
  }

  useEffect(() => {
    load();
    tagsApi.list().then(setAllTags);
  }, [sprintId]);

  function bump() {
    load();
    setRefreshKey((k) => k + 1);
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
      sprint_id: sprintId,
      tag_ids: values.tag_ids,
      status: addingStatus ?? "todo",
    });
    setAddingStatus(null);
    bump();
    toast.show("Task created");
  }

  if (!sprint) return null;

  return (
    <>
      <Header title="Sprint board" />
      <SprintHeader sprint={sprint} onCloseSprint={() => setClosing(true)} />
      <SprintGoals sprintId={sprintId} goals={sprint.goals} onChanged={load} />
      <KanbanBoard
        sprintId={sprintId}
        onOpenTask={setOpenTaskId}
        refreshKey={refreshKey}
        onAddTask={(status) => setAddingStatus(status)}
      />

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
          sprint={sprint}
          onClose={() => setClosing(false)}
          onClosed={(nextSprintId) => {
            setClosing(false);
            toast.show("Sprint closed");
            navigate(`/sprints/${sprintId}/retro`);
            void nextSprintId;
          }}
        />
      )}
    </>
  );
}
