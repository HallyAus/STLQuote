"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  XCircle,
  User,
  Shield,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  isStaffReply: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

interface Thread {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  messages: Message[];
}

const STATUS_MAP: Record<string, { label: string; variant: string; icon: React.ElementType }> = {
  open: { label: "Open", variant: "warning", icon: AlertCircle },
  resolved: { label: "Resolved", variant: "success", icon: CheckCircle2 },
  closed: { label: "Closed", variant: "default", icon: XCircle },
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (sameDay) {
    return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SupportThread({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchThread = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/threads/${threadId}`);
      if (res.ok) {
        setThread(await res.json());
      } else {
        router.push("/support");
      }
    } catch {
      router.push("/support");
    } finally {
      setLoading(false);
    }
  }, [threadId, router]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  // Poll for new messages every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchThread, 15000);
    return () => clearInterval(interval);
  }, [fetchThread]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      if (res.ok) {
        const msg = await res.json();
        setThread((prev) =>
          prev ? { ...prev, messages: [...prev.messages, msg], status: prev.status === "resolved" ? "open" : prev.status } : prev
        );
        setReply("");
        textareaRef.current?.focus();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/support/threads/${threadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setThread((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch {
      // ignore
    } finally {
      setUpdating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) return null;

  const statusCfg = STATUS_MAP[thread.status] || STATUS_MAP.open;
  const isClosed = thread.status === "closed";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => router.push("/support")}
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Support
          </button>
          <h1 className="text-lg font-bold leading-tight">{thread.subject}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Started {formatTime(thread.createdAt)}
            {thread.priority !== "normal" && (
              <span className={`ml-2 font-semibold uppercase ${
                thread.priority === "urgent" ? "text-red-500" :
                thread.priority === "high" ? "text-orange-500" : "text-muted-foreground"
              }`}>
                {thread.priority}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusCfg.variant as "warning" | "success" | "default"}>
            {statusCfg.label}
          </Badge>
          {thread.status === "open" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange("resolved")}
              disabled={updating}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Resolve
            </Button>
          )}
          {thread.status === "resolved" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange("closed")}
              disabled={updating}
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {thread.messages.map((msg) => {
          const isStaff = msg.isStaffReply;
          return (
            <div
              key={msg.id}
              className={`flex ${isStaff ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                isStaff
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted border border-border"
              }`}>
                <div className="mb-1 flex items-center gap-1.5">
                  {isStaff ? (
                    <Shield className="h-3 w-3 text-primary" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={`text-[11px] font-medium ${isStaff ? "text-primary" : "text-muted-foreground"}`}>
                    {msg.author.name || msg.author.email || "Unknown"}
                    {isStaff && " (Printforge)"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply box */}
      {!isClosed ? (
        <Card>
          <CardContent className="p-4">
            <Textarea
              ref={textareaRef}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reply..."
              rows={3}
              disabled={sending}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Ctrl+Enter to send
              </span>
              <Button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                size="sm"
              >
                {sending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-3.5 w-3.5" />
                )}
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            This conversation is closed. Need more help?{" "}
            <button
              onClick={() => handleStatusChange("open")}
              className="font-medium text-primary hover:underline"
            >
              Reopen it
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
