import Link from "next/link";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyBadge } from "./difficulty-badge";
import { LEARN_CATEGORIES } from "@/lib/learn-articles";
import type { LearnArticle } from "@/lib/learn-articles";

const TIER_LABEL: Record<string, { text: string; className: string }> = {
  starter: { text: "Starter", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  pro: { text: "Pro", className: "bg-primary/10 text-primary" },
  scale: { text: "Scale", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

const COLOUR_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  green: "bg-green-500/10 text-green-600 dark:text-green-400",
  cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function ArticleCard({ article }: { article: LearnArticle }) {
  const cat = LEARN_CATEGORIES.find((c) => c.slug === article.category);
  const catColour = cat ? COLOUR_MAP[cat.colour] ?? "" : "";

  return (
    <Link
      href={`/learn/${article.slug}`}
      className="group flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-md"
    >
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2">
        {cat && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", catColour)}>
            {cat.label}
          </span>
        )}
        <DifficultyBadge difficulty={article.difficulty} />
        {article.tier && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", TIER_LABEL[article.tier]?.className)}>
            {TIER_LABEL[article.tier]?.text}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-3 text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
        {article.title}
      </h3>

      {/* Excerpt */}
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
        {article.excerpt}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {article.readingTime} min read
        </span>
      </div>
    </Link>
  );
}
