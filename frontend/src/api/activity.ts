import { api } from "../lib/api";

export type ActivityLogEntry = {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  detail_json: Record<string, unknown> | null;
  created_at: string;
};

export const activityApi = {
  list: (params: { entity_type?: string; entity_id?: number; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.entity_type) search.set("entity_type", params.entity_type);
    if (params.entity_id !== undefined) search.set("entity_id", String(params.entity_id));
    if (params.limit !== undefined) search.set("limit", String(params.limit));
    const qs = search.toString();
    return api.get<ActivityLogEntry[]>(`/activity${qs ? `?${qs}` : ""}`);
  },
};
