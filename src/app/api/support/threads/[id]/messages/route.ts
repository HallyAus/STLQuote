import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, escapeHtml } from "@/lib/email";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// POST /api/support/threads/[id]/messages — add a reply
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`support:reply:${user.id}`, {
    windowMs: 5 * 60 * 1000,
    maxRequests: 20,
  });
  if (rl.limited) {
    return NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && thread.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isStaffReply = isAdmin;

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.supportMessage.create({
      data: {
        threadId: id,
        authorId: user.id,
        content: parsed.data.content,
        isStaffReply,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Re-open thread if user replies to resolved thread
    const updates: Record<string, unknown> = { lastReplyAt: new Date() };
    if (!isStaffReply && thread.status === "resolved") {
      updates.status = "open";
    }

    await tx.supportThread.update({ where: { id }, data: updates });

    return msg;
  });

  // Email notifications (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";

  if (isStaffReply) {
    // Notify the user that staff replied
    const userEmail = thread.user.email;
    if (userEmail) {
      sendEmail({
        to: userEmail,
        subject: `Reply to your support request: ${thread.subject}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;">
            <div style="padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
              <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a;">Support Reply</h2>
              <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
                Re: <strong>${escapeHtml(thread.subject)}</strong>
              </p>
              <div style="padding:16px;background:white;border-radius:6px;border:1px solid #e2e8f0;">
                <p style="margin:0;font-size:14px;color:#334155;white-space:pre-wrap;">${escapeHtml(parsed.data.content)}</p>
              </div>
              <div style="margin-top:16px;">
                <a href="${appUrl}/support/${thread.id}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">
                  View Conversation
                </a>
              </div>
              <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">
                You can reply directly in Printforge by clicking the button above.
              </p>
            </div>
          </div>
        `,
        type: "other",
        userId: thread.userId,
      }).catch(() => {});
    }
  } else {
    // Notify admin that user replied
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        subject: `Support reply from ${thread.user.name || thread.user.email || "user"}: ${thread.subject}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;">
            <div style="padding:20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
              <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a;">New Reply on Support Thread</h2>
              <p style="margin:0 0 16px;font-size:13px;color:#64748b;">
                From <strong>${escapeHtml(thread.user.name || "Unknown")}</strong> — Re: ${escapeHtml(thread.subject)}
              </p>
              <div style="padding:16px;background:white;border-radius:6px;border:1px solid #e2e8f0;">
                <p style="margin:0;font-size:14px;color:#334155;white-space:pre-wrap;">${escapeHtml(parsed.data.content)}</p>
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
  }

  return NextResponse.json(message, { status: 201 });
}
