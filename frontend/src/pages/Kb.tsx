import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { ArticleBrowser } from "../components/kb/ArticleBrowser";
import { kbApi } from "../api/kb";
import type { KbArticle, KbSearchResult } from "../api/types";

export function Kb() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KbSearchResult[] | null>(null);

  function load() {
    kbApi.list({ category: category || undefined }).then(setArticles);
    kbApi.categories().then(setCategories);
  }

  useEffect(load, [category]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => kbApi.search(query).then(setSearchResults), 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function createArticle() {
    const article = await kbApi.create({ title: "Untitled article" });
    navigate(`/kb/${article.id}`);
  }

  return (
    <>
      <Header title="Knowledge Base" />
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search KB…"
            className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={createArticle} className="ml-auto rounded-lg btn-primary px-4 py-2 text-sm font-medium text-white">
            New Article
          </button>
        </div>

        {searchResults ? (
          <div className="space-y-2">
            <p className="text-xs uppercase text-gray-400">{searchResults.length} search result(s)</p>
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/kb/${r.id}`)}
                className="block w-full rounded-lg glass-card p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.title}</h3>
                  {r.category && <span className="text-xs text-gray-400">{r.category}</span>}
                </div>
                <p
                  className="mt-1 text-sm text-gray-500 dark:text-gray-400 [&_b]:text-blue-600 dark:[&_b]:text-blue-400"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              </button>
            ))}
          </div>
        ) : (
          <ArticleBrowser articles={articles} />
        )}
      </div>
    </>
  );
}
