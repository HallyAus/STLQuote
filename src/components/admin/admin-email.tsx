"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import {
  Send,
  Mail,
  Megaphone,
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: string;
  status: string;
  error: string | null;
  createdAt: string;
}

interface EmailLogsPagination {
  page: number;
  total: number;
  totalPages: number;
}

interface NewsletterCounts {
  all: number;
  active: number;
  admins: number;
}

const EMAIL_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "quote", label: "Quote" },
  { value: "newsletter", label: "Newsletter" },
  { value: "welcome", label: "Welcome" },
  { value: "account_created", label: "Account created" },
  { value: "password_reset", label: "Password reset" },
  { value: "verification", label: "Verification" },
  { value: "notification", label: "Notification" },
  { value: "test", label: "Test" },
];

const AUDIENCE_OPTIONS = (counts: NewsletterCounts) => [
  { value: "all", label: `All users (${counts.all})` },
  { value: "active", label: `Active users (${counts.active})` },
  { value: "admins", label: `Admins only (${counts.admins})` },
];

export function AdminEmail() {
  // --- Test email state ---
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --- Email logs state ---
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogsPagination, setEmailLogsPagination] = useState<EmailLogsPagination>({ page: 1, total: 0, totalPages: 1 });
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogsFilter, setEmailLogsFilter] = useState("all");

  // --- Newsletter state ---
  const [nlCounts, setNlCounts] = useState<NewsletterCounts | null>(null);
  const [nlAudience, setNlAudience] = useState("all");
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --- Fetch email logs ---
  const fetchEmailLogs = useCallback(async (page = 1, type = "all") => {
    setEmailLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/admin/email-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.logs);
        setEmailLogsPagination(data.pagination);
      }
    } catch {
      /* ignore */
    } finally {
      setEmailLogsLoading(false);
    }
  }, []);

  // Fetch email logs on mount
  useEffect(() => {
    fetchEmailLogs(1, emailLogsFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    fetchEmailLogs(1, emailLogsFilter);
  }, [emailLogsFilter, fetchEmailLogs]);

  // --- Fetch newsletter counts on mount ---
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch("/api/admin/newsletter");
        if (res.ok) setNlCounts(await res.json());
      } catch {
        /* ignore */
      }
    }
    fetchCounts();
  }, []);

  // --- Test email handler ---
  async function handleTestEmail(e: React.FormEvent) {
    e.preventDefault();
    setTestEmailLoading(true);
    setTestEmailResult(null);

    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailTo || undefined }),
      });
      const data = await res.json();
      setTestEmailResult({
        ok: res.ok,
        message: res.ok ? data.message : data.error || "Failed to send",
      });
    } catch {
      setTestEmailResult({ ok: false, message: "Something went wrong" });
    } finally {
      setTestEmailLoading(false);
    }
  }

  // --- Newsletter send handler ---
  async function handleSendNewsletter(e: React.FormEvent) {
    e.preventDefault();
    setNlLoading(true);
    setNlResult(null);

    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: nlSubject, html: nlBody, audience: nlAudience }),
      });
      const data = await res.json();
      setNlResult({
        ok: res.ok,
        message: res.ok ? data.message : data.error || "Failed to send",
      });
      if (res.ok) {
        setNlSubject("");
        setNlBody("");
      }
    } catch {
      setNlResult({ ok: false, message: "Something went wrong" });
    } finally {
      setNlLoading(false);
    }
  }

  // --- Status badge helper ---
  function StatusBadge({ status, error }: { status: string; error: string | null }) {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
    if (status === "sent") {
      return (
        <div>
          <span className={cn(base, "bg-success/15 text-success-foreground")}>
            <CheckCircle2 className="h-3 w-3" />
            Sent
          </span>
        </div>
      );
    }
    if (status === "failed") {
      return (
        <div>
          <span className={cn(base, "bg-destructive/15 text-destructive")}>
            <XCircle className="h-3 w-3" />
            Failed
          </span>
          {error && <p className="mt-0.5 text-[11px] text-destructive/80">{error}</p>}
        </div>
      );
    }
    if (status === "skipped") {
      return (
        <div>
          <span className={cn(base, "bg-amber-500/15 text-amber-600 dark:text-amber-400")}>
            <SkipForward className="h-3 w-3" />
            Skipped
          </span>
          {error && <p className="mt-0.5 text-[11px] text-muted-foreground">{error}</p>}
        </div>
      );
    }
    return <span className={cn(base, "bg-muted text-muted-foreground")}>{status}</span>;
  }

  function TypeBadge({ type }: { type: string }) {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {type.replace(/_/g, " ")}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Test Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Send a test email to verify your Resend configuration is working.
            Leave the address blank to send to your admin email.
          </p>
          <form
            onSubmit={(e) => {
              handleTestEmail(e).then(() => fetchEmailLogs(1, emailLogsFilter));
            }}
            className="space-y-4"
          >
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Optional: recipient@example.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={testEmailLoading}>
                {testEmailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send Test
              </Button>
            </div>
            {testEmailResult && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  testEmailResult.ok
                    ? "bg-success/15 text-success-foreground"
                    : "bg-destructive/15 text-destructive"
                )}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {testEmailResult.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* 2. Email Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Email Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                options={EMAIL_TYPE_OPTIONS}
                value={emailLogsFilter}
                onChange={(e) => setEmailLogsFilter(e.target.value)}
                className="h-8 w-40 text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchEmailLogs(emailLogsPagination.page, emailLogsFilter)}
                disabled={emailLogsLoading}
              >
                {emailLogsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {emailLogsLoading && emailLogs.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : emailLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No emails logged yet.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Time</th>
                      <th className="pb-2 pr-4 font-medium">To</th>
                      <th className="pb-2 pr-4 font-medium">Subject</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(log.createdAt)}
                        </td>
                        <td className="py-2 pr-4 truncate max-w-[200px]">{log.to}</td>
                        <td className="py-2 pr-4 truncate max-w-[280px]">{log.subject}</td>
                        <td className="py-2 pr-4">
                          <TypeBadge type={log.type} />
                        </td>
                        <td className="py-2">
                          <StatusBadge status={log.status} error={log.error} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {emailLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{log.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">{log.to}</p>
                      </div>
                      <StatusBadge status={log.status} error={null} />
                    </div>
                    <div className="flex items-center justify-between">
                      <TypeBadge type={log.type} />
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </div>
                    {log.error && log.status === "failed" && (
                      <p className="text-[11px] text-destructive/80">{log.error}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {emailLogsPagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {emailLogsPagination.total} email{emailLogsPagination.total !== 1 ? "s" : ""} total
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchEmailLogs(emailLogsPagination.page - 1, emailLogsFilter)}
                      disabled={emailLogsPagination.page <= 1 || emailLogsLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-muted-foreground tabular-nums">
                      {emailLogsPagination.page} / {emailLogsPagination.totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchEmailLogs(emailLogsPagination.page + 1, emailLogsFilter)}
                      disabled={emailLogsPagination.page >= emailLogsPagination.totalPages || emailLogsLoading}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 3. Newsletter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4" />
            Newsletter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendNewsletter} className="space-y-4">
            {nlCounts && (
              <Select
                label="Audience"
                options={AUDIENCE_OPTIONS(nlCounts)}
                value={nlAudience}
                onChange={(e) => setNlAudience(e.target.value)}
              />
            )}
            <Input
              label="Subject"
              value={nlSubject}
              onChange={(e) => setNlSubject(e.target.value)}
              placeholder="Newsletter subject line"
              required
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Body (HTML)
              </label>
              <textarea
                className={cn(
                  "flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                value={nlBody}
                onChange={(e) => setNlBody(e.target.value)}
                placeholder="<h1>Hello!</h1><p>Your newsletter content here...</p>"
                required
              />
              <p className="text-xs text-muted-foreground">
                Write HTML directly. The email will be wrapped in a standard Printforge template.
              </p>
            </div>
            <Button type="submit" disabled={nlLoading || !nlSubject || !nlBody}>
              {nlLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send to {nlAudience === "admins" ? "admins" : nlAudience === "active" ? "active users" : "all users"}
            </Button>
            {nlResult && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                  nlResult.ok
                    ? "bg-success/15 text-success-foreground"
                    : "bg-destructive/15 text-destructive"
                )}
              >
                {nlResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {nlResult.message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
