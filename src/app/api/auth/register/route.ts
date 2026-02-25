import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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

    const { name, email, password } = parsed.data;

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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Auto-assign SUPER_ADMIN role if email matches ADMIN_EMAIL env var
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const role = adminEmail && email.toLowerCase() === adminEmail ? "SUPER_ADMIN" : "USER";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
