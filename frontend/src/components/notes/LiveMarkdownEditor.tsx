import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";

/**
 * Obsidian-style editing: one surface, no preview pane. Markdown shorthand
 * transforms as you type — `# ` becomes a heading, `- ` a bullet, `> ` a quote,
 * `**bold**` bolds — via ProseMirror input rules.
 *
 * Storage stays markdown (`content_md`), so full-text search, KB promotion and
 * the MCP tools are all unaffected by the editor swap.
 */
export function LiveMarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Start writing… '# ' for a heading, '- ' for a list",
  minHeight = 320,
  editable = true,
}: {
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: number;
  editable?: boolean;
}) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: { HTMLAttributes: { class: "hud-mono" } },
        // StarterKit v3 bundles Link; configure it here rather than adding a
        // second copy, which triggers a duplicate-extension warning.
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({
        html: false,          // markdown in, markdown out — no raw HTML round-trip
        linkify: true,
        breaks: true,
        transformPastedText: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.storage.markdown.getMarkdown()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: "tiptap-surface focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
  });

  // Adopt content loaded from the server, but never clobber what's being typed.
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (value !== current && !editor.isFocused) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  return (
    <div className="hud-frame px-4 py-3" style={{ ["--hud-notch" as string]: "8px" }}>
      <EditorContent editor={editor} />
    </div>
  );
}
