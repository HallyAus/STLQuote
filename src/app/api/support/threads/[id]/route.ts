import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["open", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

// GET /api/support/threads/[id] — get thread with all messages
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && thread.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(thread);
}

// PUT /api/support/threads/[id] — update status/priority (admin or owner)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

  const thread = await prisma.supportThread.findUnique({ where: { id } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && thread.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Only admins can change priority
  const data: Record<string, string> = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.priority && isAdmin) data.priority = parsed.data.priority;

  const updated = await prisma.supportThread.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
