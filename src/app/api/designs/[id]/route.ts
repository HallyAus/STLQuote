import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import path from "path";
import fs from "fs/promises";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["IDEA", "RESEARCH", "DRAFTING", "PROTOTYPING", "PRODUCTION_READY", "ARCHIVED"]).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  targetLengthMm: z.number().min(0).nullable().optional(),
  targetWidthMm: z.number().min(0).nullable().optional(),
  targetHeightMm: z.number().min(0).nullable().optional(),
  targetWeightG: z.number().min(0).nullable().optional(),
  suggestedMaterial: z.string().nullable().optional(),
  suggestedColour: z.string().nullable().optional(),
  suggestedInfill: z.number().min(0).max(100).nullable().optional(),
  printNotes: z.string().nullable().optional(),
  feasibilityScore: z.number().int().min(1).max(10).nullable().optional(),
  feasibilityNotes: z.string().nullable().optional(),
  estimatedCost: z.number().min(0).nullable().optional(),
  estimatedTimeMin: z.number().min(0).nullable().optional(),
  clientId: z.string().nullable().optional(),
  quoteId: z.string().nullable().optional(),
  jobId: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      include: {
        client: { select: { id: true, name: true } },
        quote: { select: { id: true, quoteNumber: true } },
        job: { select: { id: true, status: true } },
        messages: { orderBy: { createdAt: "asc" } },
        files: { orderBy: { createdAt: "desc" } },
        revisions: { orderBy: { version: "desc" }, include: { files: true } },
        _count: { select: { messages: true, files: true, revisions: true } },
      },
    });

    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    return NextResponse.json(design);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to fetch design:", err);
    return NextResponse.json({ error: "Failed to fetch design" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const existing = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const design = await prisma.design.update({
      where: { id },
      data: parsed.data,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { messages: true, files: true, revisions: true } },
      },
    });

    return NextResponse.json(design);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to update design:", err);
    return NextResponse.json({ error: "Failed to update design" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true, files: { select: { filename: true } } },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Clean up files from disk
    const uploadDir = path.join(process.cwd(), "uploads", "designs", user.id, id);
    try {
      await fs.rm(uploadDir, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }

    await prisma.design.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to delete design:", err);
    return NextResponse.json({ error: "Failed to delete design" }, { status: 500 });
  }
}
