import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { LiveMarkdownEditor } from "../components/notes/LiveMarkdownEditor";
import { SaveStatus } from "../components/notes/SaveStatus";
import { WikiLinkPreview } from "../components/kb/WikiLinkPreview";
import { TagPicker } from "../components/shared/TagPicker";
import { FileUploader } from "../components/shared/FileUploader";
import { kbApi } from "../api/kb";
import { tagsApi } from "../api/tags";
import { notesApi } from "../api/notes";
import { useAutosave, readDraft, clearDraft } from "../hooks/useAutosave";
import type { KbArticle, Note, Tag } from "../api/types";

export function KbArticlePage() {
  const { id } = useParams();
  const articleId = Number(id);
  const navigate = useNavigate();

  const [article, setArticle] = useState<KbArticle | null>(null);
  const [content, setContent] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allArticles, setAllArticles] = useState<KbArticle[]>([]);
  const [sourceNote, setSourceNote] = useState<Note | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recovered, setRecovered] = useState(false);

  const draftKey = `kb-draft:${articleId}`;

  const save = useAutosave({
    value: content,
    draftKey,
    onSave: (md) => kbApi.update(articleId, { content_md: md }),
  });

  function load() {
    kbApi.get(articleId).then((a) => {
      setArticle(a);
      setTitleDraft(a.title);
      if (a.source_note_id) notesApi.get(a.source_note_id).then(setSourceNote);

      const serverContent = a.content_md ?? "";
      const draft = readDraft<string>(draftKey);
      if (draft && draft.value !== serverContent && draft.at > new Date(a.updated_at).getTime()) {
        setContent(draft.value);
        save.reset(serverContent);
        setRecovered(true);
      } else {
        setContent(serverContent);
        save.reset(serverContent);
        clearDraft(draftKey);
      }
    });
  }

  useEffect(() => {
    load();
    kbApi.categories().then(setCategories);
    kbApi.list().then(setAllArticles);
    tagsApi.list().then(setAllTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function patch(data: Parameters<typeof kbApi.update>[1]) {
    await kbApi.update(articleId, data);
    load();
  }

  async function remove() {
    if (!window.confirm("Delete this article?")) return;
    await kbApi.remove(articleId);
    navigate("/kb");
  }

  if (!article) return null;

  return (
    <>
      <Header title="Knowledge Base Article" />
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => titleDraft.trim() && titleDraft !== article.title && patch({ title: titleDraft })}
          className="w-full rounded-lg border-none bg-transparent px-1 text-2xl font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            list="kb-categories"
            defaultValue={article.category ?? ""}
            onBlur={(e) => patch({ category: e.target.value || undefined })}
            placeholder="Category…"
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <datalist id="kb-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          {sourceNote && (
            <Link to={`/notes/${sourceNote.id}`} className="text-xs text-purple-600 underline dark:text-purple-400">
              Source note: {sourceNote.title}
            </Link>
          )}

          <button onClick={remove} className="ml-auto text-xs text-gray-400 hover:text-red-500">
            Delete article
          </button>
        </div>

        <TagPicker allTags={allTags} selectedIds={article.tags.map((t) => t.id)} onChange={(ids) => patch({ tag_ids: ids })} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium uppercase text-gray-400">
              Content ({"use [[Article Title]] to cross-link"})
            </label>
            <button onClick={() => setShowPreview((s) => !s)} className="text-xs font-medium text-blue-600 hover:underline">
              {showPreview ? "Hide" : "Show"} cross-linked preview
            </button>
          </div>
          {recovered && (
            <div
              className="hud-frame mb-2 flex items-center justify-between gap-3 px-3 py-2 text-xs"
              style={{ borderColor: "rgba(251,191,36,0.5)" }}
            >
              <span>Recovered unsaved text from a previous session — it's already in the editor.</span>
              <button onClick={() => setRecovered(false)} className="hud-label shrink-0 hover:text-[var(--accent-via)]">
                Dismiss
              </button>
            </div>
          )}
          <LiveMarkdownEditor value={content} onChange={setContent} onBlur={() => void save.flush()} />
          <div className="mt-2 flex justify-end">
            <SaveStatus state={save.state} />
          </div>
        </div>

        {showPreview && (
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <WikiLinkPreview content={content} articles={allArticles} />
          </div>
        )}

        <FileUploader parent={{ kbArticleId: articleId }} />

        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:underline">
          ← Back
        </button>
      </div>
    </>
  );
}
