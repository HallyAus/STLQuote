import { Card } from "@/components/ui/card";

export default function DesignsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="h-9 w-32 rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="h-32 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-5 w-full rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted" />
          </Card>
        ))}
      </div>
    </div>
  );
}
