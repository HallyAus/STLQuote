import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Find the waitlist entry
    const entry = await prisma.waitlist.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Waitlist entry not found" },
        { status: 404 }
      );
    }

    if (entry.status !== "pending") {
      return NextResponse.json(
        { error: `Entry is already ${entry.status}` },
        { status: 400 }
      );
    }

    // Generate readable temp password (PF-xxxx-xxxx)
    const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
    const seg = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join("");
    const tempPassword = `PF-${seg()}-${seg()}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create user and update waitlist in a transaction
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          name: entry.name,
          email: entry.email,
          passwordHash,
          emailVerified: new Date(),
          mustChangePassword: true,
          role: "USER",
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
      }),
      prisma.waitlist.update({
        where: { id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      }),
    ]);

    // Auto-populate settings with business name from waitlist
    if (entry.businessName) {
      prisma.settings
        .upsert({
          where: { userId: user.id },
          create: { userId: user.id, businessName: entry.businessName },
          update: { businessName: entry.businessName },
        })
        .catch(() => {});
    }

    // Log trial started event (non-blocking)
    prisma.subscriptionEvent
      .create({
        data: {
          userId: user.id,
          action: "trial_started",
          detail: `14-day Pro trial started via waitlist approval, expires ${trialEndsAt.toISOString()}`,
        },
      })
      .catch(() => {});

    // Send welcome email with temp password (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    sendEmail({
      to: entry.email,
      subject: "Welcome to Printforge! Your account is ready",
      type: "waitlist_approved",
      userId: user.id,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Welcome, ${escapeHtml(entry.name)}!</h2>${entry.businessName ? `\n        <p style="color: #666; font-size: 14px;">Business: ${escapeHtml(entry.businessName)}</p>` : ""}
        <p>Great news — your Printforge account has been approved!</p>
        <p>Sign in with your temporary password below. You'll be asked to set a new password on first login.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Your temporary password</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; font-family: monospace; color: #171717; letter-spacing: 0.1em;">${tempPassword}</p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Sign In Now
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Your 14-day Pro trial has started. Enjoy full access to all features!</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>`,
    }).catch(() => {});

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Waitlist approval failed:", error);
    return NextResponse.json(
      { error: "Waitlist approval failed" },
      { status: 500 }
    );
  }
}
