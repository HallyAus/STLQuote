import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

const updateItemSchema = z.object({
  materialId: z.string().optional().nullable(),
  partNumber: z.string().optional().nullable(),
  supplierSku: z.string().optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id, itemId } = await params;

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

    // Verify item belongs to this supplier
    const existing = await prisma.supplierItem.findFirst({
      where: { id: itemId, supplierId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Supplier item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data: Record<string, unknown> = { ...parsed.data };
    if (data.materialId !== undefined) data.materialId = (data.materialId as string)?.trim() || null;
    if (data.partNumber !== undefined) data.partNumber = (data.partNumber as string)?.trim() || null;
    if (data.supplierSku !== undefined) data.supplierSku = (data.supplierSku as string)?.trim() || null;
    if (data.url !== undefined) data.url = (data.url as string)?.trim() || null;
    if (data.notes !== undefined) data.notes = (data.notes as string)?.trim() || null;

    const item = await prisma.supplierItem.update({
      where: { id: itemId },
      data,
      include: {
        material: {
          select: { materialType: true, brand: true, colour: true },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update supplier item:", error);
    return NextResponse.json(
      { error: "Failed to update supplier item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id, itemId } = await params;

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

    // Verify item belongs to this supplier
    const existing = await prisma.supplierItem.findFirst({
      where: { id: itemId, supplierId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Supplier item not found" },
        { status: 404 }
      );
    }

    await prisma.supplierItem.delete({ where: { id: itemId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete supplier item:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier item" },
      { status: 500 }
    );
  }
}
