import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const loadSchema = z.object({
  printerId: z.string().min(1),
  materialId: z.string().min(1),
  weightLoadedG: z.number().positive().optional(),
  notes: z.string().optional(),
});

const unloadSchema = z.object({
  id: z.string().min(1),
  weightUsedG: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/printer-loads — List active loads (unloadedAt is null) for the user.
 * Optional query params: printerId, materialId
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const url = new URL(request.url);
    const printerId = url.searchParams.get("printerId");
    const materialId = url.searchParams.get("materialId");
    const includeHistory = url.searchParams.get("history") === "true";

    const where: Record<string, unknown> = { userId: user.id };
    if (!includeHistory) where.unloadedAt = null;
    if (printerId) where.printerId = printerId;
    if (materialId) where.materialId = materialId;

    const loads = await prisma.printerLoad.findMany({
      where,
      include: {
        printer: { select: { id: true, name: true } },
        material: {
          select: {
            id: true,
            materialType: true,
            brand: true,
            colour: true,
            spoolWeightG: true,
          },
        },
      },
      orderBy: { loadedAt: "desc" },
      take: 100,
    });

    return NextResponse.json(loads);
  } catch (error) {
    console.error("Failed to fetch printer loads:", error);
    return NextResponse.json({ error: "Failed to fetch printer loads" }, { status: 500 });
  }
}

/**
 * POST /api/printer-loads — Load a material onto a printer.
 * Auto-unloads any existing material on that printer first.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = loadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { printerId, materialId, weightLoadedG, notes } = parsed.data;

    // Verify printer and material belong to user
    const [printer, material] = await Promise.all([
      prisma.printer.findFirst({ where: { id: printerId, userId: user.id } }),
      prisma.material.findFirst({ where: { id: materialId, userId: user.id } }),
    ]);

    if (!printer) return NextResponse.json({ error: "Printer not found" }, { status: 404 });
    if (!material) return NextResponse.json({ error: "Material not found" }, { status: 404 });

    // Auto-unload existing material on this printer
    await prisma.printerLoad.updateMany({
      where: { printerId, userId: user.id, unloadedAt: null },
      data: { unloadedAt: new Date() },
    });

    const load = await prisma.printerLoad.create({
      data: {
        userId: user.id,
        printerId,
        materialId,
        weightLoadedG: weightLoadedG ?? material.spoolWeightG,
        notes,
      },
      include: {
        printer: { select: { id: true, name: true } },
        material: {
          select: {
            id: true,
            materialType: true,
            brand: true,
            colour: true,
            spoolWeightG: true,
          },
        },
      },
    });

    return NextResponse.json(load, { status: 201 });
  } catch (error) {
    console.error("Failed to load material:", error);
    return NextResponse.json({ error: "Failed to load material" }, { status: 500 });
  }
}

/**
 * PUT /api/printer-loads — Unload a material from a printer.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = unloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, weightUsedG, notes } = parsed.data;

    const existing = await prisma.printerLoad.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Load not found" }, { status: 404 });
    if (existing.unloadedAt) return NextResponse.json({ error: "Already unloaded" }, { status: 400 });

    const load = await prisma.printerLoad.update({
      where: { id },
      data: {
        unloadedAt: new Date(),
        weightUsedG,
        notes: notes ?? existing.notes,
      },
      include: {
        printer: { select: { id: true, name: true } },
        material: {
          select: {
            id: true,
            materialType: true,
            brand: true,
            colour: true,
          },
        },
      },
    });

    return NextResponse.json(load);
  } catch (error) {
    console.error("Failed to unload material:", error);
    return NextResponse.json({ error: "Failed to unload material" }, { status: 500 });
  }
}
