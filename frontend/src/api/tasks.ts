import { api } from "../lib/api";
import type { Task, TaskDetail, TaskPriority, TaskStatus, TaskType } from "./types";

export type TaskCreateInput = {
  title: string;
  description_md?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  task_type?: TaskType;
  ticket_id?: string | null;
  ticket_url?: string | null;
  estimated_hours?: number | null;
  due_date?: string | null;
  sprint_id?: number | null;
  tag_ids?: number[];
};

export type TaskUpdateInput = Partial<Omit<TaskCreateInput, "sprint_id">> & {
  actual_hours?: number | null;
  sort_order?: number;
};

export const tasksApi = {
  list: (params: { sprint_id?: number; status?: string; tag_id?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.sprint_id !== undefined) search.set("sprint_id", String(params.sprint_id));
    if (params.status) search.set("status", params.status);
    if (params.tag_id !== undefined) search.set("tag_id", String(params.tag_id));
    const qs = search.toString();
    return api.get<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
  },
  get: (id: number) => api.get<TaskDetail>(`/tasks/${id}`),
  create: (data: TaskCreateInput) => api.post<Task>("/tasks", data),
  update: (id: number, data: TaskUpdateInput) => api.put<Task>(`/tasks/${id}`, data),
  move: (id: number, status: TaskStatus, sort_order?: number) =>
    api.post<Task>(`/tasks/${id}/move`, { status, sort_order }),
  remove: (id: number) => api.delete<void>(`/tasks/${id}`),
};
