import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAnthropic } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const requestSchema = z.object({
  message: z.string().min(1).max(5000),
  imageData: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const rl = rateLimit(`design-chat:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 30 });
    if (rl.limited) {
      return NextResponse.json({ error: `Rate limited. Try again in ${rl.retryAfterSeconds} seconds.` }, { status: 429 });
    }

    const anthropic = getAnthropic();
    if (!anthropic) {
      return NextResponse.json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." }, { status: 503 });
    }

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true, name: true, designNumber: true, description: true, status: true,
        category: true, tags: true, suggestedMaterial: true, suggestedColour: true,
        targetLengthMm: true, targetWidthMm: true, targetHeightMm: true, targetWeightG: true,
        suggestedInfill: true, printNotes: true, feasibilityScore: true, feasibilityNotes: true,
        estimatedCost: true, estimatedTimeMin: true,
      },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Fetch conversation history
    const history = await prisma.designMessage.findMany({
      where: { designId: id },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const systemPrompt = `You are a 3D product design consultant for Printforge, an Australian 3D printing business. You help brainstorm, plan, and refine product designs for FDM 3D printing.

CURRENT DESIGN:
- Name: ${design.name}
- Number: ${design.designNumber}
- Status: ${design.status}
${design.description ? `- Description: ${design.description}` : ""}
${design.category ? `- Category: ${design.category}` : ""}
${design.tags.length > 0 ? `- Tags: ${design.tags.join(", ")}` : ""}
${design.suggestedMaterial ? `- Material: ${design.suggestedMaterial}` : ""}
${design.suggestedColour ? `- Colour: ${design.suggestedColour}` : ""}
${design.targetLengthMm ? `- Target dims: ${design.targetLengthMm}L × ${design.targetWidthMm ?? "?"}W × ${design.targetHeightMm ?? "?"}H mm` : ""}
${design.targetWeightG ? `- Target weight: ${design.targetWeightG}g` : ""}
${design.suggestedInfill ? `- Infill: ${design.suggestedInfill}%` : ""}
${design.feasibilityScore ? `- Feasibility: ${design.feasibilityScore}/10` : ""}
${design.estimatedCost ? `- Est. cost: $${design.estimatedCost}` : ""}

GUIDELINES:
- Be practical and specific to FDM 3D printing capabilities
- Consider print orientation, supports, layer adhesion, tolerances
- Suggest materials (PLA, PETG, ABS, TPU, ASA, Nylon) based on use case
- Think about post-processing: sanding, painting, acetone smoothing, heat inserts
- All dimensions in mm, weights in grams, prices in AUD
- Be concise but thorough. Use bullet points for lists.
- If the user shares an image, describe what you see and how it relates to the design.`;

    // Build message history for Claude
    const messages: Array<{ role: "user" | "assistant"; content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> }> = [];
    for (const msg of history) {
      if (msg.role === "user" && msg.imageData) {
        messages.push({
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: msg.imageData.replace(/^data:image\/\w+;base64,/, "") } },
            { type: "text", text: msg.content },
          ],
        });
      } else {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    // Add the new user message
    const userContent: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
    if (parsed.data.imageData) {
      const base64Data = parsed.data.imageData.replace(/^data:image\/\w+;base64,/, "");
      const mediaType = parsed.data.imageData.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";
      userContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } });
    }
    userContent.push({ type: "text", text: parsed.data.message });
    messages.push({ role: "user", content: userContent.length === 1 && !parsed.data.imageData ? parsed.data.message : userContent });

    // Save user message
    await prisma.designMessage.create({
      data: {
        designId: id,
        role: "user",
        content: parsed.data.message,
        imageData: parsed.data.imageData,
      },
    });

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const assistantContent = textBlock && textBlock.type === "text" ? textBlock.text : "I couldn't generate a response. Please try again.";

    // Save assistant message
    const saved = await prisma.designMessage.create({
      data: {
        designId: id,
        role: "assistant",
        content: assistantContent,
      },
    });

    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("[Design Chat]", err);
    return NextResponse.json({ error: "Chat failed. Please try again." }, { status: 500 });
  }
}
