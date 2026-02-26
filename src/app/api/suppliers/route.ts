import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireFeature } from "@/lib/auth-helpers";

const createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireFeature("suppliers");

    const suppliers = await prisma.supplier.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { items: true } },
      },
      take: 500,
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("suppliers");

    const body = await request.json();
    const parsed = createSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data = {
      ...parsed.data,
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      website: parsed.data.website?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    };

    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        userId: user.id,
      },
      include: {
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Failed to create supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
