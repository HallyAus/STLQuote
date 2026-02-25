"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Phone, Mail, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

interface Interaction {
  id: string;
  type: string;
  content: string;
  createdAt: string;
}

const INTERACTION_TYPES = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
];

const TYPE_CONFIG: Record<string, {
  icon: typeof MessageSquare;
  colour: string;
  bg: string;
  label: string;
}> = {
  note: {
    icon: MessageSquare,
    colour: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Note",
  },
  call: {
    icon: Phone,
    colour: "text-green-500",
    bg: "bg-green-500/10",
    label: "Call",
  },
  email: {
    icon: Mail,
    colour: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "Email",
  },
  meeting: {
    icon: Users,
    colour: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Meeting",
  },
};

export function InteractionTimeline({ clientId }: { clientId: string }) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState("note");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchInteractions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/clients/${clientId}/interactions`);
      if (!res.ok) throw new Error("Failed to fetch interactions");
      const data: Interaction[] = await res.json();
      setInteractions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`/api/clients/${clientId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content: content.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to add interaction");
      }

      setContent("");
      setType("note");
      await fetchInteractions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add interaction form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <div className="w-36 shrink-0">
              <Select
                options={INTERACTION_TYPES}
                value={type}
                onChange={(e) => setType(e.target.value)}
              />
            </div>
            <div className="flex-1" />
          </div>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note, log a call, email, or meeting..."
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !content.trim()}
            >
              {submitting ? (
                "Saving..."
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Add {INTERACTION_TYPES.find((t) => t.value === type)?.label ?? "Note"}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading interactions...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && interactions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1 py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No interactions yet.</p>
          </div>
        )}

        {/* Timeline */}
        {!loading && interactions.length > 0 && (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {interactions.map((interaction) => {
                const config = TYPE_CONFIG[interaction.type] ?? TYPE_CONFIG.note;
                const Icon = config.icon;

                return (
                  <div key={interaction.id} className="relative flex gap-3 pl-1">
                    {/* Icon dot */}
                    <div
                      className={cn(
                        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        config.bg
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", config.colour)} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            config.bg,
                            config.colour
                          )}
                        >
                          {config.label}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(interaction.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                        {interaction.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
