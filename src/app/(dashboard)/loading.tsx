import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="h-4 w-24 rounded bg-muted mb-3" />
            <div className="h-8 w-16 rounded bg-muted" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6"><div className="h-64 rounded bg-muted" /></Card>
        <Card className="p-6"><div className="h-64 rounded bg-muted" /></Card>
      </div>
    </div>
  );
}
