import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { generateToken } from "@/lib/tokens";

// PUT — update link (toggle active, change label, regenerate token)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.uploadLink.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body.label === "string") data.label = body.label.trim().slice(0, 100);
    if (typeof body.active === "boolean") data.active = body.active;
    if (body.regenerateToken === true) data.token = generateToken();

    const updated = await prisma.uploadLink.update({
      where: { id },
      data,
      include: { _count: { select: { quoteRequests: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update upload link:", error);
    return NextResponse.json({ error: "Failed to update upload link" }, { status: 500 });
  }
}

// DELETE — remove link and its requests
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.uploadLink.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.uploadLink.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete upload link:", error);
    return NextResponse.json({ error: "Failed to delete upload link" }, { status: 500 });
  }
}
