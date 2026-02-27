import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  clientId: z.string().optional().nullable(),
});

async function generateDesignNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DS-${year}-`;
  const latest = await prisma.design.findFirst({
    where: { userId, designNumber: { startsWith: prefix } },
    orderBy: { designNumber: "desc" },
    select: { designNumber: true },
  });
  let nextSeq = 1;
  if (latest?.designNumber) {
    const seqStr = latest.designNumber.replace(prefix, "");
    const lastSeq = parseInt(seqStr, 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireFeature("design_studio");
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { userId: user.id };
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { designNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const designs = await prisma.design.findMany({
      where,
      include: {
        client: { select: { name: true } },
        _count: { select: { messages: true, files: true, revisions: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json(designs);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to fetch designs:", err);
    return NextResponse.json({ error: "Failed to fetch designs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("design_studio");
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const designNumber = await generateDesignNumber(user.id);
    const design = await prisma.design.create({
      data: {
        userId: user.id,
        designNumber,
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        tags: parsed.data.tags,
        clientId: parsed.data.clientId,
      },
      include: {
        client: { select: { name: true } },
        _count: { select: { messages: true, files: true, revisions: true } },
      },
    });

    return NextResponse.json(design, { status: 201 });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to create design:", err);
    return NextResponse.json({ error: "Failed to create design" }, { status: 500 });
  }
}
