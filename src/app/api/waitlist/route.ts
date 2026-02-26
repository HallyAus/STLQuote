import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";

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

    // Check if email already on waitlist
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: { email },
    });

    if (existingWaitlist) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 409 }
      );
    }

    // Check if email already has a user account
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
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

    // Send confirmation email (fire-and-forget)
    sendEmail({
      to: email,
      subject: "You're on the Printforge waitlist!",
      type: "waitlist",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Hey ${name}!</h2>
        <p>Thanks for signing up for Printforge Quote. You're on the waitlist!</p>
        <p>We'll send you an email as soon as your account is ready. In the meantime, feel free to reply to this email if you have any questions.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>`,
    }).catch(() => {});

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
