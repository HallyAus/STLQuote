import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createPrinterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().optional().nullable(),
  purchasePrice: z.number().min(0).default(0),
  lifetimeHours: z.number().min(1, "Lifetime hours must be at least 1").default(5000),
  powerWatts: z.number().min(0).default(200),
  bedSizeX: z.number().min(0).optional().nullable(),
  bedSizeY: z.number().min(0).optional().nullable(),
  bedSizeZ: z.number().min(0).optional().nullable(),
  currentHours: z.number().min(0).default(0),
  maintenanceCostPerHour: z.number().min(0).default(0.5),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const printers = await prisma.printer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(printers);
  } catch (error) {
    console.error("Failed to fetch printers:", error);
    return NextResponse.json(
      { error: "Failed to fetch printers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createPrinterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const printer = await prisma.printer.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(printer, { status: 201 });
  } catch (error) {
    console.error("Failed to create printer:", error);
    return NextResponse.json(
      { error: "Failed to create printer" },
      { status: 500 }
    );
  }
}
