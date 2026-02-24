"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  X,
  Bug,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiLog {
  id: number;
  timestamp: Date;
  method: string;
  url: string;
  status: number | null;
  duration: number | null;
  requestBody: string | null;
  responseBody: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Fetch interceptor
// ---------------------------------------------------------------------------

const apiLogs: ApiLog[] = [];
let logIdCounter = 0;
let listeners: (() => void)[] = [];

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function notify() {
  listeners.forEach((fn) => fn());
}

// Only patch once
let patched = false;

function patchFetch() {
  if (patched) return;
  patched = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : String(input);

    // Only log API calls (skip external, static, _next, etc.)
    const isApi = url.startsWith("/api/") || url.includes("/api/");
    if (!isApi) {
      return originalFetch.call(this, input, init);
    }

    const method = init?.method?.toUpperCase() ?? "GET";
    let requestBody: string | null = null;

    if (init?.body) {
      try {
        requestBody =
          typeof init.body === "string"
            ? init.body
            : JSON.stringify(JSON.parse(String(init.body)), null, 2);
      } catch {
        requestBody = String(init.body);
      }
    }

    const entry: ApiLog = {
      id: ++logIdCounter,
      timestamp: new Date(),
      method,
      url,
      status: null,
      duration: null,
      requestBody,
      responseBody: null,
      error: null,
    };

    apiLogs.unshift(entry);
    // Keep max 50 logs
    if (apiLogs.length > 50) apiLogs.pop();
    notify();

    const start = performance.now();

    try {
      const response = await originalFetch.call(this, input, init);
      entry.status = response.status;
      entry.duration = Math.round(performance.now() - start);

      // Clone response to read body without consuming it
      const cloned = response.clone();
      try {
        const text = await cloned.text();
        try {
          entry.responseBody = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          entry.responseBody = text.substring(0, 2000);
        }
      } catch {
        entry.responseBody = "(unable to read body)";
      }

      notify();
      return response;
    } catch (err) {
      entry.duration = Math.round(performance.now() - start);
      entry.error = err instanceof Error ? err.message : String(err);
      entry.status = 0;
      notify();
      throw err;
    }
  };
}

// ---------------------------------------------------------------------------
// LogEntry component
// ---------------------------------------------------------------------------

function LogEntry({ log }: { log: ApiLog }) {
  const [expanded, setExpanded] = useState(false);

  const isError = log.error || (log.status && log.status >= 400);
  const isPending = log.status === null;

  const statusColour = isPending
    ? "text-yellow-400"
    : isError
      ? "text-red-400"
      : "text-green-400";

  const StatusIcon = isPending
    ? Clock
    : isError
      ? AlertCircle
      : CheckCircle2;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div
      className={cn(
        "border-b border-zinc-800 last:border-0",
        isError && "bg-red-950/20"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-zinc-800/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-zinc-500" />
        )}
        <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", statusColour)} />
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
            log.method === "GET"
              ? "bg-blue-500/20 text-blue-400"
              : log.method === "POST"
                ? "bg-green-500/20 text-green-400"
                : log.method === "PUT"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : log.method === "DELETE"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-zinc-500/20 text-zinc-400"
          )}
        >
          {log.method}
        </span>
        <span className="truncate font-mono text-zinc-300">
          {log.url.replace(/^\/api/, "")}
        </span>
        <span className="ml-auto shrink-0 tabular-nums text-zinc-500">
          {log.status ?? "..."}
        </span>
        {log.duration !== null && (
          <span className="shrink-0 tabular-nums text-zinc-600">
            {log.duration}ms
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-2 px-3 pb-3 pt-1">
          {/* Timestamp */}
          <div className="text-[10px] text-zinc-500">
            {log.timestamp.toLocaleTimeString("en-AU", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
            .{String(log.timestamp.getMilliseconds()).padStart(3, "0")}
          </div>

          {/* Error */}
          {log.error && (
            <div className="rounded border border-red-800 bg-red-950/40 px-2 py-1.5 text-[11px] text-red-300">
              {log.error}
            </div>
          )}

          {/* Request body */}
          {log.requestBody && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Request Body
                </span>
                <button
                  onClick={() => copyToClipboard(log.requestBody!)}
                  className="text-zinc-600 hover:text-zinc-400"
                  title="Copy"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-zinc-900 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-zinc-300">
                {log.requestBody}
              </pre>
            </div>
          )}

          {/* Response body */}
          {log.responseBody && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Response Body
                </span>
                <button
                  onClick={() => copyToClipboard(log.responseBody!)}
                  className="text-zinc-600 hover:text-zinc-400"
                  title="Copy"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-zinc-900 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-zinc-300">
                {log.responseBody}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Debug Panel
// ---------------------------------------------------------------------------

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [filter, setFilter] = useState<"all" | "errors">("all");
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Patch fetch on mount
  useEffect(() => {
    patchFetch();
  }, []);

  // Subscribe to log updates
  useEffect(() => {
    return subscribe(() => {
      setLogs([...apiLogs]);
    });
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === "D") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const filteredLogs =
    filter === "errors"
      ? logs.filter((l) => l.error || (l.status && l.status >= 400))
      : logs;

  const errorCount = logs.filter(
    (l) => l.error || (l.status && l.status >= 400)
  ).length;

  function clearLogs() {
    apiLogs.length = 0;
    logIdCounter = 0;
    setLogs([]);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "fixed bottom-4 right-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white",
          "border border-zinc-700",
          errorCount > 0 && "border-red-600 bg-red-900/80 text-red-300 hover:bg-red-800"
        )}
        title="Debug Panel (Ctrl+Shift+D)"
      >
        <Bug className="h-5 w-5" />
        {errorCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {errorCount > 9 ? "9+" : errorCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-0 right-0 z-[60] flex h-[70vh] w-full flex-col border-l border-t border-zinc-700 bg-zinc-900 shadow-2xl sm:w-[440px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-200">
                Debug Panel
              </span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                {logs.length} requests
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearLogs}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                title="Clear logs"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Route info */}
          <div className="border-b border-zinc-800 px-3 py-1.5">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-zinc-500">Route:</span>
              <span className="font-mono text-zinc-300">{pathname}</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
                filter === "all"
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter("errors")}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
                filter === "errors"
                  ? "border-b-2 border-red-500 text-red-400"
                  : "text-zinc-500 hover:text-zinc-300",
                errorCount > 0 && filter !== "errors" && "text-red-400"
              )}
            >
              Errors ({errorCount})
            </button>
          </div>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-zinc-600">
                <Bug className="h-8 w-8" />
                <p className="text-xs">
                  {filter === "errors"
                    ? "No errors yet"
                    : "No API requests yet"}
                </p>
                <p className="text-[10px] text-zinc-700">
                  Navigate the app to see requests appear here
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => <LogEntry key={log.id} log={log} />)
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-600">
            Ctrl+Shift+D to toggle &middot; Dev only
          </div>
        </div>
      )}
    </>
  );
}
