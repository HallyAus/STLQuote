import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Use raw session (not getSessionUser) to get the real admin identity
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ impersonating: false });
    }

    const cookieStore = await cookies();
    const impUserId = cookieStore.get("impersonate-user-id")?.value;

    if (!impUserId) {
      return NextResponse.json({ impersonating: false });
    }

    const target = await prisma.user.findUnique({
      where: { id: impUserId },
      select: { name: true, email: true },
    });

    return NextResponse.json({
      impersonating: true,
      name: target?.name || target?.email || "Unknown",
    });
  } catch {
    return NextResponse.json({ impersonating: false });
  }
}
