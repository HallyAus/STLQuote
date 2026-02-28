"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, Check, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { WaitlistEntry } from "./admin-types";

export function AdminWaitlist() {
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistActionLoading, setWaitlistActionLoading] = useState<string | null>(null);

  const fetchWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) {
        const data = await res.json();
        setWaitlistEntries(data);
      }
    } catch {
      /* ignore */
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  async function handleWaitlistApprove(id: string) {
    setWaitlistActionLoading(id + "-approve");
    try {
      const res = await fetch(`/api/waitlist/${id}/approve`, { method: "POST" });
      if (res.ok) {
        fetchWaitlist();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setWaitlistActionLoading(null);
    }
  }

  async function handleWaitlistReject(id: string) {
    setWaitlistActionLoading(id + "-reject");
    try {
      const res = await fetch(`/api/waitlist/${id}/reject`, { method: "POST" });
      if (res.ok) {
        fetchWaitlist();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reject");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setWaitlistActionLoading(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Waitlist
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchWaitlist()}
            disabled={waitlistLoading}
          >
            {waitlistLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {waitlistLoading && waitlistEntries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : waitlistEntries.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No waitlist entries yet.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{entry.name}</span>
                        {entry.businessName && (
                          <span className="block text-xs text-muted-foreground">{entry.businessName}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{entry.email}</td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(entry.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            entry.status === "pending"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : entry.status === "approved"
                                ? "bg-success/15 text-success-foreground"
                                : "bg-destructive/10 text-destructive-foreground"
                          )}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {entry.status === "pending" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleWaitlistApprove(entry.id)}
                              disabled={waitlistActionLoading === entry.id + "-approve"}
                              title="Approve"
                              className="text-success-foreground hover:text-success-foreground"
                            >
                              {waitlistActionLoading === entry.id + "-approve" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleWaitlistReject(entry.id)}
                              disabled={waitlistActionLoading === entry.id + "-reject"}
                              title="Reject"
                              className="text-destructive-foreground hover:text-destructive-foreground"
                            >
                              {waitlistActionLoading === entry.id + "-reject" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground px-2">
                            {entry.status === "approved" ? "Approved" : "Rejected"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {waitlistEntries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(entry.name || entry.email)?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{entry.name}</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                          entry.status === "pending"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : entry.status === "approved"
                              ? "bg-success/15 text-success-foreground"
                              : "bg-destructive/10 text-destructive-foreground"
                        )}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{entry.email}</div>
                    {entry.businessName && (
                      <div className="text-xs text-muted-foreground">{entry.businessName}</div>
                    )}
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {formatRelativeTime(entry.createdAt)}
                    </div>
                  </div>
                  {entry.status === "pending" && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleWaitlistApprove(entry.id)}
                        disabled={waitlistActionLoading === entry.id + "-approve"}
                        title="Approve"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/10"
                      >
                        {waitlistActionLoading === entry.id + "-approve" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleWaitlistReject(entry.id)}
                        disabled={waitlistActionLoading === entry.id + "-reject"}
                        title="Reject"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {waitlistActionLoading === entry.id + "-reject" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
