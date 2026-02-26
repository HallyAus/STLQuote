import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Find the waitlist entry
    const entry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    if (entry.status !== "pending") {
      return NextResponse.json(
        { error: `Entry is already ${entry.status}` },
        { status: 400 }
      );
    }

    await prisma.waitlist.update({
      where: { id },
      data: { status: "rejected" },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Waitlist rejection failed:", error);
    return NextResponse.json(
      { error: "Waitlist rejection failed" },
      { status: 500 }
    );
  }
}
