import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const materialCostSchema = z.object({
  spoolPrice: z.number().min(0),
  spoolWeightG: z.number().min(0),
  printWeightG: z.number().min(0),
  supportWeightG: z.number().min(0),
  wasteFactorPct: z.number().min(0),
});

const machineCostSchema = z.object({
  purchasePrice: z.number().min(0),
  lifetimeHours: z.number().min(1),
  printTimeMinutes: z.number().min(0),
  powerWatts: z.number().min(0),
  electricityRate: z.number().min(0),
  maintenanceCostPerHour: z.number().min(0),
});

const labourCostSchema = z.object({
  designTimeMinutes: z.number().min(0),
  designRate: z.number().min(0),
  setupTimeMinutes: z.number().min(0),
  postProcessingTimeMinutes: z.number().min(0),
  packingTimeMinutes: z.number().min(0),
  labourRate: z.number().min(0),
});

const overheadCostSchema = z.object({
  monthlyOverhead: z.number().min(0),
  estimatedMonthlyJobs: z.number().min(1),
});

const pricingSchema = z.object({
  markupPct: z.number().min(0),
  minimumCharge: z.number().min(0),
  quantity: z.number().min(1),
  rushMultiplier: z.number().min(1),
});

const calculatorInputSchema = z.object({
  material: materialCostSchema,
  machine: machineCostSchema,
  labour: labourCostSchema,
  overhead: overheadCostSchema,
  pricing: pricingSchema,
});

const createPresetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  configJson: calculatorInputSchema,
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const presets = await prisma.calculatorPreset.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    // Parse configJson from stored string back to object
    const parsed = presets.map((preset) => ({
      ...preset,
      configJson: JSON.parse(preset.configJson),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to fetch calculator presets:", error);
    return NextResponse.json(
      { error: "Failed to fetch calculator presets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createPresetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preset = await prisma.calculatorPreset.create({
      data: {
        name: parsed.data.name,
        configJson: JSON.stringify(parsed.data.configJson),
        userId: user.id,
      },
    });

    return NextResponse.json(
      { ...preset, configJson: JSON.parse(preset.configJson) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create calculator preset:", error);
    return NextResponse.json(
      { error: "Failed to create calculator preset" },
      { status: 500 }
    );
  }
}
