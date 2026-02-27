import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  shippingSameAsBilling: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  paymentTermsDays: z.number().int().min(0).default(14),
  country: z.string().optional().nullable(),
  stateProvince: z.string().optional().nullable(),
  taxExempt: z.boolean().default(false),
  taxIdNumber: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const clients = await prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { quotes: true } },
      },
      take: 500,
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Clean up empty strings to null
    const data = {
      ...parsed.data,
      email: parsed.data.email?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      company: parsed.data.company?.trim() || null,
      billingAddress: parsed.data.billingAddress?.trim() || null,
      shippingAddress: parsed.data.shippingSameAsBilling
        ? null
        : (parsed.data.shippingAddress?.trim() || null),
      notes: parsed.data.notes?.trim() || null,
      tags: parsed.data.tags.filter((t) => t.trim().length > 0),
      country: parsed.data.country?.trim() || null,
      stateProvince: parsed.data.stateProvince?.trim() || null,
      taxExempt: parsed.data.taxExempt,
      taxIdNumber: parsed.data.taxIdNumber?.trim() || null,
    };

    const client = await prisma.client.create({
      data: {
        ...data,
        userId: user.id,
      },
      include: {
        _count: { select: { quotes: true } },
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
