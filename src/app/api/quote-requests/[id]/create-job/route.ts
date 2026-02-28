import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const rl = rateLimit(`qr-create-job:${user.id}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 20,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { id } = await params;

    const request = await prisma.quoteRequest.findFirst({
      where: { id, userId: user.id },
    });
    if (!request) {
      return NextResponse.json(
        { error: "Quote request not found" },
        { status: 404 }
      );
    }

    // Auto-match client by email
    let clientId: string | null = null;
    if (request.clientEmail) {
      const client = await prisma.client.findFirst({
        where: { userId: user.id, email: request.clientEmail },
        select: { id: true },
      });
      if (client) clientId = client.id;
    }

    // Build notes from request fields
    const notesParts: string[] = [];
    notesParts.push(`Customer: ${request.clientName}`);
    if (request.clientEmail) notesParts.push(`Email: ${request.clientEmail}`);
    notesParts.push(`File: ${request.originalName}`);
    if (request.description) notesParts.push(`Notes: ${request.description}`);

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          userId: user.id,
          clientId,
          notes: notesParts.join("\n"),
        },
        include: {
          quote: { select: { quoteNumber: true, total: true } },
          client: { select: { id: true, name: true, email: true } },
          printer: { select: { name: true } },
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: created.id,
          fromStatus: null,
          toStatus: "QUEUED",
        },
      });

      // Update request status to REVIEWED
      await tx.quoteRequest.update({
        where: { id: request.id },
        data: { status: "REVIEWED" },
      });

      return created;
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create job from request:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
