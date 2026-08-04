import { api } from "../lib/api";

export type TrendPoint = {
  date: string;
  tasks_completed: number;
  hours_logged: number;
};

export const statsApi = {
  trends: (days = 14) => api.get<TrendPoint[]>(`/stats/trends?days=${days}`),
};
