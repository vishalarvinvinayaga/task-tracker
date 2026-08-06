import { api } from "../lib/api";
import type { Task } from "./types";

export type PlanOutcome = "planned" | "done" | "slipped" | "dropped";
export type PlanItemSource = "suggested" | "manual" | "claude";
export type SuggestionReason = "slipped" | "due" | "overdue" | "in_progress";

export type PlanItem = {
  id: number;
  task_id: number;
  outcome: PlanOutcome;
  pinned: boolean;
  source: PlanItemSource;
  sort_order: number;
  carried_from_plan_id: number | null;
  task: Task;
  container_name: string | null;
  slip_count: number;
};

export type DailyPlan = {
  id: number;
  plan_date: string;
  focus: string | null;
  closed_at: string | null;
  created_at: string;
  items: PlanItem[];
};

export type PlanSuggestion = {
  task: Task;
  container_name: string | null;
  reason: SuggestionReason;
  slip_count: number;
};

export type TodayPlanResponse = {
  plan: DailyPlan | null;
  suggestions: PlanSuggestion[];
};

export const plansApi = {
  today: () => api.get<TodayPlanResponse>("/plans/today"),
  commitToday: (task_ids: number[], focus?: string | null) =>
    api.post<DailyPlan>("/plans/today", { task_ids, focus, source: "manual" }),
  history: (limit = 30) => api.get<DailyPlan[]>(`/plans?limit=${limit}`),
  updateFocus: (planId: number, focus: string | null) => api.put<DailyPlan>(`/plans/${planId}`, { focus }),
  addItem: (planId: number, task_id: number) =>
    api.post<DailyPlan>(`/plans/${planId}/items`, { task_id, pinned: true, source: "manual" }),
  setPinned: (planId: number, itemId: number, pinned: boolean) =>
    api.patch<DailyPlan>(`/plans/${planId}/items/${itemId}`, { pinned }),
  removeItem: (planId: number, itemId: number) => api.delete<DailyPlan>(`/plans/${planId}/items/${itemId}`),
};

export const REASON_LABEL: Record<SuggestionReason, string> = {
  slipped: "Slipped",
  overdue: "Overdue",
  in_progress: "In progress",
  due: "Due today",
};
