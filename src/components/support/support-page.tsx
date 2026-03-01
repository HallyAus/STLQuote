"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SkeletonListPage } from "@/components/ui/skeleton";
import {
  Plus,
  Loader2,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Thread {
  id: string;
  subject: string;
  status: string;
  priority: string;
  lastReplyAt: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  _count: { messages: number };
  messages: { content: string; isStaffReply: boolean; createdAt: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; variant: string; icon: React.ElementType }> = {
  open: { label: "Open", variant: "warning", icon: AlertCircle },
  resolved: { label: "Resolved", variant: "success", icon: CheckCircle2 },
  closed: { label: "Closed", variant: "default", icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; colour: string }> = {
  low: { label: "Low", colour: "text-muted-foreground" },
  normal: { label: "Normal", colour: "text-foreground" },
  high: { label: "High", colour: "text-orange-500" },
  urgent: { label: "Urgent", colour: "text-red-500 font-semibold" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function SupportPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/threads?status=${filter}`);
      if (res.ok) setThreads(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  async function handleCreate() {
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/support/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });
      if (res.ok) {
        const thread = await res.json();
        setShowNew(false);
        setSubject("");
        setMessage("");
        setPriority("normal");
        router.push(`/support/${thread.id}`);
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  }

  const openCount = threads.filter((t) => t.status === "open").length;
  const resolvedCount = threads.filter((t) => t.status === "resolved").length;

  if (loading) return <SkeletonListPage />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setLoading(true); }}
            options={[
              { value: "all", label: "All threads" },
              { value: "open", label: `Open (${openCount})` },
              { value: "resolved", label: `Resolved (${resolvedCount})` },
              { value: "closed", label: "Closed" },
            ]}
            className="w-44"
          />
          <span className="text-sm text-muted-foreground">
            {threads.length} thread{threads.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Empty state */}
      {threads.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No support messages yet. Need help? Send us a message!"
                : "No threads match this filter."}
            </p>
            {filter === "all" && (
              <Button variant="secondary" className="mt-2" onClick={() => setShowNew(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Send a Message
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Thread list */}
      {threads.length > 0 && (
        <div className="space-y-2">
          {threads.map((thread) => {
            const statusCfg = STATUS_CONFIG[thread.status] || STATUS_CONFIG.open;
            const priorityCfg = PRIORITY_CONFIG[thread.priority] || PRIORITY_CONFIG.normal;
            const lastMsg = thread.messages[0];
            const StatusIcon = statusCfg.icon;

            return (
              <Card
                key={thread.id}
                className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm"
                onClick={() => router.push(`/support/${thread.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 shrink-0 ${
                          thread.status === "open" ? "text-amber-500" :
                          thread.status === "resolved" ? "text-emerald-500" : "text-muted-foreground"
                        }`} />
                        <h3 className="truncate text-sm font-semibold">{thread.subject}</h3>
                        {thread.priority !== "normal" && (
                          <span className={`text-[10px] font-bold uppercase ${priorityCfg.colour}`}>
                            {priorityCfg.label}
                          </span>
                        )}
                      </div>
                      {lastMsg && (
                        <p className="mt-1 truncate text-xs text-muted-foreground pl-6">
                          {lastMsg.isStaffReply ? "Staff: " : "You: "}
                          {lastMsg.content.slice(0, 120)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={statusCfg.variant as "warning" | "success" | "default"}>
                        {statusCfg.label}
                      </Badge>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(thread.lastReplyAt)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {thread._count.messages} message{thread._count.messages !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New thread modal */}
      {showNew && (
        <Dialog open={true} onClose={() => setShowNew(false)} maxWidth="max-w-lg">
          <DialogHeader onClose={() => setShowNew(false)}>
            <DialogTitle>New Support Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              autoFocus
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: "low", label: "Low" },
                { value: "normal", label: "Normal" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
              ]}
            />
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !subject.trim() || !message.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Message"
              )}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
