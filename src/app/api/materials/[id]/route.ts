import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const TEMP_USER_ID = "temp-user";

const updateMaterialSchema = z.object({
  type: z.enum(["filament", "resin"]).optional(),
  materialType: z.string().min(1, "Material type is required").optional(),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  spoolWeightG: z.number().positive("Spool weight must be positive").optional(),
  price: z.number().nonnegative("Price must be zero or positive").optional(),
  density: z.number().positive("Density must be positive").optional().nullable(),
  stockQty: z.number().int().nonnegative("Stock quantity must be zero or positive").optional(),
  lowStockThreshold: z.number().int().nonnegative("Threshold must be zero or positive").optional(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const material = await prisma.material.findFirst({
      where: { id, userId: TEMP_USER_ID },
    });

    if (!material) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(material);
  } catch (error) {
    console.error("Failed to fetch material:", error);
    return NextResponse.json(
      { error: "Failed to fetch material" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.material.findFirst({
      where: { id, userId: TEMP_USER_ID },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateMaterialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const material = await prisma.material.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error("Failed to update material:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Verify ownership
    const existing = await prisma.material.findFirst({
      where: { id, userId: TEMP_USER_ID },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 }
      );
    }

    await prisma.material.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete material:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
