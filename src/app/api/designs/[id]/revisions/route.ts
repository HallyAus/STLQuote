import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().nullable(),
  changes: z.string().optional().nullable(),
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
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const revisions = await prisma.designRevision.findMany({
      where: { designId: id },
      include: { files: true },
      orderBy: { version: "desc" },
    });

    return NextResponse.json(revisions);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to fetch revisions:", err);
    return NextResponse.json({ error: "Failed to fetch revisions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    // Auto-increment version
    const latest = await prisma.designRevision.findFirst({
      where: { designId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const revision = await prisma.designRevision.create({
      data: {
        designId: id,
        version: nextVersion,
        title: parsed.data.title,
        description: parsed.data.description,
        changes: parsed.data.changes,
      },
      include: { files: true },
    });

    return NextResponse.json(revision, { status: 201 });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to create revision:", err);
    return NextResponse.json({ error: "Failed to create revision" }, { status: 500 });
  }
}
