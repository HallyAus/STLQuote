"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, Eye, FileText, Copy, Plus, Pencil, Trash2, CheckCircle, XCircle, ArrowRightLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuoteEvent {
  id: string;
  action: string;
  detail: string | null;
  actorId: string | null;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Mail; colour: string }> = {
  created:           { label: "Created",        icon: Plus,           colour: "bg-info" },
  emailed:           { label: "Emailed",        icon: Mail,           colour: "bg-info" },
  viewed:            { label: "Viewed",         icon: Eye,            colour: "bg-muted-foreground" },
  status_changed:    { label: "Status Changed", icon: ArrowRightLeft, colour: "bg-warning" },
  accepted:          { label: "Accepted",       icon: CheckCircle,    colour: "bg-success" },
  rejected:          { label: "Rejected",       icon: XCircle,        colour: "bg-destructive" },
  line_item_added:   { label: "Item Added",     icon: Plus,           colour: "bg-info" },
  line_item_updated: { label: "Item Updated",   icon: Pencil,         colour: "bg-muted-foreground" },
  line_item_removed: { label: "Item Removed",   icon: Trash2,         colour: "bg-warning" },
  duplicated:        { label: "Duplicated",     icon: Copy,           colour: "bg-info" },
  pdf_downloaded:    { label: "PDF Downloaded",  icon: FileText,       colour: "bg-muted-foreground" },
};

const DEFAULT_CONFIG = { label: "Event", icon: Clock, colour: "bg-muted-foreground" };

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateStr);
}

export function QuoteTimeline({ quoteId }: { quoteId: string }) {
  const [events, setEvents] = useState<QuoteEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch(`/api/quotes/${quoteId}/events`);
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
  }, [quoteId]);

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
        No activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, idx) => {
        const config = ACTION_CONFIG[event.action] || DEFAULT_CONFIG;
        const Icon = config.icon;
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5",
                  config.colour + "/20"
                )}
              >
                <Icon className={cn("h-3 w-3", config.colour.replace("bg-", "text-"))} />
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>

            {/* Content */}
            <div className="pb-4 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {config.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {relativeTime(event.createdAt)}
                </span>
              </div>
              {event.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
