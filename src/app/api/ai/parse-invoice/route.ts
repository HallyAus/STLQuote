import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAnthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";
import { z } from "zod";

const requestSchema = z.object({
  // base64 data URL of the invoice image/PDF
  file: z.string().min(1, "File is required"),
  mimeType: z.enum([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
  ]),
});

const RATE_LIMIT_KEY_PREFIX = "ai-parse-invoice:";

export async function POST(request: Request) {
  try {
    const user = await requireFeature("ai_assistant");

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

    // Strip data URL prefix to get raw base64
    let base64Data = parsed.data.file;
    const commaIndex = base64Data.indexOf(",");
    if (commaIndex !== -1) {
      base64Data = base64Data.slice(commaIndex + 1);
    }

    // Fetch user's materials and consumables for matching
    const [materials, consumables] = await Promise.all([
      prisma.material.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          materialType: true,
          brand: true,
          colour: true,
          type: true,
        },
      }),
      prisma.consumable.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          category: true,
        },
      }),
    ]);

    const materialsContext = materials.map((m) =>
      `- ${m.materialType}${m.brand ? ` (${m.brand})` : ""}${m.colour ? `, ${m.colour}` : ""} [category: ${m.type}] [ID: ${m.id}]`
    ).join("\n");

    const consumablesContext = consumables.map((c) =>
      `- ${c.name}${c.category ? ` [${c.category}]` : ""} [ID: ${c.id}]`
    ).join("\n");

    const systemPrompt = `You are a purchase order assistant for a 3D printing business. Extract line items from supplier invoices.

EXISTING MATERIALS IN INVENTORY:
${materialsContext || "None configured."}

EXISTING CONSUMABLES IN INVENTORY:
${consumablesContext || "None configured."}

TASK:
1. Extract the supplier name from the invoice
2. Extract every line item: description, quantity, unit cost (before tax)
3. For each item, determine if it matches an existing material or consumable:
   - If it matches a material → set type to "material" and include the materialId
   - If it matches a consumable → set type to "consumable" and include the consumableId
   - If no match → set type to "other" and set isNew=true with a suggested product name and category ("material" or "consumable")
4. Extract the expected delivery date if mentioned
5. Extract invoice/reference number if present

Return ONLY valid JSON (no markdown, no code fences):
{
  "supplierName": "Supplier Co Pty Ltd",
  "invoiceNumber": "INV-12345 or null",
  "expectedDelivery": "2026-03-15 or null",
  "items": [
    {
      "type": "material",
      "materialId": "existing_material_id_or_null",
      "consumableId": null,
      "description": "PLA Filament 1kg Black",
      "quantity": 5,
      "unitCost": 25.00,
      "isNew": false,
      "suggestedName": null,
      "suggestedCategory": null
    },
    {
      "type": "other",
      "materialId": null,
      "consumableId": null,
      "description": "Hardened Steel 0.4mm Nozzle",
      "quantity": 3,
      "unitCost": 12.50,
      "isNew": true,
      "suggestedName": "Hardened Steel 0.4mm Nozzle",
      "suggestedCategory": "consumable"
    }
  ],
  "notes": "Any relevant notes from the invoice (payment terms, etc.)"
}`;

    const mediaType = parsed.data.mimeType === "application/pdf"
      ? "application/pdf" as const
      : parsed.data.mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif";

    const sourceType = parsed.data.mimeType === "application/pdf" ? "base64" as const : "base64" as const;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          {
            type: parsed.data.mimeType === "application/pdf" ? "document" : "image",
            source: {
              type: sourceType,
              media_type: mediaType,
              data: base64Data,
            },
          } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          {
            type: "text",
            text: "Extract all line items from this supplier invoice. Match items to existing materials/consumables where possible.",
          },
        ],
      }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "AI returned an unexpected response format." },
        { status: 502 }
      );
    }

    let result: Record<string, unknown>;
    try {
      let jsonText = textBlock.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
      }
      const firstBrace = jsonText.indexOf("{");
      const lastBrace = jsonText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
      result = JSON.parse(jsonText);
    } catch {
      log({
        type: "system",
        level: "warn",
        message: "AI invoice parse returned invalid JSON",
        detail: textBlock.text.slice(0, 500),
        userId: user.id,
      });
      return NextResponse.json(
        { error: "AI could not parse the invoice. Try a clearer image." },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    log({ type: "system", level: "error", message: "AI invoice parse failed", detail: errMsg });
    console.error("[AI Invoice Parse]", err);
    return NextResponse.json({
      error: process.env.NODE_ENV === "development"
        ? `AI parse failed: ${errMsg}`
        : "Failed to parse invoice.",
    }, { status: 500 });
  }
}
