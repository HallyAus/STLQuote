import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { generateToken } from "@/lib/tokens";

// GET — list user's upload links
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const links = await prisma.uploadLink.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { quoteRequests: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Failed to fetch upload links:", error);
    return NextResponse.json({ error: "Failed to fetch upload links" }, { status: 500 });
  }
}

// POST — create a new upload link
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const rl = rateLimit(`upload-links:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const label = (body.label || "Default").trim().slice(0, 100);

    const link = await prisma.uploadLink.create({
      data: {
        userId: user.id,
        token: generateToken(),
        label,
      },
      include: {
        _count: { select: { quoteRequests: true } },
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Failed to create upload link:", error);
    return NextResponse.json({ error: "Failed to create upload link" }, { status: 500 });
  }
}
