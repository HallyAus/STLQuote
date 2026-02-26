"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { JOB_STATUS, JOB_STATUS_ORDER, BANNER, type JobStatus as JStatus } from "@/lib/status-colours";
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
  GripVertical,
  Clock,
  Download,
  Receipt,
  Camera,
  CalendarDays,
} from "lucide-react";
import { JobTimeline } from "@/components/jobs/job-timeline";
import { PhotoGallery } from "@/components/jobs/photo-gallery";
import { CalendarView } from "@/components/jobs/calendar-view";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

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
  clientId: string | null;
  printerId: string | null;
  status: JobStatus;
  price: number | null;
  actualTimeMinutes: number | null;
  actualWeightG: number | null;
  notes: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  quote: { quoteNumber: string; total: number } | null;
  client: { id: string; name: string; email: string | null } | null;
  printer: { name: string } | null;
}

interface PrinterOption {
  id: string;
  name: string;
}

interface MaterialOption {
  id: string;
  materialType: string;
  brand: string | null;
  colour: string | null;
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
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
  const idx = JOB_STATUS_ORDER.indexOf(status);
  if (idx < 0 || idx >= JOB_STATUS_ORDER.length - 1) return null;
  return JOB_STATUS_ORDER[idx + 1];
}

// ---------------------------------------------------------------------------
// Job Card (Kanban) — static version for overlay and list
// ---------------------------------------------------------------------------

