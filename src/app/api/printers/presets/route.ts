import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRINTER_PRESETS } from "@/lib/presets";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  return NextResponse.json(PRINTER_PRESETS);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const { presetIndex } = body;

    if (
      typeof presetIndex !== "number" ||
      presetIndex < 0 ||
      presetIndex >= PRINTER_PRESETS.length
    ) {
      return NextResponse.json(
        { error: "Invalid preset index" },
        { status: 400 }
      );
    }

    const preset = PRINTER_PRESETS[presetIndex];

    const printer = await prisma.printer.create({
      data: {
        name: preset.name,
        model: preset.model,
        purchasePrice: preset.purchasePrice,
        lifetimeHours: preset.lifetimeHours,
        powerWatts: preset.powerWatts,
        bedSizeX: preset.bedSizeX,
        bedSizeY: preset.bedSizeY,
        bedSizeZ: preset.bedSizeZ,
        maintenanceCostPerHour: preset.maintenanceCostPerHour,
        userId: user.id,
      },
    });

    return NextResponse.json(printer, { status: 201 });
  } catch (error) {
    console.error("Failed to create printer from preset:", error);
    return NextResponse.json(
      { error: "Failed to create printer from preset" },
      { status: 500 }
    );
  }
}
