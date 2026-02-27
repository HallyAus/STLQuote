import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/** Skeleton table rows for list pages (desktop). Shows header + N rows. */
function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <div className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3", i === 0 ? "w-24" : "w-16", i === cols - 1 && "ml-auto")} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={cn("h-4", j === 0 ? "w-20" : j === 1 ? "w-28" : "w-16", j === cols - 1 && "ml-auto")} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Skeleton cards for list pages (mobile). Shows N stacked cards. */
function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mt-3 flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Full list page skeleton with toolbar + table (desktop) + cards (mobile). */
function SkeletonListPage({
  rows = 5,
  cols = 5,
  cards = 3,
}: {
  rows?: number;
  cols?: number;
  cards?: number;
}) {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      {/* Desktop table */}
      <div className="hidden md:block">
        <SkeletonTable rows={rows} cols={cols} />
      </div>
      {/* Mobile cards */}
      <div className="md:hidden">
        <SkeletonCards count={cards} />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonTable, SkeletonCards, SkeletonListPage };
