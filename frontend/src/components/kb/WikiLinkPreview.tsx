import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import type { KbArticle } from "../../api/types";

export function WikiLinkPreview({ content, articles }: { content: string; articles: KbArticle[] }) {
  const navigate = useNavigate();

  const resolved = useMemo(() => {
    const byTitle = new Map(articles.map((a) => [a.title.toLowerCase(), a.id]));
    return content.replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => {
      const id = byTitle.get(title.trim().toLowerCase());
      return id ? `[${title}](#kb-${id})` : `**${title}** *(no matching article)*`;
    });
  }, [content, articles]);

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#kb-")) {
              const id = href.replace("#kb-", "");
              return (
                <button
                  type="button"
                  onClick={() => navigate(`/kb/${id}`)}
                  className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {resolved}
      </ReactMarkdown>
    </div>
  );
}
