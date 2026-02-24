"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  ChevronRight,
  Briefcase,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JobStatus =
  | "QUEUED"
  | "PRINTING"
  | "POST_PROCESSING"
  | "QUALITY_CHECK"
  | "PACKING"
  | "SHIPPED"
  | "COMPLETE";

interface Job {
  id: string;
  quoteId: string | null;
  printerId: string | null;
  status: JobStatus;
  actualTimeMinutes: number | null;
  actualWeightG: number | null;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  quote: { quoteNumber: string; total: number } | null;
  printer: { name: string } | null;
}

interface PrinterOption {
  id: string;
  name: string;
}

interface QuoteOption {
  id: string;
  quoteNumber: string;
  total: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_ORDER: JobStatus[] = [
  "QUEUED",
  "PRINTING",
  "POST_PROCESSING",
  "QUALITY_CHECK",
  "PACKING",
  "SHIPPED",
  "COMPLETE",
];

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; colour: string; bgColour: string }
> = {
  QUEUED: {
    label: "Queued",
    colour: "text-gray-500",
    bgColour: "bg-gray-500/15",
  },
  PRINTING: {
    label: "Printing",
    colour: "text-blue-500",
    bgColour: "bg-blue-500/15",
  },
  POST_PROCESSING: {
    label: "Post-Processing",
    colour: "text-orange-500",
    bgColour: "bg-orange-500/15",
  },
  QUALITY_CHECK: {
    label: "Quality Check",
    colour: "text-yellow-500",
    bgColour: "bg-yellow-500/15",
  },
  PACKING: {
    label: "Packing",
    colour: "text-purple-500",
    bgColour: "bg-purple-500/15",
  },
  SHIPPED: {
    label: "Shipped",
    colour: "text-cyan-500",
    bgColour: "bg-cyan-500/15",
  },
  COMPLETE: {
    label: "Complete",
    colour: "text-green-500",
    bgColour: "bg-green-500/15",
  },
};

const STATUS_BADGE_VARIANT: Record<JobStatus, "default" | "info" | "success" | "warning"> = {
  QUEUED: "default",
  PRINTING: "info",
  POST_PROCESSING: "warning",
  QUALITY_CHECK: "info",
  PACKING: "warning",
  SHIPPED: "success",
  COMPLETE: "success",
};

type FilterMode = "ALL" | "ACTIVE" | "COMPLETE";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETE", label: "Complete" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function getNextStatus(status: JobStatus): JobStatus | null {
  const idx = STATUS_ORDER.indexOf(status);
  if (idx < 0 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}

// ---------------------------------------------------------------------------
// Job Card (Kanban)
// ---------------------------------------------------------------------------

