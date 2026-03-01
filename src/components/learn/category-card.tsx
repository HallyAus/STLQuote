import Link from "next/link";
import {
  Rocket, Calculator, FileText, Users, Briefcase,
  Palette, Receipt, Plug, Sparkles, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearnCategory } from "@/lib/learn-articles";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket, Calculator, FileText, Users, Briefcase,
  Palette, Receipt, Plug, Sparkles, TrendingUp,
};

const BG_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/15",
  emerald: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/15",
  violet: "bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/15",
  amber: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/15",
  orange: "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/15",
  pink: "bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/15",
  green: "bg-green-500/10 text-green-500 group-hover:bg-green-500/15",
  cyan: "bg-cyan-500/10 text-cyan-500 group-hover:bg-cyan-500/15",
  purple: "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/15",
  rose: "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/15",
};

export function CategoryCard({ category, articleCount }: { category: LearnCategory; articleCount: number }) {
  const Icon = ICON_MAP[category.icon] ?? Rocket;
  const bg = BG_MAP[category.colour] ?? BG_MAP.blue;

  return (
    <Link
      href={`/learn?category=${category.slug}`}
      className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 transition-all hover:border-border hover:shadow-md"
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors", bg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {category.label}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {category.description}
        </p>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground/60">
          {articleCount} {articleCount === 1 ? "article" : "articles"}
        </p>
      </div>
    </Link>
  );
}
