import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendEmail, escapeHtml } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const waitlistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  businessName: z.string().optional(),
});

// GET — list all waitlist entries (admin only)
export async function GET() {
  try {
    await requireAdmin();

    const entries = await prisma.waitlist.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch waitlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    );
  }
}

// POST — public signup (no auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, businessName } = parsed.data;

    // Rate limit: 5 signups per 15 min per IP
    const ip = getClientIp(request);
    const rl = rateLimit(`waitlist:${ip}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    // Check if email already registered (generic message to prevent enumeration)
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: { email },
    });
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingWaitlist || existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        name,
        email,
        businessName: businessName || null,
        status: "pending",
      },
    });

    const safeName = escapeHtml(name);
    const safeBusiness = businessName ? escapeHtml(businessName) : null;

    // Send confirmation email to the user (fire-and-forget)
    sendEmail({
      to: email,
      subject: "You're on the Printforge waitlist!",
      type: "waitlist",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Hey ${safeName}!</h2>
        <p>Thanks for signing up for Printforge Quote. You're on the waitlist!</p>
        <p>We'll send you an email as soon as your account is ready. In the meantime, feel free to reply to this email if you have any questions.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>`,
    }).catch(() => {});

    // Notify admin of new waitlist signup (fire-and-forget)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";
      sendEmail({
        to: adminEmail,
        subject: `New waitlist signup: ${name}${businessName ? ` (${businessName})` : ""}`,
        type: "admin_notification",
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #171717;">New Waitlist Signup</h2>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${escapeHtml(email)}</td></tr>
            ${safeBusiness ? `<tr><td style="padding: 8px 0; color: #666;">Business</td><td style="padding: 8px 0;">${safeBusiness}</td></tr>` : ""}
          </table>
          <p style="margin: 24px 0;">
            <a href="${appUrl}/admin" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Review in Admin Portal
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Printforge — Admin Notification</p>
        </div>`,
      }).catch(() => {});
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Waitlist signup failed:", error);
    return NextResponse.json(
      { error: "Waitlist signup failed" },
      { status: 500 }
    );
  }
}
