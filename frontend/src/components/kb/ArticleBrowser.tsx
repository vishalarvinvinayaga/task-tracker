import { Link } from "react-router-dom";
import type { KbArticle } from "../../api/types";

export function ArticleBrowser({ articles }: { articles: KbArticle[] }) {
  const grouped = new Map<string, KbArticle[]>();
  for (const a of articles) {
    const key = a.category ?? "Uncategorized";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{category}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <Link
                key={a.id}
                to={`/kb/${a.id}`}
                className="block rounded-lg glass-card p-4"
              >
                <h3 className="font-medium">{a.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {(a.content_md ?? "").replace(/[#*_`>-]/g, "").slice(0, 140)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {a.tags.map((t) => (
                    <span key={t.id} className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: t.color }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
      {articles.length === 0 && <p className="text-sm text-gray-400">No articles yet.</p>}
    </div>
  );
}
