import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const updateClientSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  shippingSameAsBilling: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  paymentTermsDays: z.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await params;
    const client = await prisma.client.findFirst({
      where: { id, userId: user.id },
      include: {
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
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

    // Verify ownership
    const existing = await prisma.client.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data: Record<string, unknown> = { ...parsed.data };
    if (data.email !== undefined) data.email = (data.email as string)?.trim() || null;
    if (data.phone !== undefined) data.phone = (data.phone as string)?.trim() || null;
    if (data.company !== undefined) data.company = (data.company as string)?.trim() || null;
    if (data.billingAddress !== undefined) data.billingAddress = (data.billingAddress as string)?.trim() || null;
    if (data.shippingSameAsBilling === true) {
      data.shippingAddress = null;
    } else if (data.shippingAddress !== undefined) {
      data.shippingAddress = (data.shippingAddress as string)?.trim() || null;
    }
    if (data.notes !== undefined) data.notes = (data.notes as string)?.trim() || null;
    if (data.tags !== undefined) {
      data.tags = (data.tags as string[]).filter((t) => t.trim().length > 0);
    }

    const client = await prisma.client.update({
      where: { id },
      data,
      include: {
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
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

    // Verify ownership
    const existing = await prisma.client.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    await prisma.client.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
