import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { fireWebhooks } from "@/lib/webhooks";

const JOB_STATUS_VALUES = [
  "QUEUED",
  "PRINTING",
  "POST_PROCESSING",
  "QUALITY_CHECK",
  "PACKING",
  "SHIPPED",
  "COMPLETE",
] as const;

const updateJobSchema = z.object({
  status: z.enum(JOB_STATUS_VALUES).optional(),
  printerId: z.string().optional().nullable(),
  materialId: z.string().optional().nullable(),
  actualTimeMinutes: z.number().min(0).optional().nullable(),
  actualWeightG: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        quote: { select: { quoteNumber: true, total: true, status: true } },
        printer: { select: { name: true } },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json(
      { error: "Failed to fetch job" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.job.findFirst({
      where: { id, userId: user.id },
      include: {
        material: { select: { id: true, spoolWeightG: true, stockQty: true } },
        printer: { select: { id: true, name: true, currentHours: true } },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    const statusChanged = parsed.data.status && parsed.data.status !== existing.status;

    // Auto-set startedAt when status changes to PRINTING (if not already set)
    if (
      parsed.data.status === "PRINTING" &&
      !existing.startedAt &&
      !parsed.data.startedAt
    ) {
      data.startedAt = new Date();
    }

    // Auto-set completedAt when status changes to COMPLETE
    if (parsed.data.status === "COMPLETE" && !parsed.data.completedAt) {
      data.completedAt = new Date();
    }

    // Convert datetime strings to Date objects
    if (typeof data.scheduledStart === "string") {
      data.scheduledStart = new Date(data.scheduledStart);
    }
    if (typeof data.scheduledEnd === "string") {
      data.scheduledEnd = new Date(data.scheduledEnd);
    }
    if (typeof data.startedAt === "string") {
      data.startedAt = new Date(data.startedAt);
    }
    if (typeof data.completedAt === "string") {
      data.completedAt = new Date(data.completedAt);
    }

    // Use transaction for stock deduction, printer hours, and event logging
    const job = await prisma.$transaction(async (tx) => {
      const updated = await tx.job.update({
        where: { id },
        data,
        include: {
          quote: { select: { quoteNumber: true, total: true, status: true } },
          printer: { select: { name: true } },
        },
      });

      // Create JobEvent on status change
      if (statusChanged && parsed.data.status) {
        await tx.jobEvent.create({
          data: {
            jobId: id,
            fromStatus: existing.status,
            toStatus: parsed.data.status,
          },
        });
      }

      // On COMPLETE: deduct stock + increment printer hours
      if (parsed.data.status === "COMPLETE") {
        // Weight-based stock deduction
        const weightG = parsed.data.actualWeightG ?? existing.actualWeightG;
        if (weightG && existing.material) {
          const spoolWeightG = existing.material.spoolWeightG || 1000;
          const spoolsUsed = Math.ceil(weightG / spoolWeightG);
          const newQty = Math.max(0, existing.material.stockQty - spoolsUsed);
          await tx.material.update({
            where: { id: existing.material.id },
            data: { stockQty: newQty },
          });
        }

        // Increment printer hours
        const timeMinutes = parsed.data.actualTimeMinutes ?? existing.actualTimeMinutes;
        if (timeMinutes && existing.printer?.id) {
          const hoursToAdd = timeMinutes / 60;
          await tx.printer.update({
            where: { id: existing.printer.id },
            data: { currentHours: (existing.printer.currentHours || 0) + hoursToAdd },
          });
        }
      }

      return updated;
    });

    // Fire webhooks on status change
    if (statusChanged && parsed.data.status) {
      const event =
        parsed.data.status === "COMPLETE" ? "job.completed" : "job.updated";
      fireWebhooks(user.id, event, {
        jobId: job.id,
        status: parsed.data.status,
        quoteNumber: job.quote?.quoteNumber ?? null,
      });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to update job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.job.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    await prisma.job.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
