import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createPasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests per 15 minutes per IP
    const ip = getClientIp(request);
    const result = rateLimit(`forgot-password:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 3,
    });
    if (result.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      // Always return 200 to prevent email enumeration
      return NextResponse.json({ message: "If an account exists, a reset email has been sent." });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      try {
        const token = await createPasswordResetToken(email);
        await sendPasswordResetEmail(email, token);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ message: "If an account exists, a reset email has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
