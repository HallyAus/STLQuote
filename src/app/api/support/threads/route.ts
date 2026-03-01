import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, escapeHtml } from "@/lib/email";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

// GET /api/support/threads — list user's threads (admins see all)
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const where: Record<string, unknown> = {};
  if (!isAdmin) where.userId = user.id;
  if (status && status !== "all") where.status = status;

  const threads = await prisma.supportThread.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, isStaffReply: true, createdAt: true },
      },
    },
    orderBy: { lastReplyAt: "desc" },
    take: 200,
  });

  return NextResponse.json(threads);
}

// POST /api/support/threads — create new thread + first message
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`support:create:${user.id}`, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  });
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { subject, message, priority } = parsed.data;

  const thread = await prisma.$transaction(async (tx) => {
    const t = await tx.supportThread.create({
      data: {
        userId: user.id,
        subject,
        priority,
      },
    });

    await tx.supportMessage.create({
      data: {
        threadId: t.id,
        authorId: user.id,
        content: message,
        isStaffReply: false,
      },
    });

    return t;
  });

  // Email notification to admin (fire and forget)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";
    const priorityBadge = priority !== "normal"
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${priority === "urgent" ? "#ef4444" : priority === "high" ? "#f97316" : "#6b7280"};color:white;margin-left:8px;">${priority.toUpperCase()}</span>`
      : "";

    sendEmail({
      to: adminEmail,
      subject: `New support message from ${user.name || user.email || "a user"}: ${subject}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;">
          <div style="padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a;">New Support Message ${priorityBadge}</h2>
            <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
              From <strong>${escapeHtml(user.name || "Unknown")}</strong> (${escapeHtml(user.email || "no email")})
            </p>
            <div style="padding:16px;background:white;border-radius:6px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a;">${escapeHtml(subject)}</p>
              <p style="margin:0;font-size:14px;color:#334155;white-space:pre-wrap;">${escapeHtml(message)}</p>
            </div>
            <div style="margin-top:16px;">
              <a href="${appUrl}/support/${thread.id}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
                Reply in Printforge
              </a>
            </div>
          </div>
        </div>
      `,
      type: "other",
      userId: user.id,
    }).catch(() => {});
  }

  return NextResponse.json(thread, { status: 201 });
}
