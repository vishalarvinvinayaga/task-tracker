import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { MarkdownEditor } from "../components/notes/MarkdownEditor";
import { WikiLinkPreview } from "../components/kb/WikiLinkPreview";
import { TagPicker } from "../components/shared/TagPicker";
import { FileUploader } from "../components/shared/FileUploader";
import { kbApi } from "../api/kb";
import { tagsApi } from "../api/tags";
import { notesApi } from "../api/notes";
import { useToast } from "../hooks/useToast";
import type { KbArticle, Note, Tag } from "../api/types";

export function KbArticlePage() {
  const { id } = useParams();
  const articleId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [article, setArticle] = useState<KbArticle | null>(null);
  const [content, setContent] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allArticles, setAllArticles] = useState<KbArticle[]>([]);
  const [sourceNote, setSourceNote] = useState<Note | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function load() {
    kbApi.get(articleId).then((a) => {
      setArticle(a);
      setContent(a.content_md ?? "");
      setTitleDraft(a.title);
      if (a.source_note_id) notesApi.get(a.source_note_id).then(setSourceNote);
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
          <div
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                patch({ content_md: content }).then(() => toast.show("Article saved"));
              }
            }}
          >
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => patch({ content_md: content }).then(() => toast.show("Article saved"))}
              className="rounded-lg btn-primary px-4 py-2 text-sm font-medium text-white"
            >
              Save content <span className="ml-1 text-xs opacity-70">⌘⏎</span>
            </button>
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
