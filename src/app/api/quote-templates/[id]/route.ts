import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  lineItems: z.string().optional().nullable(),
  markupPct: z.number().min(0).optional(),
  terms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;
    const template = await prisma.quoteTemplate.findFirst({
      where: { id, userId: user.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.quoteTemplate.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const template = await prisma.quoteTemplate.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.quoteTemplate.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.quoteTemplate.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
