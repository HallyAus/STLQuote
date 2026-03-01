import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const scanSchema = z.object({
  code: z.string().min(1, "Code is required").max(500),
});

/**
 * POST /api/materials/scan — Lookup material by barcode or QR code.
 * Searches the `barcode` field on Material for an exact match (user-scoped).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = scanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    // Search barcode field (exact match)
    const material = await prisma.material.findFirst({
      where: { userId: user.id, barcode: code },
      include: {
        printerLoads: {
          where: { unloadedAt: null },
          include: { printer: { select: { id: true, name: true } } },
          orderBy: { loadedAt: "desc" },
        },
      },
    });

    if (!material) {
      return NextResponse.json(
        { error: "No material found for this code", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error("Failed to scan material:", error);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
