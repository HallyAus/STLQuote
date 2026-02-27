import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmailVerificationToken } from "@/lib/tokens";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 10 attempts per 15 min per IP
    const ip = getClientIp(request);
    const result = rateLimit(`verify-email:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    });
    if (result.limited) {
      return NextResponse.redirect(new URL("/login?error=TooManyAttempts", request.url));
    }

    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=InvalidToken", request.url));
    }

    const tokenResult = await validateEmailVerificationToken(token);

    if (!tokenResult.valid) {
      return NextResponse.redirect(new URL("/login?error=ExpiredToken", request.url));
    }

    await prisma.user.update({
      where: { email: tokenResult.email },
      data: { emailVerified: new Date() },
    });

    return NextResponse.redirect(new URL("/login?verified=true", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/login?error=VerificationFailed", request.url));
  }
}
