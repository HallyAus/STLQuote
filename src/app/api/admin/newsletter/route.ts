import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendBulkEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const newsletterSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "Body is required"),
  audience: z.enum(["all", "active", "admins"]).default("all"),
});

// GET: fetch available recipients count
export async function GET() {
  try {
    await requireAdmin();

    const [all, active, admins] = await Promise.all([
      prisma.user.count({ where: { disabled: false, email: { not: null } } }),
      prisma.user.count({
        where: { disabled: false, email: { not: null }, lastLogin: { not: null } },
      }),
      prisma.user.count({
        where: { disabled: false, email: { not: null }, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      }),
    ]);

    return NextResponse.json({ all, active, admins });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}

// POST: send newsletter
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    // Rate limit: 1 newsletter per 60 min per admin
    const rl = rateLimit(`newsletter:${admin.id}`, { windowMs: 60 * 60 * 1000, maxRequests: 1 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Newsletter already sent recently. Please wait before sending another." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = newsletterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subject, html, audience } = parsed.data;

    // Build query based on audience
    const where: Record<string, unknown> = {
      disabled: false,
      email: { not: null },
    };
    if (audience === "active") {
      where.lastLogin = { not: null };
    } else if (audience === "admins") {
      where.role = { in: ["ADMIN", "SUPER_ADMIN"] };
    }

    const users = await prisma.user.findMany({
      where,
      select: { email: true },
    });

    const recipients = users
      .map((u) => u.email)
      .filter((e): e is string => !!e);

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients match the selected audience" },
        { status: 400 }
      );
    }

    const result = await sendBulkEmail({ recipients, subject, html, type: "newsletter", userId: admin.id });

    return NextResponse.json({
      message: `Newsletter sent to ${result.sent} of ${recipients.length} recipients`,
      ...result,
      total: recipients.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Newsletter error:", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
