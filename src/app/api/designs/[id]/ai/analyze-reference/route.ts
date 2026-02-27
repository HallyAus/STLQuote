import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAnthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  imageData: z.string().min(1, "Image data is required"),
  prompt: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const rl = rateLimit(`design-analyze:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json({ error: `Rate limited. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 503 });
    }

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true, name: true, description: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const base64Data = parsed.data.imageData.replace(/^data:image\/\w+;base64,/, "");
    const mediaType = parsed.data.imageData.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";

    const systemPrompt = `You are a 3D printing reverse-engineering expert. Analyse the reference image and describe how to replicate this product using FDM 3D printing.

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "description": "Detailed description of what the image shows",
  "estimatedDimensions": { "lengthMm": number|null, "widthMm": number|null, "heightMm": number|null },
  "replicationStrategy": "Step-by-step approach to recreate this with 3D printing",
  "suggestedMaterial": "Best material choice and why",
  "suggestedColour": "Colour match recommendation",
  "printConsiderations": {
    "orientation": "Best print orientation",
    "supports": "Support requirements",
    "infillPercent": number,
    "layerHeight": "Recommended layer height"
  },
  "challenges": ["List of potential challenges"],
  "simplifications": ["Ways to simplify for 3D printing"],
  "estimatedPrintTimeMinutes": number,
  "estimatedCostAud": number,
  "feasibilityScore": number_1to10
}`;

    const userPrompt = parsed.data.prompt
      ? `Analyse this image for design "${design.name}". Additional context: ${parsed.data.prompt}`
      : `Analyse this reference image for design "${design.name}"${design.description ? `. Design description: ${design.description}` : ""}.`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64Data } },
          { type: "text", text: userPrompt },
        ],
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI returned unexpected format." }, { status: 502 });
    }

    let analysis: Record<string, unknown>;
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
      analysis = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "AI returned invalid data. Please try again." }, { status: 502 });
    }

    // Save the analysis as a message
    await prisma.designMessage.create({
      data: {
        designId: id,
        role: "assistant",
        content: typeof analysis.description === "string" ? analysis.description : "Reference image analysed.",
        imageData: parsed.data.imageData.length < 200000 ? parsed.data.imageData : null,
        metadata: JSON.stringify(analysis),
      },
    });

    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("[Design Analyze]", err);
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
