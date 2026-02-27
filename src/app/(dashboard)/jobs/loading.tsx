export default function JobsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-9 w-48 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded bg-muted" />
          <div className="h-9 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-[280px] space-y-3">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-28 rounded-lg bg-muted" />
            <div className="h-28 rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
