import { api } from "../lib/api";

export type TimeLog = {
  id: number;
  task_id: number | null;
  log_type: "punch_in" | "punch_out" | "task_time";
  start_time: string;
  end_time: string | null;
  duration_hours: number | null;
  notes: string | null;
  created_at: string;
};

export type TimeStatus = {
  punched_in: boolean;
  session_start: string | null;
  session_duration_hours: number | null;
  today_total_hours: number;
};

export type TimeBreakdownEntry = {
  tag_name: string;
  color: string;
  hours: number;
};

export const timeApi = {
  list: (params: { task_id?: number; log_type?: string } = {}) => {
    const search = new URLSearchParams();
    if (params.task_id !== undefined) search.set("task_id", String(params.task_id));
    if (params.log_type) search.set("log_type", params.log_type);
    const qs = search.toString();
    return api.get<TimeLog[]>(`/time${qs ? `?${qs}` : ""}`);
  },
  status: () => api.get<TimeStatus>("/time/status"),
  punchIn: (notes?: string) => api.post<TimeLog>("/time/punch/in", { notes }),
  punchOut: (notes?: string) => api.post<TimeLog>("/time/punch/out", { notes }),
  logTaskTime: (taskId: number, durationHours: number, notes?: string) =>
    api.post<TimeLog>("/time/task", { task_id: taskId, duration_hours: durationHours, notes }),
  breakdown: (period: "day" | "week" | "month" = "week") => api.get<TimeBreakdownEntry[]>(`/time/breakdown?period=${period}`),
};
