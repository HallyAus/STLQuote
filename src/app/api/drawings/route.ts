import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

const createDrawingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional().nullable(),
  sourceFilename: z.string().min(1),
  sourceFileId: z.string().optional().nullable(),
  dimensionX: z.number().min(0),
  dimensionY: z.number().min(0),
  dimensionZ: z.number().min(0),
  volumeCm3: z.number().min(0),
  triangleCount: z.number().int().min(0),
  viewFront: z.string().min(1),
  viewSide: z.string().min(1),
  viewTop: z.string().min(1),
  viewIso: z.string().min(1),
  quoteId: z.string().optional().nullable(),
  designId: z.string().optional().nullable(),
});

async function generateDrawingNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PD-${year}-`;

  const latest = await prisma.partDrawing.findFirst({
    where: {
      userId,
      drawingNumber: { startsWith: prefix },
    },
    orderBy: { drawingNumber: "desc" },
    select: { drawingNumber: true },
  });

  let nextSeq = 1;
  if (latest?.drawingNumber) {
    const seqStr = latest.drawingNumber.replace(prefix, "");
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function GET() {
  try {
    const user = await requireFeature("part_drawings");

    const drawings = await prisma.partDrawing.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        drawingNumber: true,
        title: true,
        sourceFilename: true,
        dimensionX: true,
        dimensionY: true,
        dimensionZ: true,
        volumeCm3: true,
        triangleCount: true,
        viewIso: true,
        quoteId: true,
        designId: true,
        quote: { select: { quoteNumber: true } },
        design: { select: { designNumber: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      take: 500,
    });

    return NextResponse.json(drawings);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch drawings:", error);
    return NextResponse.json({ error: "Failed to fetch drawings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("part_drawings");

    const body = await request.json();
    const parsed = createDrawingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const drawingNumber = await generateDrawingNumber(user.id);

    const drawing = await prisma.partDrawing.create({
      data: {
        userId: user.id,
        drawingNumber,
        ...parsed.data,
      },
    });

    return NextResponse.json(drawing, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to create drawing:", error);
    return NextResponse.json({ error: "Failed to create drawing" }, { status: 500 });
  }
}
