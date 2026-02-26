import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const [printerCount, materialCount, quoteCount, clientCount, jobCount] =
      await Promise.all([
        prisma.printer.count({ where: { userId: user.id } }),
        prisma.material.count({ where: { userId: user.id } }),
        prisma.quote.count({ where: { userId: user.id } }),
        prisma.client.count({ where: { userId: user.id } }),
        prisma.job.count({ where: { userId: user.id } }),
      ]);

    return NextResponse.json({
      printerCount,
      materialCount,
      quoteCount,
      clientCount,
      jobCount,
    });
  } catch (error) {
    console.error("Failed to fetch onboarding status:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}
