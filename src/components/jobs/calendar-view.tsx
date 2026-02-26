"use client";

import { Fragment, useState, useMemo, useCallback, type DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JOB_STATUS, type JobStatus } from "@/lib/status-colours";
import { ChevronLeft, ChevronRight, Calendar, GripHorizontal } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Job {
  id: string;
  quoteId: string | null;
  printerId: string | null;
  status: string;
  notes: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
  quote: { quoteNumber: string; total: number } | null;
  printer: { name: string } | null;
}

interface PrinterOption {
  id: string;
  name: string;
}

interface CalendarViewProps {
  jobs: Job[];
  printers: PrinterOption[];
  onReschedule: (
    jobId: string,
    printerId: string,
    scheduledStart: string,
    scheduledEnd: string
  ) => Promise<void>;
  onJobClick: (job: Job) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hours displayed on the X axis (8am through 8pm inclusive = 13 columns) */
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const HOUR_COUNT = HOURS.length;

/** Pixel width of each hour column */
const HOUR_WIDTH_PX = 120;

/** Pixel height of each printer row */
const ROW_HEIGHT_PX = 64;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Return the Monday of the week containing `date`. */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Add `days` days to a date, returning a new Date. */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Get all 7 days of the week starting from Monday. */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Format a Date as "Mon 24 Feb". */
function formatDayShort(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Format a date range for the header, e.g. "24 Feb - 2 Mar 2026". */
function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = monday.toLocaleDateString("en-AU", opts);
  const end = sunday.toLocaleDateString("en-AU", {
    ...opts,
    year: "numeric",
  });
  return `${start} \u2013 ${end}`;
}

/** Format an hour number (0-23) as a display string. */
function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

/** Check if two dates are on the same calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Check if `date` is today. */
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// ---------------------------------------------------------------------------
// Drag data encoding
// ---------------------------------------------------------------------------

interface DragPayload {
  jobId: string;
  /** Original duration in milliseconds, so we can preserve it on drop */
  durationMs: number;
}

function encodeDragData(payload: DragPayload): string {
  return JSON.stringify(payload);
}

function decodeDragData(data: string): DragPayload | null {
  try {
    const parsed = JSON.parse(data) as DragPayload;
    if (typeof parsed.jobId === "string" && typeof parsed.durationMs === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single job block rendered on the Gantt grid. */
function JobBlock({
  job,
  day,
  onClick,
}: {
  job: Job;
  day: Date;
  onClick: () => void;
}) {
  const start = new Date(job.scheduledStart!);
  const end = new Date(job.scheduledEnd!);

  // Compute horizontal position relative to the day grid
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;

  // Clamp to visible range
  const clampedStart = Math.max(startHour, START_HOUR);
  const clampedEnd = Math.min(endHour, END_HOUR + 1); // +1 because 8pm column spans to 9pm

  if (clampedEnd <= clampedStart) return null;

  const leftPct = ((clampedStart - START_HOUR) / HOUR_COUNT) * 100;
  const widthPct = ((clampedEnd - clampedStart) / HOUR_COUNT) * 100;

  const statusConfig = JOB_STATUS[job.status as JobStatus] ?? JOB_STATUS.QUEUED;
  const durationMs = end.getTime() - start.getTime();

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/x-calendar-job",
      encodeDragData({ jobId: job.id, durationMs })
    );
    // Make drag image slightly transparent
    if (e.currentTarget) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "absolute top-1 bottom-1 z-10 flex cursor-grab items-center gap-1 overflow-hidden rounded-md border border-border/50 px-2 text-xs font-medium shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md",
        statusConfig.dotColour,
        // Use white text for coloured backgrounds, or default for muted
        job.status === "QUEUED"
          ? "text-foreground"
          : "text-white dark:text-white"
      )}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        minWidth: "2rem",
      }}
      title={`${job.quote?.quoteNumber ?? "Job"} — ${statusConfig.label} (${formatHour(start.getHours())}–${formatHour(end.getHours())})`}
    >
      <GripHorizontal className="h-3 w-3 shrink-0 opacity-50" />
      <span className="truncate">
        {job.quote?.quoteNumber ?? "Job"}
      </span>
    </div>
  );
}

