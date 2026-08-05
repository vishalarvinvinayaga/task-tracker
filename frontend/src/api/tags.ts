import { api } from "../lib/api";
import type { Tag, TagWithUsage } from "./types";

export const tagsApi = {
  /** Includes usage counts, so callers can warn before a destructive delete. */
  list: () => api.get<TagWithUsage[]>("/tags"),
  create: (name: string, color = "#6B7280") => api.post<Tag>("/tags", { name, color }),
  update: (id: number, data: { name?: string; color?: string }) => api.put<Tag>(`/tags/${id}`, data),
  remove: (id: number) => api.delete<void>(`/tags/${id}`),
};
