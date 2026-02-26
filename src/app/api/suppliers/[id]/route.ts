import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const updateSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireFeature("suppliers");

    const { id } = await params;
    const supplier = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
      include: {
        items: {
          include: {
            material: {
              select: { materialType: true, brand: true, colour: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Failed to fetch supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireFeature("suppliers");

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data: Record<string, unknown> = { ...parsed.data };
    if (data.email !== undefined) data.email = (data.email as string)?.trim() || null;
    if (data.phone !== undefined) data.phone = (data.phone as string)?.trim() || null;
    if (data.website !== undefined) data.website = (data.website as string)?.trim() || null;
    if (data.notes !== undefined) data.notes = (data.notes as string)?.trim() || null;

    const supplier = await prisma.supplier.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            material: {
              select: { materialType: true, brand: true, colour: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Failed to update supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireFeature("suppliers");

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    await prisma.supplier.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
