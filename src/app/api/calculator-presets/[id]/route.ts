import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const TEMP_USER_ID = "temp-user";

type RouteContext = { params: Promise<{ id: string }> };

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

const updatePresetSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  configJson: calculatorInputSchema.optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    // Verify the preset belongs to the user
    const existing = await prisma.calculatorPreset.findFirst({
      where: { id, userId: TEMP_USER_ID },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Calculator preset not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updatePresetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: { name?: string; configJson?: string } = {};
    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }
    if (parsed.data.configJson !== undefined) {
      updateData.configJson = JSON.stringify(parsed.data.configJson);
    }

    const preset = await prisma.calculatorPreset.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...preset,
      configJson: JSON.parse(preset.configJson),
    });
  } catch (error) {
    console.error("Failed to update calculator preset:", error);
    return NextResponse.json(
      { error: "Failed to update calculator preset" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    // Verify the preset belongs to the user
    const existing = await prisma.calculatorPreset.findFirst({
      where: { id, userId: TEMP_USER_ID },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Calculator preset not found" },
        { status: 404 }
      );
    }

    await prisma.calculatorPreset.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete calculator preset:", error);
    return NextResponse.json(
      { error: "Failed to delete calculator preset" },
      { status: 500 }
    );
  }
}
