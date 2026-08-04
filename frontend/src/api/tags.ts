import { api } from "../lib/api";
import type { Tag } from "./types";

export const tagsApi = {
  list: () => api.get<Tag[]>("/tags"),
  create: (name: string, color = "#6B7280") => api.post<Tag>("/tags", { name, color }),
};
