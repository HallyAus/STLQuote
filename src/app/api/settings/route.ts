import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const TEMP_USER_ID = "temp-user";

const updateSettingsSchema = z.object({
  defaultCurrency: z.enum(["AUD", "USD", "EUR", "GBP"]).optional(),
  defaultElectricityRate: z
    .number()
    .nonnegative("Electricity rate must be zero or positive")
    .optional(),
  defaultMarkupPct: z
    .number()
    .nonnegative("Markup must be zero or positive")
    .optional(),
  defaultLabourRate: z
    .number()
    .nonnegative("Labour rate must be zero or positive")
    .optional(),
  defaultOverheadMonthly: z
    .number()
    .nonnegative("Monthly overhead must be zero or positive")
    .optional(),
  estimatedMonthlyJobs: z
    .number()
    .int()
    .nonnegative("Monthly jobs must be zero or positive")
    .optional(),
  minimumCharge: z
    .number()
    .nonnegative("Minimum charge must be zero or positive")
    .optional(),
  businessName: z.string().nullable().optional(),
  businessAddress: z.string().nullable().optional(),
  businessAbn: z.string().nullable().optional(),
  businessPhone: z.string().nullable().optional(),
  businessEmail: z.string().email("Invalid email address").nullable().optional(),
  businessLogoUrl: z.string().url("Invalid URL").nullable().optional(),
  quoteTermsText: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const settings = await prisma.settings.upsert({
      where: { userId: TEMP_USER_ID },
      update: {},
      create: { userId: TEMP_USER_ID },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.upsert({
      where: { userId: TEMP_USER_ID },
      update: parsed.data,
      create: {
        userId: TEMP_USER_ID,
        ...parsed.data,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
