import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const updatePrinterSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  model: z.string().optional().nullable(),
  purchasePrice: z.number().min(0).optional(),
  lifetimeHours: z.number().min(1, "Lifetime hours must be at least 1").optional(),
  powerWatts: z.number().min(0).optional(),
  bedSizeX: z.number().min(0).optional().nullable(),
  bedSizeY: z.number().min(0).optional().nullable(),
  bedSizeZ: z.number().min(0).optional().nullable(),
  currentHours: z.number().min(0).optional(),
  maintenanceCostPerHour: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;
    const printer = await prisma.printer.findFirst({
      where: { id, userId: user.id },
    });

    if (!printer) {
      return NextResponse.json(
        { error: "Printer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(printer);
  } catch (error) {
    console.error("Failed to fetch printer:", error);
    return NextResponse.json(
      { error: "Failed to fetch printer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    // Verify the printer belongs to the user
    const existing = await prisma.printer.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Printer not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updatePrinterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const printer = await prisma.printer.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(printer);
  } catch (error) {
    console.error("Failed to update printer:", error);
    return NextResponse.json(
      { error: "Failed to update printer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    // Verify the printer belongs to the user
    const existing = await prisma.printer.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Printer not found" },
        { status: 404 }
      );
    }

    await prisma.printer.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete printer:", error);
    return NextResponse.json(
      { error: "Failed to delete printer" },
      { status: 500 }
    );
  }
}
