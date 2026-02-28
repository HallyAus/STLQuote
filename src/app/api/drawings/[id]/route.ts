import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

const updateDrawingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(5000).optional().nullable(),
  quoteId: z.string().max(100).optional().nullable(),
  designId: z.string().max(100).optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireFeature("part_drawings");
    const { id } = await context.params;

    const drawing = await prisma.partDrawing.findFirst({
      where: { id, userId: user.id },
      include: {
        quote: { select: { id: true, quoteNumber: true } },
        design: { select: { id: true, designNumber: true, name: true } },
      },
    });

    if (!drawing) {
      return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
    }

    return NextResponse.json(drawing);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch drawing:", error);
    return NextResponse.json({ error: "Failed to fetch drawing" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireFeature("part_drawings");
    const { id } = await context.params;

    const existing = await prisma.partDrawing.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateDrawingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate ownership of linked quote/design
    if (parsed.data.quoteId) {
      const quote = await prisma.quote.findFirst({
        where: { id: parsed.data.quoteId, userId: user.id },
        select: { id: true },
      });
      if (!quote) {
        return NextResponse.json({ error: "Quote not found" }, { status: 400 });
      }
    }

    if (parsed.data.designId) {
      const design = await prisma.design.findFirst({
        where: { id: parsed.data.designId, userId: user.id },
        select: { id: true },
      });
      if (!design) {
        return NextResponse.json({ error: "Design not found" }, { status: 400 });
      }
    }

    const drawing = await prisma.partDrawing.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(drawing);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to update drawing:", error);
    return NextResponse.json({ error: "Failed to update drawing" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireFeature("part_drawings");
    const { id } = await context.params;

    const existing = await prisma.partDrawing.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Drawing not found" }, { status: 404 });
    }

    await prisma.partDrawing.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to delete drawing:", error);
    return NextResponse.json({ error: "Failed to delete drawing" }, { status: 500 });
  }
}
