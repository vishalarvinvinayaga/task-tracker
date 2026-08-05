import { api } from "../lib/api";
import type { ContainerType, ContainerView, Sprint, SprintGoal, SprintRetro, SprintWithStats } from "./types";

export type SprintCreateInput = {
  name: string;
  container_type?: ContainerType;
  goals_summary?: string | null;
  /** Required for sprints, ignored for lists. */
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  default_view?: ContainerView;
};

export type SprintUpdateInput = Partial<SprintCreateInput>;

export const sprintsApi = {
  list: (containerType?: ContainerType) =>
    api.get<SprintWithStats[]>(`/sprints${containerType ? `?container_type=${containerType}` : ""}`),
  get: (id: number) => api.get<SprintWithStats>(`/sprints/${id}`),
  create: (data: SprintCreateInput) => api.post<Sprint>("/sprints", data),
  update: (id: number, data: SprintUpdateInput) => api.put<Sprint>(`/sprints/${id}`, data),
  remove: (id: number) => api.delete<void>(`/sprints/${id}`),
  close: (id: number, carryTaskIds: number[], nextSprintId: number) =>
    api.post<Sprint>(`/sprints/${id}/close`, { carry_task_ids: carryTaskIds, next_sprint_id: nextSprintId }),
  createGoal: (sprintId: number, title: string) =>
    api.post<SprintGoal>(`/sprints/${sprintId}/goals`, { title, progress_pct: 0 }),
  updateGoal: (sprintId: number, goalId: number, data: Partial<{ title: string; progress_pct: number }>) =>
    api.put<SprintGoal>(`/sprints/${sprintId}/goals/${goalId}`, data),
  deleteGoal: (sprintId: number, goalId: number) => api.delete<void>(`/sprints/${sprintId}/goals/${goalId}`),
  getRetro: (sprintId: number) => api.get<SprintRetro | null>(`/sprints/${sprintId}/retro`),
  upsertRetro: (sprintId: number, data: Partial<SprintRetro>) =>
    api.put<SprintRetro>(`/sprints/${sprintId}/retro`, data),
};
