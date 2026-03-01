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
  Zap,
  RotateCcw,
  Power,
  PowerOff,
  MailCheck,
  MailX,
  TrendingUp,
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

interface EmailStats {
  totalAll: number;
  sentToday: number;
  failedToday: number;
}

interface DripUser {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  emailsSent: number;
  totalEmails: number;
  lastSentAt: string | null;
  lastSentKey: string | null;
  unsubscribed: boolean;
}

interface DripPagination {
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
  { value: "drip", label: "Drip" },
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

  // --- Drip emails state ---
  const [dripUsers, setDripUsers] = useState<DripUser[]>([]);
  const [dripPagination, setDripPagination] = useState<DripPagination>({ page: 1, total: 0, totalPages: 1 });
  const [dripLoading, setDripLoading] = useState(false);
  const [dripEnabled, setDripEnabled] = useState(true);
  const [dripToggling, setDripToggling] = useState(false);
  const [dripTriggeringId, setDripTriggeringId] = useState<string | null>(null);
  const [dripResettingId, setDripResettingId] = useState<string | null>(null);
  const [dripResult, setDripResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --- Email logs state ---
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [emailLogsPagination, setEmailLogsPagination] = useState<EmailLogsPagination>({ page: 1, total: 0, totalPages: 1 });
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);
  const [emailLogsFilter, setEmailLogsFilter] = useState("all");
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);

  // --- Newsletter state ---
  const [nlCounts, setNlCounts] = useState<NewsletterCounts | null>(null);
  const [nlAudience, setNlAudience] = useState("all");
  const [nlSubject, setNlSubject] = useState("");
  const [nlBody, setNlBody] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<{ ok: boolean; message: string } | null>(null);

  // --- Fetch drip emails ---
  const fetchDripEmails = useCallback(async (page = 1) => {
    setDripLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      const res = await fetch(`/api/admin/drip-emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDripUsers(data.users);
        setDripPagination(data.pagination);
        setDripEnabled(data.enabled);
      }
    } catch {
      /* ignore */
    } finally {
      setDripLoading(false);
    }
  }, []);

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
        if (data.stats) setEmailStats(data.stats);
      }
    } catch {
      /* ignore */
    } finally {
      setEmailLogsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchDripEmails(1);
    fetchEmailLogs(1, emailLogsFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch logs when filter changes
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

  // --- Drip toggle handler ---
  async function handleDripToggle() {
    setDripToggling(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "dripEmailsEnabled", value: dripEnabled ? "false" : "true" }),
      });
      if (res.ok) {
        setDripEnabled(!dripEnabled);
      }
    } catch {
      /* ignore */
    } finally {
      setDripToggling(false);
    }
  }

  // --- Drip trigger handler ---
  async function handleDripTrigger(userId: string) {
    setDripTriggeringId(userId);
    setDripResult(null);

    try {
      const res = await fetch("/api/admin/drip-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.sent) {
        setDripResult({ ok: true, message: `Sent "${data.subject}" (${data.emailKey})` });
        fetchDripEmails(dripPagination.page);
        fetchEmailLogs(1, emailLogsFilter);
      } else if (res.ok && !data.sent) {
        const reasons: Record<string, string> = {
          all_sent: "All drip emails already sent",
          no_email: "User has no email address",
          unsubscribed: "User has unsubscribed",
          send_failed: "Email delivery failed",
        };
        setDripResult({ ok: false, message: reasons[data.reason] || "Could not send" });
      } else {
        setDripResult({ ok: false, message: data.error || "Failed to trigger" });
      }
    } catch {
      setDripResult({ ok: false, message: "Something went wrong" });
    } finally {
      setDripTriggeringId(null);
    }
  }

  // --- Drip reset handler ---
  async function handleDripReset(userId: string, userName: string | null) {
    if (!confirm(`Reset drip emails for ${userName || "this user"}? This will delete all sent records and they'll start from Day 0.`)) return;

    setDripResettingId(userId);
    setDripResult(null);

    try {
      const res = await fetch(`/api/admin/drip-emails/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setDripResult({ ok: true, message: `Reset ${data.deleted} drip email record${data.deleted !== 1 ? "s" : ""}` });
        fetchDripEmails(dripPagination.page);
      } else {
        setDripResult({ ok: false, message: data.error || "Failed to reset" });
      }
    } catch {
      setDripResult({ ok: false, message: "Something went wrong" });
    } finally {
      setDripResettingId(null);
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

  function DripProgressBadge({ sent, total, unsubscribed }: { sent: number; total: number; unsubscribed: boolean }) {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
    if (unsubscribed) {
      return <span className={cn(base, "bg-muted text-muted-foreground")}>Unsubscribed</span>;
    }
    if (sent === 0) {
      return <span className={cn(base, "bg-muted text-muted-foreground")}>Not started</span>;
    }
    if (sent >= total) {
      return (
        <span className={cn(base, "bg-success/15 text-success-foreground")}>
          <CheckCircle2 className="h-3 w-3" />
          Complete
        </span>
      );
    }
    return (
      <span className={cn(base, "bg-blue-500/15 text-blue-600 dark:text-blue-400")}>
        {sent} / {total}
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
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Input
                type="email"
                placeholder="Optional: recipient@example.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={testEmailLoading} className="shrink-0">
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

      {/* 2. Drip Emails */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Drip Emails
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={dripEnabled ? "primary" : "secondary"}
                size="sm"
                onClick={handleDripToggle}
                disabled={dripToggling}
                className="gap-1.5"
              >
                {dripToggling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : dripEnabled ? (
                  <Power className="h-3.5 w-3.5" />
                ) : (
                  <PowerOff className="h-3.5 w-3.5" />
                )}
                {dripEnabled ? "Enabled" : "Disabled"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchDripEmails(dripPagination.page)}
                disabled={dripLoading}
              >
                {dripLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            8-email onboarding sequence sent over 7 days after signup. Use &ldquo;Send Next&rdquo; to manually trigger the next email for a user.
          </p>

          {dripResult && (
            <div
              className={cn(
                "mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                dripResult.ok
                  ? "bg-success/15 text-success-foreground"
                  : "bg-destructive/15 text-destructive"
              )}
            >
              {dripResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {dripResult.message}
            </div>
          )}

          {dripLoading && dripUsers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dripUsers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">User</th>
                      <th className="pb-2 pr-4 font-medium">Signed Up</th>
                      <th className="pb-2 pr-4 font-medium">Progress</th>
                      <th className="pb-2 pr-4 font-medium">Last Sent</th>
                      <th className="pb-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dripUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4">
                          <p className="font-medium truncate max-w-[180px]">{user.name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(user.createdAt)}
                        </td>
                        <td className="py-2 pr-4">
                          <DripProgressBadge sent={user.emailsSent} total={user.totalEmails} unsubscribed={user.unsubscribed} />
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                          {user.lastSentAt ? formatRelativeTime(user.lastSentAt) : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDripTrigger(user.id)}
                              disabled={dripTriggeringId === user.id || user.emailsSent >= user.totalEmails || user.unsubscribed}
                              title="Send next drip email"
                              className="h-7 px-2 text-xs"
                            >
                              {dripTriggeringId === user.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="mr-1 h-3 w-3" />
                              )}
                              Send Next
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDripReset(user.id, user.name)}
                              disabled={dripResettingId === user.id || user.emailsSent === 0}
                              title="Reset drip sequence"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            >
                              {dripResettingId === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {dripUsers.map((user) => (
                  <div key={user.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DripProgressBadge sent={user.emailsSent} total={user.totalEmails} unsubscribed={user.unsubscribed} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Signed up {formatRelativeTime(user.createdAt)}
                        {user.lastSentAt && ` · Last sent ${formatRelativeTime(user.lastSentAt)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDripTrigger(user.id)}
                        disabled={dripTriggeringId === user.id || user.emailsSent >= user.totalEmails || user.unsubscribed}
                        className="h-7 flex-1 text-xs"
                      >
                        {dripTriggeringId === user.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="mr-1 h-3 w-3" />
                        )}
                        Send Next
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDripReset(user.id, user.name)}
                        disabled={dripResettingId === user.id || user.emailsSent === 0}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        {dripResettingId === user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {dripPagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {dripPagination.total} user{dripPagination.total !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchDripEmails(dripPagination.page - 1)}
                      disabled={dripPagination.page <= 1 || dripLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-muted-foreground tabular-nums">
                      {dripPagination.page} / {dripPagination.totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchDripEmails(dripPagination.page + 1)}
                      disabled={dripPagination.page >= dripPagination.totalPages || dripLoading}
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

      {/* 3. Email Log */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Email Log
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                options={EMAIL_TYPE_OPTIONS}
                value={emailLogsFilter}
                onChange={(e) => setEmailLogsFilter(e.target.value)}
                className="h-8 flex-1 sm:flex-none sm:w-40 text-xs"
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
          {/* Stats banner */}
          {emailStats && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold tabular-nums">{emailStats.totalAll.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Total sent</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2">
                <MailCheck className="h-4 w-4 text-success-foreground" />
                <div>
                  <p className="text-lg font-semibold tabular-nums">{emailStats.sentToday}</p>
                  <p className="text-[11px] text-muted-foreground">Sent today</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
                <MailX className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-lg font-semibold tabular-nums">{emailStats.failedToday}</p>
                  <p className="text-[11px] text-muted-foreground">Failed today</p>
                </div>
              </div>
            </div>
          )}

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

      {/* 4. Newsletter */}
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
