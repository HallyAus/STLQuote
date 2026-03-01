import { cn } from "@/lib/utils";
import type { ArticleDifficulty } from "@/lib/learn-articles";

const CONFIG: Record<ArticleDifficulty, { label: string; className: string }> = {
  beginner: { label: "Beginner", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  intermediate: { label: "Intermediate", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  advanced: { label: "Advanced", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export function DifficultyBadge({ difficulty, className }: { difficulty: ArticleDifficulty; className?: string }) {
  const c = CONFIG[difficulty];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", c.className, className)}>
      {c.label}
    </span>
  );
}
