import { api } from "../lib/api";

export type RecurringTask = {
  id: number;
  template_id: number | null;
  title: string;
  description_md: string | null;
  frequency: "daily" | "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  tag_names: string | null;
  active: boolean;
  last_created_at: string | null;
  created_at: string;
};

export type RecurringTaskInput = {
  title: string;
  description_md?: string;
  frequency: "daily" | "weekly" | "monthly";
  day_of_week?: number;
  day_of_month?: number;
  tag_names?: string;
  active?: boolean;
  template_id?: number;
};

export const recurringApi = {
  list: () => api.get<RecurringTask[]>("/recurring"),
  create: (data: RecurringTaskInput) => api.post<RecurringTask>("/recurring", data),
  update: (id: number, data: Partial<RecurringTaskInput>) => api.put<RecurringTask>(`/recurring/${id}`, data),
  remove: (id: number) => api.delete<void>(`/recurring/${id}`),
  runNow: () => api.post<RecurringTask[]>("/recurring/run"),
};
