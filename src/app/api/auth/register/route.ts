import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail, sendWelcomeEmail, sendEmail, escapeHtml } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long")
    .refine((p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p), { message: "Password must include uppercase, lowercase, and a number" }),
  businessName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check if registration is open
    const regConfig = await prisma.systemConfig.findUnique({ where: { key: "registrationOpen" } }).catch(() => null);
    if (regConfig?.value === "false") {
      return NextResponse.json(
        { error: "Registration is currently closed. Contact your administrator." },
        { status: 403 }
      );
    }

    // Rate limit: 5 registrations per 15 minutes per IP
    const ip = getClientIp(request);
    const result = rateLimit(`register:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });
    if (result.limited) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, businessName } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if already on waitlist — same generic message to prevent enumeration
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingWaitlist) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Determine if waitlist mode is active
    // When registrationOpen is true (or unset), users get direct accounts.
    // A separate "waitlistMode" config can force waitlisting even when registration is open.
    const waitlistConfig = await prisma.systemConfig.findUnique({ where: { key: "waitlistMode" } }).catch(() => null);
    const waitlistMode = waitlistConfig?.value === "true";

    // Admin email always gets SUPER_ADMIN role
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = adminEmail && email.toLowerCase() === adminEmail;

    // Direct account creation (open registration or admin email)
    if (isAdmin || !waitlistMode) {
      const passwordHash = await bcrypt.hash(password, 12);
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: isAdmin ? "SUPER_ADMIN" : "USER",
          subscriptionTier: "free",
          subscriptionStatus: "trialing",
          trialEndsAt,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Log trial started event
      await prisma.subscriptionEvent.create({
        data: {
          userId: user.id,
          action: "trial_started",
          detail: `14-day Pro trial started, expires ${trialEndsAt.toISOString()}`,
        },
      }).catch(() => { /* non-blocking */ });

      // Send verification + welcome emails (non-blocking)
      try {
        if (email) {
          const token = await createEmailVerificationToken(email);
          await sendVerificationEmail(email, token);
          await sendWelcomeEmail(email, name);
        }
      } catch (emailError) {
        console.error("Failed to send registration emails:", emailError);
      }

      // Notify admin of new signup (non-blocking, skip if the admin is registering)
      if (!isAdmin) {
        const adminNotifyEmail = process.env.ADMIN_EMAIL;
        if (adminNotifyEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";
          sendEmail({
            to: adminNotifyEmail,
            subject: `New signup: ${name}${businessName ? ` (${businessName})` : ""}`,
            type: "admin_notification",
            html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #171717;">New User Signup</h2>
              <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                <tr><td style="padding: 8px 0; color: #666; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(name)}</td></tr>
                <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${escapeHtml(email)}</td></tr>
                ${businessName ? `<tr><td style="padding: 8px 0; color: #666;">Business</td><td style="padding: 8px 0;">${escapeHtml(businessName)}</td></tr>` : ""}
              </table>
              <p style="margin: 24px 0;">
                <a href="${appUrl}/admin" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                  View in Admin Portal
                </a>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">Printforge — Admin Notification</p>
            </div>`,
          }).catch(() => {});
        }
      }

      return NextResponse.json(user, { status: 201 });
    }

    // Waitlist mode is active — add to waitlist instead of creating an account
    const entry = await prisma.waitlist.create({
      data: {
        name,
        email,
        businessName: businessName || null,
        status: "pending",
      },
    });

    // Send waitlist confirmation email (fire-and-forget)
    sendEmail({
      to: email,
      subject: "You're on the Printforge waitlist!",
      type: "waitlist",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Hey ${escapeHtml(name)}!</h2>
        <p>Thanks for signing up for Printforge Quote. You're on the waitlist!</p>
        <p>We'll send you an email as soon as your account is ready. In the meantime, feel free to reply to this email if you have any questions.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>`,
    }).catch(() => {});

    // Notify admin (fire-and-forget)
    const adminNotifyEmail = process.env.ADMIN_EMAIL;
    if (adminNotifyEmail) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";
      sendEmail({
        to: adminNotifyEmail,
        subject: `New waitlist signup: ${name}${businessName ? ` (${businessName})` : ""}`,
        type: "admin_notification",
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #171717;">New Waitlist Signup</h2>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px 0; color: #666; width: 120px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${escapeHtml(email)}</td></tr>
            ${businessName ? `<tr><td style="padding: 8px 0; color: #666;">Business</td><td style="padding: 8px 0;">${escapeHtml(businessName)}</td></tr>` : ""}
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

    return NextResponse.json(
      {
        waitlist: true,
        message: "You've been added to the waitlist! We'll email you when your account is ready.",
        id: entry.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
