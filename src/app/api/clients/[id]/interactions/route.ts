import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

const INTERACTION_TYPES = ["note", "call", "email", "meeting"] as const;

const createInteractionSchema = z.object({
  type: z.enum(INTERACTION_TYPES),
  content: z.string().min(1, "Content is required"),
});

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const interactions = await prisma.clientInteraction.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(interactions);
  } catch (error) {
    console.error("Failed to fetch client interactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch client interactions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createInteractionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const interaction = await prisma.clientInteraction.create({
      data: {
        clientId: id,
        userId: user.id,
        type: parsed.data.type,
        content: parsed.data.content,
      },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    console.error("Failed to create client interaction:", error);
    return NextResponse.json(
      { error: "Failed to create client interaction" },
      { status: 500 }
    );
  }
}
