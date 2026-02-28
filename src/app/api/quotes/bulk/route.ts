import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["change_status", "delete"]),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const rl = rateLimit(`quotes-bulk:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ids, action, status } = parsed.data;

    if (action === "change_status") {
      if (!status) {
        return NextResponse.json({ error: "Status is required for change_status action" }, { status: 400 });
      }
      const result = await prisma.quote.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { status },
      });
      return NextResponse.json({ updated: result.count });
    }

    if (action === "delete") {
      const result = await prisma.quote.deleteMany({
        where: { id: { in: ids }, userId: user.id },
      });
      return NextResponse.json({ deleted: result.count });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bulk quote action failed:", error);
    return NextResponse.json({ error: "Bulk action failed" }, { status: 500 });
  }
}
