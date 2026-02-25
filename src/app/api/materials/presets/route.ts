import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MATERIAL_PRESETS } from "@/lib/presets";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  return NextResponse.json(MATERIAL_PRESETS);
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
      presetIndex >= MATERIAL_PRESETS.length
    ) {
      return NextResponse.json(
        { error: "Invalid preset index" },
        { status: 400 }
      );
    }

    const preset = MATERIAL_PRESETS[presetIndex];

    const material = await prisma.material.create({
      data: {
        type: preset.type,
        materialType: preset.materialType,
        brand: preset.brand,
        colour: preset.colour,
        spoolWeightG: preset.spoolWeightG,
        price: preset.price,
        density: preset.density,
        userId: user.id,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Failed to create material from preset:", error);
    return NextResponse.json(
      { error: "Failed to create material from preset" },
      { status: 500 }
    );
  }
}
