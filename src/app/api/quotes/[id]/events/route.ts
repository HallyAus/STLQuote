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

    // Verify quote ownership
    const quote = await prisma.quote.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const events = await prisma.quoteEvent.findMany({
      where: { quoteId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch quote events:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote events" },
      { status: 500 }
    );
  }
}
