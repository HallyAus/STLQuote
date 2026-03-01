"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ArticleFeedback({ slug }: { slug: string }) {
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`learn-feedback:${slug}`);
      if (stored === "yes" || stored === "no") setFeedback(stored);
    } catch {}
  }, [slug]);

  function submit(value: "yes" | "no") {
    setFeedback(value);
    try {
      localStorage.setItem(`learn-feedback:${slug}`, value);
    } catch {}
  }

  if (feedback) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Thanks for your feedback!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {feedback === "yes"
            ? "Glad this article helped."
            : "We'll work on improving this article."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 text-center">
      <p className="text-sm font-medium text-foreground">Was this article helpful?</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={() => submit("yes")}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors",
            "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
          )}
        >
          <ThumbsUp className="h-4 w-4" />
          Yes
        </button>
        <button
          onClick={() => submit("no")}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors",
            "hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
          )}
        >
          <ThumbsDown className="h-4 w-4" />
          No
        </button>
      </div>
    </div>
  );
}
