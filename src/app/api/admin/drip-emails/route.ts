import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { DRIP_SEQUENCE } from "@/lib/drip-emails";
import { sendEmail, escapeHtml, unsubscribeFooter } from "@/lib/email";
import { z } from "zod";

/**
 * GET /api/admin/drip-emails
 *
 * List all users with their drip email progress.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Get system toggle state
    const toggle = await prisma.systemConfig.findUnique({
      where: { key: "dripEmailsEnabled" },
      select: { value: true },
    });
    const enabled = toggle?.value !== "false"; // default true if not set

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          marketingUnsubscribed: true,
          dripEmails: {
            select: { emailKey: true, sentAt: true },
            orderBy: { sentAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    const totalEmails = DRIP_SEQUENCE.length;

    const result = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      emailsSent: user.dripEmails.length,
      totalEmails,
      lastSentAt: user.dripEmails[0]?.sentAt?.toISOString() || null,
      lastSentKey: user.dripEmails[0]?.emailKey || null,
      unsubscribed: user.marketingUnsubscribed,
    }));

    return NextResponse.json({
      users: result,
      pagination: {
        page,
        total,
        totalPages: Math.ceil(total / limit),
      },
      enabled,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Admin drip emails list error:", error);
    return NextResponse.json({ error: "Failed to fetch drip email data" }, { status: 500 });
  }
}

/**
 * POST /api/admin/drip-emails
 *
 * Manually trigger the next drip email for a specific user.
 * Bypasses the 24h gap — admin override.
 */
const triggerSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const rl = rateLimit(`admin-drip-trigger:${admin.id}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 50,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = triggerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { userId } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        createdAt: true,
        trialEndsAt: true,
        marketingUnsubscribed: true,
        dripEmails: {
          select: { emailKey: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.email) {
      return NextResponse.json({ sent: false, reason: "no_email" });
    }

    if (user.marketingUnsubscribed) {
      return NextResponse.json({ sent: false, reason: "unsubscribed" });
    }

    // Find the next unsent email in sequence
    const sentKeys = new Set(user.dripEmails.map((d) => d.emailKey));
    const nextDrip = DRIP_SEQUENCE.find((drip) => !sentKeys.has(drip.key));

    if (!nextDrip) {
      return NextResponse.json({ sent: false, reason: "all_sent" });
    }

    // Send the email (admin override — no dayOffset or gap check)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";
    const name = escapeHtml(user.name?.split(" ")[0] || "there");
    const trialDaysLeft = user.trialEndsAt
      ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    const html = nextDrip.html(name, appUrl, trialDaysLeft, userId);
    const ok = await sendEmail({
      to: user.email,
      subject: nextDrip.subject,
      html,
      type: "drip",
      userId,
    });

    if (ok) {
      await prisma.dripEmailLog.create({
        data: { userId, emailKey: nextDrip.key },
      }).catch(() => {
        // Unique constraint = already sent (race condition), ignore
      });

      return NextResponse.json({
        sent: true,
        emailKey: nextDrip.key,
        subject: nextDrip.subject,
      });
    }

    return NextResponse.json({ sent: false, reason: "send_failed" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Admin drip trigger error:", error);
    return NextResponse.json({ error: "Failed to trigger drip email" }, { status: 500 });
  }
}
