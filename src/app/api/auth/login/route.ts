import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Pre-flight rate limit check for login attempts.
 * The actual authentication is handled by NextAuth's signIn("credentials").
 * The login page calls this first — if rate-limited, it stops before hitting NextAuth.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const check = rateLimit(`login:${ip}`, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,           // 10 attempts per 15 minutes
  });

  if (check.limited) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${check.retryAfterSeconds} seconds.` },
      {
        status: 429,
        headers: { "Retry-After": String(check.retryAfterSeconds) },
      }
    );
  }

  return NextResponse.json({ ok: true });
}
