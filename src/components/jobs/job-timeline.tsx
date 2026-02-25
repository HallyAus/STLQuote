"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { JOB_STATUS, type JobStatus } from "@/lib/status-colours";
import { cn } from "@/lib/utils";

interface JobEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  notes: string | null;
  createdAt: string;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JobTimeline({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/events`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-3">
        No timeline events yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const statusConfig = JOB_STATUS[event.toStatus as JobStatus];
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full mt-1.5 shrink-0",
                  statusConfig?.dotColour || "bg-muted-foreground"
                )}
              />
              {!isLast && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {statusConfig?.label || event.toStatus}
                </span>
                {event.fromStatus && (
                  <span className="text-[10px] text-muted-foreground">
                    from {JOB_STATUS[event.fromStatus as JobStatus]?.label || event.fromStatus}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </p>
              {event.notes && (
                <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
