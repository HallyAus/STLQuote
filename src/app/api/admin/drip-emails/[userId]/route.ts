import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

/**
 * DELETE /api/admin/drip-emails/[userId]
 *
 * Reset a user's drip email sequence by deleting all their DripEmailLog entries.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();

    const { userId } = await params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await prisma.dripEmailLog.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Admin drip reset error:", error);
    return NextResponse.json({ error: "Failed to reset drip emails" }, { status: 500 });
  }
}
