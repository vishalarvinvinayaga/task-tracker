import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { LiveMarkdownEditor } from "../components/notes/LiveMarkdownEditor";
import { SaveStatus } from "../components/notes/SaveStatus";
import { NoteLinkSelector } from "../components/notes/NoteLinkSelector";
import { PromoteToKB } from "../components/notes/PromoteToKB";
import { TagPicker } from "../components/shared/TagPicker";
import { FileUploader } from "../components/shared/FileUploader";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { notesApi } from "../api/notes";
import { tagsApi } from "../api/tags";
import { templatesApi } from "../api/templates";
import { tasksApi } from "../api/tasks";
import { useAutosave, readDraft, clearDraft } from "../hooks/useAutosave";
import type { Note, NoteLink, NoteType, Tag, Task, Template } from "../api/types";
import { NOTE_TYPE_LABELS, SOURCE_LABELS } from "../api/types";

export function NoteEditor() {
  const { id } = useParams();
  const noteId = Number(id);
  const navigate = useNavigate();

  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [linkedTitles, setLinkedTitles] = useState<Record<number, string>>({});
  const [meetingTemplates, setMeetingTemplates] = useState<Template[]>([]);
  const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
  const [recovered, setRecovered] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const draftKey = `note-draft:${noteId}`;

  const save = useAutosave({
    value: content,
    draftKey,
    onSave: (md) => notesApi.update(noteId, { content_md: md }),
  });

  function load() {
    notesApi.get(noteId).then((n) => {
      setNote(n);
      setTitleDraft(n.title);

      // A local draft newer than the server copy means the last session ended
      // before its save landed — prefer the draft, it's the newer intent.
      const serverContent = n.content_md ?? "";
      const draft = readDraft<string>(draftKey);
      if (draft && draft.value !== serverContent && draft.at > new Date(n.updated_at).getTime()) {
        setContent(draft.value);
        save.reset(serverContent);
        setRecovered(true);
      } else {
        setContent(serverContent);
        save.reset(serverContent);
        clearDraft(draftKey);
      }
    });
    notesApi.listLinks(noteId).then(setLinks);
  }

  useEffect(() => {
    load();
    tagsApi.list().then(setAllTags);
    templatesApi.list("meeting_note").then(setMeetingTemplates);
    tasksApi.list().then(setSprintTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  useEffect(() => {
    if (links.length === 0) return;
    const ids = Array.from(new Set(links.flatMap((l) => [l.from_note_id, l.to_note_id])));
    Promise.all(ids.map((i) => notesApi.get(i).then((n) => [i, n.title] as const))).then((pairs) =>
      setLinkedTitles(Object.fromEntries(pairs)),
    );
  }, [links]);

  async function patch(data: Parameters<typeof notesApi.update>[1]) {
    await notesApi.update(noteId, data);
    load();
  }

  function applyTemplate(templateId: number) {
    const tpl = meetingTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const sections = (tpl.content_json.sections as string[] | undefined) ?? [];
    const body = sections.map((s) => `## ${s}\n\n`).join("\n");
    setContent(body);
    patch({ content_md: body });
    const defaultAttendees = tpl.content_json.default_attendees as string | undefined;
    if (defaultAttendees) patch({ attendees: defaultAttendees });
  }

  if (!note) return null;

  return (
    <>
      <Header title="Note" />
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => titleDraft.trim() && titleDraft !== note.title && patch({ title: titleDraft })}
          className="w-full rounded-lg border-none bg-transparent px-1 text-2xl font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={note.note_type}
            onChange={(e) => patch({ note_type: e.target.value as NoteType })}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {Object.entries(NOTE_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800">
            {SOURCE_LABELS[note.source]}
          </span>

          {note.note_type === "meeting" && meetingTemplates.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => e.target.value && applyTemplate(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">Apply template…</option>
              {meetingTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={note.task_id ?? ""}
            onChange={(e) => patch({ task_id: e.target.value ? Number(e.target.value) : null })}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">No linked task</option>
            {sprintTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          <PromoteToKB noteId={note.id} />
        </div>

        {note.note_type === "meeting" && (
          <input
            defaultValue={note.attendees ?? ""}
            onBlur={(e) => patch({ attendees: e.target.value || null })}
            placeholder="Attendees (comma-separated)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        )}

        <TagPicker allTags={allTags} selectedIds={note.tags.map((t) => t.id)} onChange={(ids) => patch({ tag_ids: ids })} />

        {recovered && (
          <div
            className="hud-frame flex items-center justify-between gap-3 px-3 py-2 text-xs"
            style={{ borderColor: "rgba(251,191,36,0.5)" }}
          >
            <span>
              Recovered unsaved text from a previous session. It's already in the editor —
              keep typing and it saves automatically.
            </span>
            <button onClick={() => setRecovered(false)} className="hud-label shrink-0 hover:text-[var(--accent-via)]">
              Dismiss
            </button>
          </div>
        )}

        <LiveMarkdownEditor value={content} onChange={setContent} onBlur={() => void save.flush()} />

        <div className="flex items-center justify-end gap-3">
          <SaveStatus state={save.state} />
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Linked notes</h3>
          {links.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm">
              {links.map((l) => {
                const otherId = l.from_note_id === note.id ? l.to_note_id : l.from_note_id;
                const direction = l.from_note_id === note.id ? "→" : "←";
                return (
                  <li key={l.id} className="flex items-center gap-2">
                    <span className="text-gray-400">{direction}</span>
                    <button onClick={() => navigate(`/notes/${otherId}`)} className="underline hover:text-blue-600">
                      {linkedTitles[otherId] ?? `Note ${otherId}`}
                    </button>
                    <span className="text-xs text-gray-400">({l.link_type})</span>
                    <button
                      onClick={() => notesApi.deleteLink(note.id, l.id).then(() => notesApi.listLinks(noteId).then(setLinks))}
                      className="ml-auto text-xs text-gray-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <NoteLinkSelector noteId={note.id} onLinked={() => notesApi.listLinks(noteId).then(setLinks)} />
        </div>

        <FileUploader parent={{ noteId }} />

        <div className="flex items-center justify-between border-t border-[var(--hud-line)] pt-3">
          <button onClick={() => navigate(-1)} className="text-sm text-[var(--hud-text-dim)] hover:underline">
            ← Back
          </button>
          <button
            onClick={() => setDeleting(true)}
            className="hud-mono text-[10px] uppercase tracking-wider text-[var(--hud-text-dim)] transition-colors hover:text-rose-400"
          >
            Delete note
          </button>
        </div>
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Delete "${note.title}"?`}
          body={
            <>
              This permanently deletes the note and its attachments. Links to and from other notes
              go with it; a KB article promoted from this note survives on its own. This cannot be
              undone.
            </>
          }
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await notesApi.remove(noteId);
            // Drop the crash-recovery draft too, or the note would reappear.
            clearDraft(draftKey);
            navigate("/notes");
          }}
        />
      )}
    </>
  );
}
