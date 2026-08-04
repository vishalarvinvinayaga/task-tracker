import { useNavigate } from "react-router-dom";
import { notesApi } from "../../api/notes";

export function PromoteToKB({ noteId }: { noteId: number }) {
  const navigate = useNavigate();

  async function promote() {
    const category = window.prompt("Category for this KB article (optional):") ?? undefined;
    const article = await notesApi.promote(noteId, category || undefined);
    navigate(`/kb/${article.id}`);
  }

  return (
    <button
      onClick={promote}
      className="rounded-lg border border-purple-300 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
    >
      Promote to KB
    </button>
  );
}
