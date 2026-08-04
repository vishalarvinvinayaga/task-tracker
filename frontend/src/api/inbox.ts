import { api } from "../lib/api";

export type InboxItem = {
  id: number;
  content: string;
  resolved_to: "task" | "note" | "kb" | "dismissed" | null;
  resolved_id: number | null;
  created_at: string;
  resolved_at: string | null;
};

export const inboxApi = {
  list: (includeResolved = false) => api.get<InboxItem[]>(`/inbox?include_resolved=${includeResolved}`),
  capture: (content: string) => api.post<InboxItem>("/inbox", { content }),
  resolve: (id: number, resolveTo: "task" | "note" | "kb" | "dismissed", targetData?: Record<string, unknown>) =>
    api.post<InboxItem>(`/inbox/${id}/resolve`, { resolve_to: resolveTo, target_data: targetData }),
};
