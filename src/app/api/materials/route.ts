import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { getTierLimits } from "@/lib/tier";

const createMaterialSchema = z.object({
  type: z.enum(["filament", "resin"]).default("filament"),
  materialType: z.string().min(1, "Material type is required"),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  spoolWeightG: z.number().positive("Spool weight must be positive").default(1000),
  price: z.number().nonnegative("Price must be zero or positive"),
  density: z.number().positive("Density must be positive").optional().nullable(),
  stockQty: z.number().int().nonnegative("Stock quantity must be zero or positive").default(0),
  lowStockThreshold: z.number().int().nonnegative("Threshold must be zero or positive").default(2),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  barcode: z.string().max(500).optional().nullable(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const materials = await prisma.material.findMany({
      where: { userId: user.id },
      orderBy: [{ materialType: "asc" }, { brand: "asc" }],
      take: 500,
    });

    return NextResponse.json(materials, {
      headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Failed to fetch materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch materials" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createMaterialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Tier quantity limit
    const limits = getTierLimits(user.effectiveTier);
    if (limits) {
      const count = await prisma.material.count({ where: { userId: user.id } });
      if (count >= limits.materials) {
        return NextResponse.json(
          { error: `Material limit reached (${limits.materials}). Upgrade to Starter for unlimited materials.`, code: "TIER_LIMIT" },
          { status: 403 }
        );
      }
    }

    const material = await prisma.material.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Failed to create material:", error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}
