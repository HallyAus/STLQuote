"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  GitCommit,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

interface DeployRecord {
  timestamp: string;
  fromHash: string;
  toHash: string;
  success: boolean;
  startedAt: string;
  endedAt: string;
  commits: string[];
  dockerOutput: string;
}

export function DeployLogs() {
  const [deploys, setDeploys] = useState<DeployRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeploys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/deploys?limit=50");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDeploys(data.deploys);
    } catch (error) {
      console.error("Failed to fetch deploys:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeploys();
  }, [fetchDeploys]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDeploys, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDeploys]);

  function handleRefresh() {
    setRefreshing(true);
    fetchDeploys();
  }

  function getDuration(start: string, end: string): string {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${min}m ${remSec}s`;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deploys.length} deploy{deploys.length !== 1 ? "s" : ""} recorded
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              autoRefresh
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3 w-3" />
            Auto-refresh {autoRefresh ? "on" : "off"}
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Deploy list */}
      {deploys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitCommit className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-muted-foreground">No deployment logs yet.</p>
            <p className="text-sm text-muted-foreground/70">
              Logs will appear here after the next deploy.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {deploys.map((deploy, idx) => {
            const expanded = expandedIdx === idx;
            return (
              <Card
                key={idx}
                className={`transition-colors ${
                  deploy.success
                    ? "border-l-2 border-l-green-500"
                    : "border-l-2 border-l-destructive"
                }`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedIdx(expanded ? null : idx)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {deploy.success ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="text-sm font-mono text-muted-foreground">
                              {deploy.fromHash}
                            </code>
                            <span className="text-xs text-muted-foreground">
                              &rarr;
                            </span>
                            <code className="text-sm font-mono font-semibold">
                              {deploy.toHash}
                            </code>
                            {deploy.commits.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({deploy.commits.length} commit
                                {deploy.commits.length !== 1 ? "s" : ""})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span>{formatRelativeTime(deploy.timestamp)}</span>
                            {deploy.startedAt && deploy.endedAt && (
                              <span>
                                {getDuration(deploy.startedAt, deploy.endedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </button>

                {expanded && (
                  <div className="border-t border-border px-4 pb-4">
                    {/* Commits */}
                    {deploy.commits.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Commits
                        </p>
                        <ul className="space-y-1">
                          {deploy.commits.map((commit, ci) => (
                            <li
                              key={ci}
                              className="flex items-start gap-2 text-sm"
                            >
                              <GitCommit className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <code className="text-xs break-all">
                                {commit}
                              </code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Docker output */}
                    {deploy.dockerOutput && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Docker output
                        </p>
                        <pre className="max-h-60 overflow-auto rounded-md bg-muted/50 p-3 text-xs font-mono leading-relaxed">
                          {deploy.dockerOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
