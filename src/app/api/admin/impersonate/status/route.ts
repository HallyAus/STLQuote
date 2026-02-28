import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyImpersonation } from "@/lib/impersonation";

export async function GET() {
  try {
    // Use raw session (not getSessionUser) to get the real admin identity
    const session = await auth();
    const role = session?.user?.role;
    if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ impersonating: false });
    }

    const cookieStore = await cookies();
    const rawCookie = cookieStore.get("impersonate-user-id")?.value;

    if (!rawCookie) {
      return NextResponse.json({ impersonating: false });
    }

    // Verify HMAC signature before trusting the cookie
    const targetId = verifyImpersonation(rawCookie, session.user.id);
    if (!targetId) {
      return NextResponse.json({ impersonating: false });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
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
