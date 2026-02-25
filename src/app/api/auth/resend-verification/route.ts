import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createEmailVerificationToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "No email on account" }, { status: 400 });
    }

    // Rate limit: 3 per 15 minutes per user
    const ip = getClientIp(request);
    const result = rateLimit(`resend-verification:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 3,
    });
    if (result.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }

    const token = await createEmailVerificationToken(user.email);
    await sendVerificationEmail(user.email, token);

    return NextResponse.json({ message: "Verification email sent." });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