function JobCardContent({
  job,
  onClick,
  onMoveNext,
  movingId,
  dragHandle,
}: {
  job: Job;
  onClick?: () => void;
  onMoveNext?: () => void;
  movingId?: string | null;
  dragHandle?: React.ReactNode;
}) {
  const config = JOB_STATUS[job.status];
  const nextStatus = getNextStatus(job.status);
  const isMoving = movingId === job.id;

  return (
    <Card
      className={cn("transition-colors", onClick && "cursor-pointer hover:bg-muted/50")}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1.5">
          {dragHandle}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {job.client && (
                  <p className="text-sm font-semibold truncate">{job.client.name}</p>
                )}
                {job.quote && (
                  <p className="text-xs text-muted-foreground">{job.quote.quoteNumber}</p>
                )}
                {job.printer && (
                  <p className="text-xs text-muted-foreground">
                    {job.printer.name}
                  </p>
                )}
                {!job.client && !job.quote && !job.printer && (
                  <p className="text-sm font-medium text-muted-foreground">
                    {job.notes?.match(/^Shopify (#\S+)/)?.[1] ?? "Unlinked job"}
                  </p>
                )}
              </div>
              <Badge variant={JOB_STATUS[job.status].variant}>
                {config.label}
              </Badge>
            </div>

            {job.notes && (
              <p className="mt-2 text-xs text-muted-foreground">
                {truncate(job.notes, 60)}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between">
              {job.price != null && (
                <span className="text-xs font-semibold text-foreground">
                  ${job.price.toFixed(2)}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDate(job.createdAt)}
              </span>
              {nextStatus && onMoveNext && (
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
                      {JOB_STATUS[nextStatus].label}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Draggable Job Card (Kanban)
// ---------------------------------------------------------------------------

function DraggableJobCard({
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: job.id,
    data: { status: job.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="touch-none"
    >
      <JobCardContent
        job={job}
        onClick={onClick}
        onMoveNext={onMoveNext}
        movingId={movingId}
        dragHandle={
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
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
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        "flex h-full min-w-[85vw] snap-center flex-shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors sm:min-w-0 sm:w-64",
        isOver ? "border-primary/50 bg-primary/5" : "border-border"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className={cn("h-2 w-2 rounded-full", JOB_STATUS[status].dotColour)} />
        <span className="text-sm font-medium">{JOB_STATUS[status].label}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto p-2"
        style={{ minHeight: 80 }}
      >
        {jobs.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            onClick={() => onCardClick(job)}
            onMoveNext={() => onMoveNext(job)}
            movingId={movingId}
          />
        ))}
        {jobs.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No jobs"}
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
  onRefresh,
}: {
  jobs: Job[];
  onCardClick: (job: Job) => void;
  onMoveNext: (job: Job) => void;
  movingId: string | null;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const allSelected = jobs.length > 0 && selected.size === jobs.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(jobs.map((j) => j.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} job${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/jobs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: "delete" }),
      });
      if (res.ok) {
        setSelected(new Set());
        onRefresh();
      }
    } catch {
      // Best-effort
    } finally {
      setBulkLoading(false);
    }
  }

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
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm mb-3">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-3 w-3" />
            )}
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Client
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Quote
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Printer
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                  Price
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
                const config = JOB_STATUS[job.status];
                const nextStatus = getNextStatus(job.status);
                const isMoving = movingId === job.id;

                return (
                  <tr
                    key={job.id}
                    className={cn(
                      "cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted/50",
                      selected.has(job.id) && "bg-primary/5"
                    )}
                    onClick={() => onCardClick(job)}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(job.id)}
                        onChange={() => toggleOne(job.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {job.client?.name ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {job.quote?.quoteNumber ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {job.printer?.name ?? "\u2014"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={JOB_STATUS[job.status].variant}>
                        {config.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {job.price != null ? `$${job.price.toFixed(2)}` : "\u2014"}
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
                              {JOB_STATUS[nextStatus].label}
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
    </>
  );
}

// ---------------------------------------------------------------------------
// New Job Modal
// ---------------------------------------------------------------------------

function NewJobModal({
  open,
  onClose,
  printers,
  materials,
  quotes,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  printers: PrinterOption[];
  materials: MaterialOption[];
  quotes: QuoteOption[];
  onCreated: () => void;
}) {
  const [quoteId, setQuoteId] = useState("");
  const [printerId, setPrinterId] = useState("");
  const [materialId, setMaterialId] = useState("");
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
          materialId: materialId || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job");
      }

      setQuoteId("");
      setPrinterId("");
      setMaterialId("");
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
          <div className={BANNER.error}>
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

        <Select
          label="Material (optional)"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          options={[
            { value: "", label: "None" },
            ...materials.map((m) => ({
              value: m.id,
              label: `${m.materialType}${m.brand ? ` - ${m.brand}` : ""}${m.colour ? ` (${m.colour})` : ""}`,
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
  const [price, setPrice] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
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
      setPrice(job.price?.toString() ?? "");
      setScheduledStart(job.scheduledStart ? new Date(job.scheduledStart).toISOString().slice(0, 16) : "");
      setScheduledEnd(job.scheduledEnd ? new Date(job.scheduledEnd).toISOString().slice(0, 16) : "");
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
          price: price ? parseFloat(price) : null,
          scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
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
          <div className={BANNER.error}>
            {error}
          </div>
        )}

        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {job.client && (
            <div>
              <span className="text-muted-foreground">Client</span>
              <p className="font-medium">{job.client.name}</p>
              {job.client.email && (
                <p className="text-xs text-muted-foreground">{job.client.email}</p>
              )}
            </div>
          )}
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
          options={JOB_STATUS_ORDER.map((s) => ({
            value: s,
            label: JOB_STATUS[s].label,
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

        <Input
          label="Price ($)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          min={0}
          step="0.01"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Scheduled Start"
            type="datetime-local"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
          />
          <Input
            label="Scheduled End"
            type="datetime-local"
            value={scheduledEnd}
            onChange={(e) => setScheduledEnd(e.target.value)}
          />
        </div>

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

        {/* Timeline */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Timeline</span>
          </div>
          <JobTimeline jobId={job.id} />
        </div>

        {/* Photos */}
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Photos</span>
          </div>
          <PhotoGallery jobId={job.id} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="text-destructive-foreground hover:text-destructive-foreground hover:bg-destructive/10"
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
          <div className="flex gap-2">
            {job.status === "COMPLETE" && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/invoices", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ jobId: job.id }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    const inv = await res.json();
                    window.location.href = `/invoices/${inv.id}`;
                  } catch {
                    // Best-effort
                  }
                }}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Invoice
              </Button>
            )}
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
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("ACTIVE");
  const [view, setView] = useState<"kanban" | "list" | "calendar">("kanban");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [activeDragJob, setActiveDragJob] = useState<Job | null>(null);
  const prevJobsRef = useRef<Job[]>([]);

  // ---- DnD sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
      const [printersRes, materialsRes, quotesRes] = await Promise.all([
        fetch("/api/printers"),
        fetch("/api/materials"),
        fetch("/api/quotes"),
      ]);

      if (printersRes.ok) {
        const data = await printersRes.json();
        setPrinters(data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      }

      if (materialsRes.ok) {
        const data = await materialsRes.json();
        setMaterials(
          data.map((m: { id: string; materialType: string; brand: string | null; colour: string | null }) => ({
            id: m.id,
            materialType: m.materialType,
            brand: m.brand,
            colour: m.colour,
          }))
        );
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

  // ---- Drag handlers ----
  function handleDragStart(event: DragStartEvent) {
    const draggedJob = jobs.find((j) => j.id === event.active.id);
    setActiveDragJob(draggedJob ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragJob(null);
    const { active, over } = event;
    if (!over) return;

    const jobId = active.id as string;
    let targetStatus = over.id as string;

    // If dropped on another card, find that card's status
    if (!JOB_STATUS_ORDER.includes(targetStatus as JobStatus)) {
      const targetJob = jobs.find((j) => j.id === targetStatus);
      if (targetJob) {
        targetStatus = targetJob.status;
      } else {
        return;
      }
    }

    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === targetStatus) return;

    // Optimistic update
    prevJobsRef.current = jobs;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: targetStatus as JobStatus } : j
      )
    );

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      // Refresh from server to get accurate timestamps
      await fetchJobs();
    } catch {
      // Revert on failure
      setJobs(prevJobsRef.current);
    }
  }

  function handleDragCancel() {
    setActiveDragJob(null);
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
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1 rounded-r-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>

          <span className="text-sm text-muted-foreground">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              window.location.href = "/api/export/jobs";
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setNewModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className={BANNER.error}>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="snap-x snap-mandatory overflow-x-auto pb-4">
            <div className="flex gap-3" style={{ minWidth: "fit-content" }}>
              {JOB_STATUS_ORDER.filter((status) => {
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
          <DragOverlay>
            {activeDragJob ? (
              <div className="w-64 opacity-90">
                <JobCardContent job={activeDragJob} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* List View */}
      {jobs.length > 0 && view === "list" && (
        <ListView
          jobs={filteredJobs}
          onCardClick={(job) => setDetailJob(job)}
          onMoveNext={handleMoveNext}
          movingId={movingId}
          onRefresh={fetchJobs}
        />
      )}

      {/* Calendar View */}
      {jobs.length > 0 && view === "calendar" && (
        <CalendarView
          jobs={filteredJobs}
          printers={printers}
          onReschedule={async (jobId, printerId, scheduledStart, scheduledEnd) => {
            try {
              const res = await fetch(`/api/jobs/${jobId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ printerId, scheduledStart, scheduledEnd }),
              });
              if (!res.ok) throw new Error("Failed to reschedule");
              await fetchJobs();
            } catch {
              setError("Failed to reschedule job");
            }
          }}
          onJobClick={(job) => setDetailJob(job as Job)}
        />
      )}

      {/* New Job Modal */}
      <NewJobModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        printers={printers}
        materials={materials}
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
