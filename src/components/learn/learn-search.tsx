"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { LEARN_CATEGORIES } from "@/lib/learn-articles";
import { ArticleCard } from "./article-card";
import type { LearnArticle, ArticleCategory, ArticleDifficulty } from "@/lib/learn-articles";

function LearnSearchInner({ articles }: { articles: LearnArticle[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") ?? "";
  const initialDifficulty = searchParams.get("difficulty") ?? "";
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [difficulty, setDifficulty] = useState(initialDifficulty);

  const updateParams = useCallback(
    (q: string, cat: string, diff: string) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      if (diff) params.set("difficulty", diff);
      const qs = params.toString();
      router.replace(`/learn${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  const filtered = useMemo(() => {
    let result = articles;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (category) {
      result = result.filter((a) => a.category === category);
    }
    if (difficulty) {
      result = result.filter((a) => a.difficulty === difficulty);
    }
    return result;
  }, [articles, query, category, difficulty]);

  return (
    <div>
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateParams(e.target.value, category, difficulty);
            }}
            placeholder="Search articles..."
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            updateParams(query, e.target.value, difficulty);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All categories</option>
          {LEARN_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            updateParams(query, category, e.target.value);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Result count */}
      <p className="mt-4 text-xs text-muted-foreground">
        Showing {filtered.length} {filtered.length === 1 ? "article" : "articles"}
        {category && ` in ${LEARN_CATEGORIES.find((c) => c.slug === category)?.label ?? category}`}
        {difficulty && ` · ${difficulty}`}
      </p>

      {/* Article grid */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-center">
          <p className="text-sm font-medium text-foreground">No articles found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term or clear your filters.
          </p>
        </div>
      )}
    </div>
  );
}

export function LearnSearch({ articles }: { articles: LearnArticle[] }) {
  return (
    <Suspense>
      <LearnSearchInner articles={articles} />
    </Suspense>
  );
}
