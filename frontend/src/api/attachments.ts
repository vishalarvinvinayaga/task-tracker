import { api } from "../lib/api";

export type Attachment = {
  id: number;
  task_id: number | null;
  note_id: number | null;
  kb_article_id: number | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  source: "upload" | "claude_code" | "clipboard";
  created_at: string;
};

type Parent = { taskId?: number; noteId?: number; kbArticleId?: number };

export const attachmentsApi = {
  list: (parent: Parent) => {
    const search = new URLSearchParams();
    if (parent.taskId !== undefined) search.set("task_id", String(parent.taskId));
    if (parent.noteId !== undefined) search.set("note_id", String(parent.noteId));
    if (parent.kbArticleId !== undefined) search.set("kb_article_id", String(parent.kbArticleId));
    return api.get<Attachment[]>(`/attachments?${search.toString()}`);
  },
  upload: async (file: File, parent: Parent): Promise<Attachment> => {
    const form = new FormData();
    form.append("file", file);
    if (parent.taskId !== undefined) form.append("task_id", String(parent.taskId));
    if (parent.noteId !== undefined) form.append("note_id", String(parent.noteId));
    if (parent.kbArticleId !== undefined) form.append("kb_article_id", String(parent.kbArticleId));
    const res = await fetch("/api/attachments", { method: "POST", body: form });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  },
  remove: (id: number) => api.delete<void>(`/attachments/${id}`),
  url: (filePath: string) => `/attachments/${filePath}`,
};
