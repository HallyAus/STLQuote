import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const createItemSchema = z.object({
  materialId: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  supplierSku: z.string().optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireFeature("suppliers");

    const { id } = await params;

    // Verify supplier ownership
    const supplier = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const items = await prisma.supplierItem.findMany({
      where: { supplierId: id },
      include: {
        material: {
          select: { materialType: true, brand: true, colour: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch supplier items:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier items" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireFeature("suppliers");

    const { id } = await params;

    // Verify supplier ownership
    const supplier = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data = {
      ...parsed.data,
      materialId: parsed.data.materialId?.trim() || null,
      partNumber: parsed.data.partNumber?.trim() || null,
      supplierSku: parsed.data.supplierSku?.trim() || null,
      url: parsed.data.url?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    };

    const item = await prisma.supplierItem.create({
      data: {
        ...data,
        supplierId: id,
      },
      include: {
        material: {
          select: { materialType: true, brand: true, colour: true },
        },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to create supplier item:", error);
    return NextResponse.json(
      { error: "Failed to create supplier item" },
      { status: 500 }
    );
  }
}
