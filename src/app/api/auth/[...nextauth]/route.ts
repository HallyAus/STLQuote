import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const { GET } = handlers;

// Wrap POST with rate limiting (10 login attempts per 15 minutes per IP)
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const result = rateLimit(`auth:${ip}`, {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  });
  if (result.limited) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      }
    );
  }

  return handlers.POST(request);
}
