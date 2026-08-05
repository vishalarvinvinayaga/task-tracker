import { api } from "../lib/api";
import type { KbArticle, Note, NoteLink, NoteSearchResult } from "./types";

export type NoteCreateInput = {
  title: string;
  content_md?: string;
  task_id?: number | null;
  note_type?: string;
  /** null explicitly clears the field server-side; undefined leaves it alone. */
  attendees?: string | null;
  source?: string;
  tag_ids?: number[];
};

export type NoteUpdateInput = Partial<Omit<NoteCreateInput, "source">>;

export const notesApi = {
  list: (params: { task_id?: number; note_type?: string; standalone_only?: boolean } = {}) => {
    const search = new URLSearchParams();
    if (params.task_id !== undefined) search.set("task_id", String(params.task_id));
    if (params.note_type) search.set("note_type", params.note_type);
    if (params.standalone_only) search.set("standalone_only", "true");
    const qs = search.toString();
    return api.get<Note[]>(`/notes${qs ? `?${qs}` : ""}`);
  },
  search: (q: string, limit = 20) => api.get<NoteSearchResult[]>(`/notes/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  get: (id: number) => api.get<Note>(`/notes/${id}`),
  create: (data: NoteCreateInput) => api.post<Note>("/notes", data),
  update: (id: number, data: NoteUpdateInput) => api.put<Note>(`/notes/${id}`, data),
  remove: (id: number) => api.delete<void>(`/notes/${id}`),
  listLinks: (id: number) => api.get<NoteLink[]>(`/notes/${id}/links`),
  createLink: (id: number, toNoteId: number, linkType = "reference") =>
    api.post<NoteLink>(`/notes/${id}/links`, { to_note_id: toNoteId, link_type: linkType }),
  deleteLink: (id: number, linkId: number) => api.delete<void>(`/notes/${id}/links/${linkId}`),
  promote: (id: number, category?: string) => api.post<KbArticle>(`/notes/${id}/promote`, { category }),
};
