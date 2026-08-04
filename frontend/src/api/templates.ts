import { api } from "../lib/api";
import type { Template } from "./types";

export const templatesApi = {
  list: (templateType?: string) => api.get<Template[]>(`/templates${templateType ? `?template_type=${templateType}` : ""}`),
  get: (id: number) => api.get<Template>(`/templates/${id}`),
  create: (data: { name: string; template_type: string; content_json: Record<string, unknown> }) =>
    api.post<Template>("/templates", data),
  update: (id: number, data: Partial<{ name: string; content_json: Record<string, unknown> }>) =>
    api.put<Template>(`/templates/${id}`, data),
  remove: (id: number) => api.delete<void>(`/templates/${id}`),
};
