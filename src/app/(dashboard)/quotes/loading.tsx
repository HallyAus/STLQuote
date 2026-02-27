import { Card } from "@/components/ui/card";

export default function QuotesLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="h-9 w-32 rounded bg-muted" />
      </div>
      <Card className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-40 rounded bg-muted flex-1" />
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </Card>
    </div>
  );
}
