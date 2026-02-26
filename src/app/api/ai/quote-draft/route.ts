import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAnthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().min(5, "Description must be at least 5 characters").max(2000),
});

const RATE_LIMIT_KEY_PREFIX = "ai-quote-draft:";

export async function POST(request: Request) {
  try {
    const user = await requireFeature("ai_assistant");

    // Rate limit: 10 requests per 15 minutes per user
    const rl = rateLimit(`${RATE_LIMIT_KEY_PREFIX}${user.id}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: `Rate limited. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return NextResponse.json(
        { error: "AI assistant is not configured. Contact your administrator." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    // Fetch user's materials, printers, and settings as context
    const [materials, printers, settings] = await Promise.all([
      prisma.material.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          materialType: true,
          brand: true,
          colour: true,
          type: true,
          price: true,
          spoolWeightG: true,
        },
      }),
      prisma.printer.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          model: true,
          purchasePrice: true,
          lifetimeHours: true,
          powerWatts: true,
          maintenanceCostPerHour: true,
        },
      }),
      prisma.settings.findFirst({
        where: { userId: user.id },
        select: {
          defaultLabourRate: true,
          defaultMarkupPct: true,
          defaultOverheadMonthly: true,
          estimatedMonthlyJobs: true,
          defaultElectricityRate: true,
          minimumCharge: true,
        },
      }),
    ]);

    const materialsContext = materials.map((m) => ({
      id: m.id,
      type: m.materialType,
      brand: m.brand,
      colour: m.colour,
      category: m.type,
      pricePerGram: +(m.price / m.spoolWeightG).toFixed(4),
    }));

    const printersContext = printers.map((p) => {
      const depreciationPerHour = p.purchasePrice / p.lifetimeHours;
      return {
        id: p.id,
        name: p.name,
        model: p.model,
        hourlyRate: +(depreciationPerHour + p.maintenanceCostPerHour).toFixed(2),
        powerWatts: p.powerWatts,
      };
    });

    const overheadPerJob = settings
      ? settings.defaultOverheadMonthly / Math.max(settings.estimatedMonthlyJobs, 1)
      : 0;

    const systemPrompt = `You are a 3D printing cost estimator for Printforge, an Australian 3D print business. Generate quote line items for the described job.

AVAILABLE MATERIALS:
${materialsContext.length > 0
  ? materialsContext.map((m) => `- ${m.type}${m.brand ? ` (${m.brand})` : ""}${m.colour ? `, ${m.colour}` : ""} — $${m.pricePerGram}/g [ID: ${m.id}]`).join("\n")
  : "No materials configured. Use generic estimates."}

AVAILABLE PRINTERS:
${printersContext.length > 0
  ? printersContext.map((p) => `- ${p.name}${p.model ? ` (${p.model})` : ""} — $${p.hourlyRate}/hr, ${p.powerWatts}W [ID: ${p.id}]`).join("\n")
  : "No printers configured. Use generic estimates."}

SETTINGS:
- Labour rate: $${settings?.defaultLabourRate ?? 35}/hr
- Electricity rate: $${settings?.defaultElectricityRate ?? 0.3}/kWh
- Overhead per job: $${overheadPerJob.toFixed(2)}
- Minimum charge: $${settings?.minimumCharge ?? 15}

RULES:
1. Use realistic print weights and times for FDM/resin 3D printing
2. All prices in AUD
3. Each line item should represent one distinct part or batch of identical parts
4. If the user specifies a quantity, use it. Otherwise default to 1
5. Pick the most appropriate material and printer from the lists. If none match, omit the IDs
6. Calculate costs:
   - materialCost = weight_in_grams × price_per_gram
   - machineCost = print_time_hours × printer_hourly_rate
   - labourCost = estimated_labour_hours × labour_rate (include setup, post-processing)
   - overheadCost = overhead_per_job (split across line items)
   - lineTotal = materialCost + machineCost + labourCost + overheadCost
7. lineTotal must be >= minimum charge per item
8. Be conservative with estimates — slightly over is better than under

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "lineItems": [
    {
      "description": "Part name / description",
      "printWeightG": 50,
      "printTimeMinutes": 120,
      "materialCost": 1.50,
      "machineCost": 2.00,
      "labourCost": 5.00,
      "overheadCost": 1.00,
      "lineTotal": 9.50,
      "quantity": 1,
      "materialId": "material_cuid_or_null",
      "printerId": "printer_cuid_or_null"
    }
  ],
  "explanation": "Brief explanation of assumptions and choices"
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: parsed.data.prompt }],
    });

    // Extract text from response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "AI returned an unexpected response format." },
        { status: 502 }
      );
    }

    // Parse the JSON response — extract JSON object even if wrapped in markdown/text
    let result: { lineItems: unknown[]; explanation: string };
    try {
      let jsonText = textBlock.text.trim();
      // Strip markdown code fences
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      // If still not starting with {, find the first { and last }
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
      result = JSON.parse(jsonText);
    } catch {
      log({ type: "system", level: "warn", message: "AI quote draft returned invalid JSON", detail: textBlock.text.slice(0, 500), userId: user.id });
      return NextResponse.json(
        { error: "AI returned invalid data. Please try again with a clearer description." },
        { status: 502 }
      );
    }

    if (!result.lineItems || !Array.isArray(result.lineItems)) {
      return NextResponse.json(
        { error: "AI returned invalid data. Please try again." },
        { status: 502 }
      );
    }

    // Validate and sanitise each line item
    const validMaterialIds = new Set(materials.map((m) => m.id));
    const validPrinterIds = new Set(printers.map((p) => p.id));

    const lineItems = (result.lineItems as Record<string, unknown>[]).map((item) => ({
      description: String(item.description || "Untitled item"),
      printWeightG: Math.max(0, Number(item.printWeightG) || 0),
      printTimeMinutes: Math.max(0, Number(item.printTimeMinutes) || 0),
      materialCost: Math.max(0, Number(item.materialCost) || 0),
      machineCost: Math.max(0, Number(item.machineCost) || 0),
      labourCost: Math.max(0, Number(item.labourCost) || 0),
      overheadCost: Math.max(0, Number(item.overheadCost) || 0),
      lineTotal: Math.max(0, Number(item.lineTotal) || 0),
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
      materialId: typeof item.materialId === "string" && validMaterialIds.has(item.materialId)
        ? item.materialId
        : null,
      printerId: typeof item.printerId === "string" && validPrinterIds.has(item.printerId)
        ? item.printerId
        : null,
    }));

    return NextResponse.json({
      lineItems,
      explanation: String(result.explanation || ""),
    });
  } catch (err) {
    // requireFeature throws Response objects for 401/403
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    log({ type: "system", level: "error", message: "AI quote draft failed", detail: errMsg });
    console.error("[AI Quote Draft]", err);
    return NextResponse.json({
      error: process.env.NODE_ENV === "development"
        ? `AI draft failed: ${errMsg}`
        : "Failed to generate quote draft.",
    }, { status: 500 });
  }
}
