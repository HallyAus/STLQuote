import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdminRole } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const [queuedJobs, pendingRequests, pendingWaitlist] = await Promise.all([
      prisma.job.count({ where: { userId: user.id, status: "QUEUED" } }),
      prisma.quoteRequest.count({ where: { userId: user.id, status: "PENDING" } }),
      isAdminRole(user.role)
        ? prisma.waitlist.count({ where: { status: "pending" } })
        : Promise.resolve(0),
    ]);

    return NextResponse.json({ queuedJobs, pendingRequests, pendingWaitlist });
  } catch (error) {
    console.error("Failed to fetch sidebar counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch sidebar counts" },
      { status: 500 }
    );
  }
}
