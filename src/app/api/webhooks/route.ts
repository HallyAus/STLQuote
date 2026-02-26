import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

const createWebhookSchema = z.object({
  url: z.string().url("Invalid URL"),
  events: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const user = await requireFeature("webhooks");

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("webhooks");

    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        url: parsed.data.url,
        events: parsed.data.events,
        active: parsed.data.active,
        secret,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error("Failed to create webhook:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
