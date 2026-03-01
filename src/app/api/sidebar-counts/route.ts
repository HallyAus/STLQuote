import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const [queuedJobs, pendingRequests] = await Promise.all([
      prisma.job.count({ where: { userId: user.id, status: "QUEUED" } }),
      prisma.quoteRequest.count({ where: { userId: user.id, status: "PENDING" } }),
    ]);

    return NextResponse.json({ queuedJobs, pendingRequests });
  } catch (error) {
    console.error("Failed to fetch sidebar counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch sidebar counts" },
      { status: 500 }
    );
  }
}
