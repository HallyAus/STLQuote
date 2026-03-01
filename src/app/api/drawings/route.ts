import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";

const pngDataUri = z
  .string()
  .min(1)
  .max(2_000_000, "View image too large")
  .refine((v) => v.startsWith("data:image/png;base64,"), "Must be a PNG data URI");

const createDrawingSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  notes: z.string().max(5000).optional().nullable(),
  sourceFilename: z.string().min(1).max(500),
  sourceFileId: z.string().max(100).optional().nullable(),
  dimensionX: z.number().min(0),
  dimensionY: z.number().min(0),
  dimensionZ: z.number().min(0),
  volumeCm3: z.number().min(0),
  triangleCount: z.number().int().min(0).max(10_000_000),
  viewFront: pngDataUri,
  viewSide: pngDataUri,
  viewTop: pngDataUri,
  viewIso: pngDataUri,
  quoteId: z.string().max(100).optional().nullable(),
  designId: z.string().max(100).optional().nullable(),
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
        // viewIso excluded from list — too large (base64 PNG)
        quoteId: true,
        designId: true,
        quote: { select: { quoteNumber: true } },
        design: { select: { designNumber: true, name: true } },
        createdAt: true,
        updatedAt: true,
      },
      take: 100,
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

    // Rate limit: 30 drawings per 15 minutes
    const rl = rateLimit(`create-drawing:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 30 });
    if (rl.limited) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = createDrawingSchema.safeParse(body);

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
