import { api } from "../lib/api";
import type { KbArticle, KbSearchResult } from "./types";

export type KbArticleCreateInput = {
  title: string;
  content_md?: string;
  category?: string;
  source_note_id?: number;
  tag_ids?: number[];
};

export type KbArticleUpdateInput = Partial<Omit<KbArticleCreateInput, "source_note_id">>;

export const kbApi = {
  list: (params: { category?: string; tag_id?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.category) search.set("category", params.category);
    if (params.tag_id !== undefined) search.set("tag_id", String(params.tag_id));
    const qs = search.toString();
    return api.get<KbArticle[]>(`/kb${qs ? `?${qs}` : ""}`);
  },
  categories: () => api.get<string[]>("/kb/categories"),
  search: (q: string, limit = 20) => api.get<KbSearchResult[]>(`/kb/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  get: (id: number) => api.get<KbArticle>(`/kb/${id}`),
  create: (data: KbArticleCreateInput) => api.post<KbArticle>("/kb", data),
  update: (id: number, data: KbArticleUpdateInput) => api.put<KbArticle>(`/kb/${id}`, data),
  remove: (id: number) => api.delete<void>(`/kb/${id}`),
};
