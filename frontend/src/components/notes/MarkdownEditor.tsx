import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { useDarkMode } from "../../hooks/useDarkMode";

export function MarkdownEditor({ value, onChange, height = 320 }: { value: string; onChange: (v: string) => void; height?: number }) {
  const [dark] = useDarkMode();
  return (
    <div data-color-mode={dark ? "dark" : "light"}>
      <MDEditor value={value} onChange={(v) => onChange(v ?? "")} height={height} preview="live" />
    </div>
  );
}
