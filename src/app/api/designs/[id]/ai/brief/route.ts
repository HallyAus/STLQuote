import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAnthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const rl = rateLimit(`design-brief:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json({ error: `Rate limited. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 503 });
    }

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 20 },
        files: { where: { fileType: "reference_image" }, take: 3 },
      },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Fetch user materials/printers for context
    const [materials, printers] = await Promise.all([
      prisma.material.findMany({
        where: { userId: user.id },
        select: { materialType: true, brand: true, colour: true, price: true, spoolWeightG: true },
        take: 20,
      }),
      prisma.printer.findMany({
        where: { userId: user.id },
        select: { name: true, model: true, bedSizeX: true, bedSizeY: true, bedSizeZ: true },
        take: 10,
      }),
    ]);

    const conversationContext = design.messages
      .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `You are a 3D printing design consultant. Generate a structured design brief based on the design info and conversation history.

DESIGN INFO:
- Name: ${design.name}
${design.description ? `- Description: ${design.description}` : ""}
${design.category ? `- Category: ${design.category}` : ""}

AVAILABLE MATERIALS: ${materials.map((m) => `${m.materialType}${m.brand ? ` (${m.brand})` : ""}${m.colour ? `, ${m.colour}` : ""}`).join("; ") || "None configured"}
AVAILABLE PRINTERS: ${printers.map((p) => `${p.name}${p.model ? ` (${p.model})` : ""} — bed ${p.bedSizeX ?? "?"}×${p.bedSizeY ?? "?"}×${p.bedSizeZ ?? "?"}mm`).join("; ") || "None configured"}

${conversationContext ? `CONVERSATION:\n${conversationContext}` : ""}

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "dimensions": { "lengthMm": number|null, "widthMm": number|null, "heightMm": number|null, "weightG": number|null },
  "material": { "type": "string", "colour": "string|null", "reason": "string" },
  "printSettings": { "infillPercent": number, "layerHeightMm": number, "orientation": "string", "supportsNeeded": boolean, "notes": "string" },
  "feasibility": { "score": number_1to10, "printability": "string", "challenges": ["string"], "suggestions": ["string"] },
  "costEstimate": { "materialCostAud": number, "printTimeMinutes": number, "totalCostAud": number, "breakdown": "string" },
  "summary": "string"
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: `Generate a design brief for: ${design.name}${design.description ? ` — ${design.description}` : ""}` }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI returned unexpected format." }, { status: 502 });
    }

    let brief: Record<string, unknown>;
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
      brief = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "AI returned invalid data. Please try again." }, { status: 502 });
    }

    // Update design fields from brief
    const dims = brief.dimensions as Record<string, number | null> | undefined;
    const mat = brief.material as Record<string, string | null> | undefined;
    const printSettings = brief.printSettings as Record<string, unknown> | undefined;
    const feasibility = brief.feasibility as Record<string, unknown> | undefined;
    const costEstimate = brief.costEstimate as Record<string, unknown> | undefined;

    await prisma.design.update({
      where: { id },
      data: {
        targetLengthMm: dims?.lengthMm ?? design.targetLengthMm,
        targetWidthMm: dims?.widthMm ?? design.targetWidthMm,
        targetHeightMm: dims?.heightMm ?? design.targetHeightMm,
        targetWeightG: dims?.weightG ?? design.targetWeightG,
        suggestedMaterial: mat?.type ?? design.suggestedMaterial,
        suggestedColour: mat?.colour ?? design.suggestedColour,
        suggestedInfill: typeof printSettings?.infillPercent === "number" ? printSettings.infillPercent : design.suggestedInfill,
        printNotes: typeof printSettings?.notes === "string" ? printSettings.notes : design.printNotes,
        feasibilityScore: typeof feasibility?.score === "number" ? Math.min(10, Math.max(1, Math.round(feasibility.score as number))) : design.feasibilityScore,
        feasibilityNotes: typeof feasibility?.printability === "string" ? feasibility.printability : design.feasibilityNotes,
        estimatedCost: typeof costEstimate?.totalCostAud === "number" ? costEstimate.totalCostAud as number : design.estimatedCost,
        estimatedTimeMin: typeof costEstimate?.printTimeMinutes === "number" ? costEstimate.printTimeMinutes as number : design.estimatedTimeMin,
      },
    });

    // Save as a message with metadata
    await prisma.designMessage.create({
      data: {
        designId: id,
        role: "assistant",
        content: typeof brief.summary === "string" ? brief.summary : "Design brief generated.",
        metadata: JSON.stringify(brief),
      },
    });

    return NextResponse.json(brief);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("[Design Brief]", err);
    return NextResponse.json({ error: "Brief generation failed." }, { status: 500 });
  }
}