function JobCard({
  job,
  onClick,
  onMoveNext,
  movingId,
}: {
  job: Job;
  onClick: () => void;
  onMoveNext: () => void;
  movingId: string | null;
}) {
  const config = STATUS_CONFIG[job.status];
  const nextStatus = getNextStatus(job.status);
  const isMoving = movingId === job.id;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {job.quote && (
              <p className="text-sm font-semibold">{job.quote.quoteNumber}</p>
            )}
            {job.printer && (
              <p className="text-xs text-muted-foreground">
                {job.printer.name}
              </p>
            )}
            {!job.quote && !job.printer && (
              <p className="text-sm font-medium text-muted-foreground">
                Unlinked job
              </p>
            )}
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[job.status]}>
            {config.label}
          </Badge>
        </div>

        {job.notes && (
          <p className="mt-2 text-xs text-muted-foreground">
            {truncate(job.notes, 60)}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(job.createdAt)}
          </span>
          {nextStatus && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={isMoving}
              onClick={(e) => {
                e.stopPropagation();
                onMoveNext();
              }}
            >
              {isMoving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <ChevronRight className="mr-1 h-3 w-3" />
                  {STATUS_CONFIG[nextStatus].label}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------

function KanbanColumn({
  status,
  jobs,
  onCardClick,
  onMoveNext,
  movingId,
}: {
  status: JobStatus;
  jobs: Job[];
  onCardClick: (job: Job) => void;
  onMoveNext: (job: Job) => void;
  movingId: string | null;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            config.bgColour.replace("/15", "")
          )}
          style={{
            backgroundColor: `var(--${config.colour.replace("text-", "")}, currentColor)`,
          }}
        />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {jobs.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onClick={() => onCardClick(job)}
            onMoveNext={() => onMoveNext(job)}
            movingId={movingId}
          />
        ))}
        {jobs.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No jobs
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function ListView({
  jobs,
  onCardClick,
  onMoveNext,
  movingId,
}: {
  jobs: Job[];
  onCardClick: (job: Job) => void;
  onMoveNext: (job: Job) => void;
  movingId: string | null;
}) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
          <Briefcase className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No jobs to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Quote
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Printer
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Notes
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Created
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const config = STATUS_CONFIG[job.status];
              const nextStatus = getNextStatus(job.status);
              const isMoving = movingId === job.id;

              return (
                <tr
                  key={job.id}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50"
                  onClick={() => onCardClick(job)}
                >
                  <td className="px-4 py-3 font-medium">
                    {job.quote?.quoteNumber ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.printer?.name ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[job.status]}>
                      {config.label}
                    </Badge>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground truncate">
                    {job.notes ? truncate(job.notes, 40) : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {nextStatus && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={isMoving}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveNext(job);
                        }}
                      >
                        {isMoving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <ChevronRight className="mr-1 h-3 w-3" />
                            {STATUS_CONFIG[nextStatus].label}
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// New Job Modal
// ---------------------------------------------------------------------------

function NewJobModal({
  open,
  onClose,
  printers,
  quotes,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  printers: PrinterOption[];
  quotes: QuoteOption[];
  onCreated: () => void;
}) {
  const [quoteId, setQuoteId] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED");

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quoteId || null,
          printerId: printerId || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job");
      }

      setQuoteId("");
      setPrinterId("");
      setNotes("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>New Job</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <Select
          label="Quote (optional)"
          value={quoteId}
          onChange={(e) => setQuoteId(e.target.value)}
          options={[
            { value: "", label: "None" },
            ...acceptedQuotes.map((q) => ({
              value: q.id,
              label: `${q.quoteNumber} ($${q.total.toFixed(2)})`,
            })),
          ]}
        />

        <Select
          label="Printer (optional)"
          value={printerId}
          onChange={(e) => setPrinterId(e.target.value)}
          options={[
            { value: "", label: "None" },
            ...printers.map((p) => ({
              value: p.id,
              label: p.name,
            })),
          ]}
        />

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Job notes..."
          rows={3}
        />

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Job Detail Modal
// ---------------------------------------------------------------------------

function JobDetailModal({
  job,
  onClose,
  printers,
  onUpdated,
  onDeleted,
}: {
  job: Job | null;
  onClose: () => void;
  printers: PrinterOption[];
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [status, setStatus] = useState<JobStatus>("QUEUED");
  const [printerId, setPrinterId] = useState("");
  const [actualTime, setActualTime] = useState("");
  const [actualWeight, setActualWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when job changes
  useEffect(() => {
    if (job) {
      setStatus(job.status);
      setPrinterId(job.printerId || "");
      setActualTime(job.actualTimeMinutes?.toString() ?? "");
      setActualWeight(job.actualWeightG?.toString() ?? "");
      setNotes(job.notes ?? "");
      setError(null);
    }
  }, [job]);

  async function handleSave() {
    if (!job) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          printerId: printerId || null,
          actualTimeMinutes: actualTime ? parseFloat(actualTime) : null,
          actualWeightG: actualWeight ? parseFloat(actualWeight) : null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update job");
      }

      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!job) return;
    if (!confirm("Delete this job? This cannot be undone.")) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete job");
      }

      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  }

  if (!job) return null;

  return (
    <Dialog open={!!job} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <DialogTitle>Job Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Quote</span>
            <p className="font-medium">
              {job.quote?.quoteNumber ?? "\u2014"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Created</span>
            <p className="font-medium">{formatDateTime(job.createdAt)}</p>
          </div>
          {job.startedAt && (
            <div>
              <span className="text-muted-foreground">Started</span>
              <p className="font-medium">{formatDateTime(job.startedAt)}</p>
            </div>
          )}
          {job.completedAt && (
            <div>
              <span className="text-muted-foreground">Completed</span>
              <p className="font-medium">{formatDateTime(job.completedAt)}</p>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* Editable fields */}
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus)}
          options={STATUS_ORDER.map((s) => ({
            value: s,
            label: STATUS_CONFIG[s].label,
          }))}
        />

        <Select
          label="Printer"
          value={printerId}
          onChange={(e) => setPrinterId(e.target.value)}
          options={[
            { value: "", label: "None" },
            ...printers.map((p) => ({
              value: p.id,
              label: p.name,
            })),
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Actual Time (min)"
            type="number"
            value={actualTime}
            onChange={(e) => setActualTime(e.target.value)}
            placeholder="0"
            min={0}
            step="any"
          />
          <Input
            label="Actual Weight (g)"
            type="number"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            placeholder="0"
            min={0}
            step="any"
          />
        </div>

        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Job notes..."
          rows={3}
        />

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("ACTIVE");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  // ---- Fetch data ----
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [printersRes, quotesRes] = await Promise.all([
        fetch("/api/printers"),
        fetch("/api/quotes"),
      ]);

      if (printersRes.ok) {
        const data = await printersRes.json();
        setPrinters(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      }

      if (quotesRes.ok) {
        const data = await quotesRes.json();
        setQuotes(
          data.map((q: { id: string; quoteNumber: string; total: number; status: string }) => ({
            id: q.id,
            quoteNumber: q.quoteNumber,
            total: q.total,
            status: q.status,
          }))
        );
      }
    } catch {
      // Non-critical -- dropdowns will just be empty
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchJobs(), fetchDropdownData()]);
      setLoading(false);
    }
    init();
  }, [fetchJobs, fetchDropdownData]);

  // ---- Move to next status ----
  async function handleMoveNext(job: Job) {
    const next = getNextStatus(job.status);
    if (!next) return;

    setMovingId(job.id);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      await fetchJobs();
    } catch {
      // Silently fail -- user can retry
    } finally {
      setMovingId(null);
    }
  }

  // ---- Filtered jobs ----
  const filteredJobs =
    filter === "ALL"
      ? jobs
      : filter === "ACTIVE"
        ? jobs.filter((j) => j.status !== "COMPLETE")
        : jobs.filter((j) => j.status === "COMPLETE");

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterMode)}
            options={FILTER_OPTIONS}
            className="w-32"
          />

          {/* View toggle */}
          <div className="flex rounded-md border border-border">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "flex items-center gap-1 rounded-l-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "kanban"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1 rounded-r-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <span className="text-sm text-muted-foreground">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          </span>
        </div>

        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Job
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              No jobs yet. Create your first job to start tracking.
            </p>
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => setNewModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Job
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Kanban View */}
      {jobs.length > 0 && view === "kanban" && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: "fit-content" }}>
            {STATUS_ORDER.filter((status) => {
              // If filter is ACTIVE, hide COMPLETE column. If COMPLETE, show only COMPLETE.
              if (filter === "ACTIVE") return status !== "COMPLETE";
              if (filter === "COMPLETE") return status === "COMPLETE";
              return true;
            }).map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                jobs={filteredJobs.filter((j) => j.status === status)}
                onCardClick={(job) => setDetailJob(job)}
                onMoveNext={handleMoveNext}
                movingId={movingId}
              />
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {jobs.length > 0 && view === "list" && (
        <ListView
          jobs={filteredJobs}
          onCardClick={(job) => setDetailJob(job)}
          onMoveNext={handleMoveNext}
          movingId={movingId}
        />
      )}

      {/* New Job Modal */}
      <NewJobModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        printers={printers}
        quotes={quotes}
        onCreated={fetchJobs}
      />

      {/* Job Detail Modal */}
      <JobDetailModal
        job={detailJob}
        onClose={() => setDetailJob(null)}
        printers={printers}
        onUpdated={fetchJobs}
        onDeleted={fetchJobs}
      />
    </div>
  );
}
