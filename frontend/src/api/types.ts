export type Tag = {
  id: number;
  name: string;
  color: string;
};

/** Tag plus where it's currently applied — drives the delete confirmation. */
export type TagWithUsage = Tag & {
  task_count: number;
  note_count: number;
  kb_count: number;
};

export type SprintStatus = "planned" | "active" | "closed";
/** A sprint is time-boxed with ceremony; a list is a plain always-available bucket. */
export type ContainerType = "sprint" | "list";
export type ContainerView = "board" | "list";

export type SprintGoal = {
  id: number;
  sprint_id: number;
  title: string;
  progress_pct: number;
  created_at: string;
};

export type Sprint = {
  id: number;
  name: string;
  container_type: ContainerType;
  goals_summary: string | null;
  /** null on lists — only sprints are time-boxed. */
  start_date: string | null;
  end_date: string | null;
  status: SprintStatus;
  default_view: ContainerView;
  /** The Backlog: guarantees somewhere always exists to put a task. */
  is_protected: boolean;
  created_at: string;
  updated_at: string;
};

export type SprintWithStats = Sprint & {
  task_count: number;
  done_count: number;
  goals: SprintGoal[];
};

export type SprintRetro = {
  id: number;
  sprint_id: number;
  went_well: string | null;
  needs_improvement: string | null;
  action_items: string | null;
  created_at: string;
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskType = "general" | "development";

export type Task = {
  id: number;
  sprint_id: number;
  title: string;
  description_md: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType;
  ticket_id: string | null;
  ticket_url: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  sort_order: number;
  carried_from_task_id: number | null;
  template_id: number | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

export type TaskDetail = Task & {
  sprint_name: string | null;
  carry_chain: Task[];
};

export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export type NoteType = "general" | "meeting" | "standup" | "retro";
export type NoteSource = "manual" | "claude_code" | "claude_desktop";
export type LinkType = "reference" | "related" | "followup";

export type Note = {
  id: number;
  task_id: number | null;
  title: string;
  content_md: string | null;
  note_type: NoteType;
  attendees: string | null;
  source: NoteSource;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

export type NoteSearchResult = {
  id: number;
  title: string;
  snippet: string;
  note_type: NoteType;
  created_at: string;
};

export type NoteLink = {
  id: number;
  from_note_id: number;
  to_note_id: number;
  link_type: LinkType;
  created_at: string;
};

export type TemplateType = "task" | "meeting_note" | "sprint";

export type Template = {
  id: number;
  name: string;
  template_type: TemplateType;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type KbArticle = {
  id: number;
  title: string;
  content_md: string | null;
  category: string | null;
  source_note_id: number | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
};

export type KbSearchResult = {
  id: number;
  title: string;
  snippet: string;
  category: string | null;
  created_at: string;
};

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  general: "General",
  meeting: "Meeting",
  standup: "Standup",
  retro: "Retro",
};

export const SOURCE_LABELS: Record<NoteSource, string> = {
  manual: "Manual",
  claude_code: "Claude Code",
  claude_desktop: "Claude Desktop",
};
