import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendAccountCreatedEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "User not found or has no email" }, { status: 404 });
    }

    // Rate limit: 3 per hour per target user
    const rl = rateLimit(`resend-welcome:${id}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: `Too many sends for this user. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const resetToken = await createPasswordResetToken(user.email);
    const sent = await sendAccountCreatedEmail(user.email, user.name || "User", resetToken, admin.id);

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send. Check email configuration." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: `Welcome email resent to ${user.email}` });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Resend welcome email error:", error);
    return NextResponse.json({ error: "Failed to resend welcome email" }, { status: 500 });
  }
}
