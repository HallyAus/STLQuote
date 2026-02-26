import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createJobSchema = z.object({
  quoteId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  printerId: z.string().optional().nullable(),
  materialId: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  scheduledStart: z.string().datetime().optional().nullable(),
  scheduledEnd: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      include: {
        quote: { select: { quoteNumber: true, total: true } },
        client: { select: { id: true, name: true, email: true } },
        printer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { scheduledStart, scheduledEnd, ...rest } = parsed.data;

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          ...rest,
          userId: user.id,
          scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        },
        include: {
          quote: { select: { quoteNumber: true, total: true } },
          client: { select: { id: true, name: true, email: true } },
          printer: { select: { name: true } },
        },
      });

      // Create initial JobEvent
      await tx.jobEvent.create({
        data: {
          jobId: created.id,
          fromStatus: null,
          toStatus: "QUEUED",
        },
      });

      return created;
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