/** Unscheduled job card in the sidebar section. */
function UnscheduledJobCard({
  job,
  onClick,
}: {
  job: Job;
  onClick: () => void;
}) {
  const statusConfig = JOB_STATUS[job.status as JobStatus] ?? JOB_STATUS.QUEUED;
  const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 hour

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/x-calendar-job",
      encodeDragData({ jobId: job.id, durationMs: DEFAULT_DURATION_MS })
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="flex cursor-grab items-center gap-2 rounded-md border border-border bg-card p-2 text-sm transition-colors active:cursor-grabbing hover:bg-muted/50"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", statusConfig.dotColour)} />
      <span className="min-w-0 flex-1 truncate font-medium">
        {job.quote?.quoteNumber ?? "Unlinked job"}
      </span>
      {job.printer && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {job.printer.name}
        </span>
      )}
      <Badge variant={statusConfig.variant} size="sm">
        {statusConfig.label}
      </Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CalendarView({
  jobs,
  printers,
  onReschedule,
  onJobClick,
}: CalendarViewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [dragOverCell, setDragOverCell] = useState<{
    printerId: string;
    hour: number;
  } | null>(null);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  // ---- Week navigation ----
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setWeekStart(getMonday(today));
    setSelectedDay(today);
  }, []);

  // ---- Filter jobs for the selected day ----
  const scheduledJobsForDay = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.scheduledStart) return false;
      const start = new Date(job.scheduledStart);
      return isSameDay(start, selectedDay);
    });
  }, [jobs, selectedDay]);

  const unscheduledJobs = useMemo(() => {
    return jobs.filter((job) => !job.scheduledStart);
  }, [jobs]);

  // Group scheduled jobs by printer row
  const jobsByPrinter = useMemo(() => {
    const map = new Map<string, Job[]>();
    // Initialise all printer rows
    for (const printer of printers) {
      map.set(printer.id, []);
    }
    // Place jobs that have a matching printer
    for (const job of scheduledJobsForDay) {
      if (job.printerId) {
        const list = map.get(job.printerId);
        if (list) {
          list.push(job);
        } else {
          // Printer not in the list (deleted?), show anyway
          map.set(job.printerId, [job]);
        }
      }
    }
    return map;
  }, [scheduledJobsForDay, printers]);

  // ---- Drop handler ----
  function handleCellDrop(
    e: DragEvent<HTMLDivElement>,
    printerId: string,
    hour: number
  ) {
    e.preventDefault();
    setDragOverCell(null);

    const raw = e.dataTransfer.getData("application/x-calendar-job");
    if (!raw) return;

    const payload = decodeDragData(raw);
    if (!payload) return;

    // Build the scheduledStart from the selected day + drop hour
    const start = new Date(selectedDay);
    start.setHours(hour, 0, 0, 0);

    const end = new Date(start.getTime() + payload.durationMs);

    onReschedule(
      payload.jobId,
      printerId,
      start.toISOString(),
      end.toISOString()
    );
  }

  function handleCellDragOver(
    e: DragEvent<HTMLDivElement>,
    printerId: string,
    hour: number
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell({ printerId, hour });
  }

  function handleCellDragLeave() {
    setDragOverCell(null);
  }

  // ---- Determine the "now" marker position ----
  const now = new Date();
  const nowOnSelectedDay = isSameDay(now, selectedDay);
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const nowInRange = nowHour >= START_HOUR && nowHour <= END_HOUR + 1;
  const nowLeftPct =
    nowOnSelectedDay && nowInRange
      ? ((nowHour - START_HOUR) / HOUR_COUNT) * 100
      : null;

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Mobile fallback */}
      <div className="block lg:hidden">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              The calendar view is best experienced on a larger screen.
              Please use a desktop or tablet in landscape mode.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop calendar */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Print Farm Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToPrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="ghost" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Week range label */}
            <p className="text-sm text-muted-foreground">
              {formatWeekRange(weekStart)}
            </p>

            {/* Day tabs */}
            <div className="mt-3 flex gap-1">
              {weekDays.map((day) => {
                const active = isSameDay(day, selectedDay);
                const today = isToday(day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : today
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {formatDayShort(day)}
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {printers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Add printers to see the schedule grid.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-border">
                {/* Grid container */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `160px repeat(${HOUR_COUNT}, ${HOUR_WIDTH_PX}px)`,
                    minWidth: `${160 + HOUR_COUNT * HOUR_WIDTH_PX}px`,
                  }}
                >
                  {/* ---- Header row: empty corner + hour labels ---- */}
                  <div className="sticky left-0 z-20 border-b border-r border-border bg-card px-3 py-2" />
                  {HOURS.map((hour) => (
                    <div
                      key={`header-${hour}`}
                      className="border-b border-r border-border bg-card px-2 py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                      {formatHour(hour)}
                    </div>
                  ))}

                  {/* ---- Printer rows ---- */}
                  {printers.map((printer) => {
                    const printerJobs = jobsByPrinter.get(printer.id) ?? [];

                    return (
                      <Fragment key={printer.id}>
                        {/* Printer label (sticky left) */}
                        <div
                          className="sticky left-0 z-20 flex items-center border-b border-r border-border bg-card px-3 text-sm font-medium"
                          style={{ height: `${ROW_HEIGHT_PX}px` }}
                        >
                          <span className="truncate">{printer.name}</span>
                        </div>

                        {/* Hour cells for this printer */}
                        {HOURS.map((hour) => {
                          const isDragOver =
                            dragOverCell?.printerId === printer.id &&
                            dragOverCell?.hour === hour;

                          return (
                            <div
                              key={`cell-${printer.id}-${hour}`}
                              className={cn(
                                "relative border-b border-r border-border transition-colors",
                                isDragOver && "bg-primary/10"
                              )}
                              style={{ height: `${ROW_HEIGHT_PX}px` }}
                              onDragOver={(e) =>
                                handleCellDragOver(e, printer.id, hour)
                              }
                              onDragLeave={handleCellDragLeave}
                              onDrop={(e) =>
                                handleCellDrop(e, printer.id, hour)
                              }
                            />
                          );
                        })}

                        {/* Job blocks overlay — positioned absolutely within a relative wrapper */}
                        {printerJobs.length > 0 && (
                          <div
                            key={`jobs-${printer.id}`}
                            className="pointer-events-none relative"
                            style={{
                              gridColumn: `2 / -1`,
                              gridRow: `auto`,
                              marginTop: `-${ROW_HEIGHT_PX}px`,
                              height: `${ROW_HEIGHT_PX}px`,
                            }}
                          >
                            <div className="pointer-events-auto relative h-full">
                              {printerJobs.map((job) => (
                                <JobBlock
                                  key={job.id}
                                  job={job}
                                  day={selectedDay}
                                  onClick={() => onJobClick(job)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>

                {/* Now marker */}
                {nowLeftPct !== null && (
                  <div
                    className="pointer-events-none absolute top-0 z-30 w-px bg-destructive"
                    style={{
                      left: `calc(160px + ${nowLeftPct}%)`,
                      height: "100%",
                    }}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Unscheduled jobs section ---- */}
        {unscheduledJobs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Unscheduled Jobs
                </CardTitle>
                <Badge variant="default">{unscheduledJobs.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Drag a job onto the calendar to schedule it.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {unscheduledJobs.map((job) => (
                  <UnscheduledJobCard
                    key={job.id}
                    job={job}
                    onClick={() => onJobClick(job)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
