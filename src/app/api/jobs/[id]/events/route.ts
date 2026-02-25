import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const events = await prisma.jobEvent.findMany({
      where: { jobId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch job events:", error);
    return NextResponse.json(
      { error: "Failed to fetch job events" },
      { status: 500 }
    );
  }
}
