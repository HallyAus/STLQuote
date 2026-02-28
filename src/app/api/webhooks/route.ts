import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { isPrivateUrlStrict } from "@/lib/url-safety";
import { rateLimit } from "@/lib/rate-limit";
import { encrypt } from "@/lib/encryption";

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
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        lastFiredAt: true,
        lastStatus: true,
        createdAt: true,
        updatedAt: true,
      },
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

    // Block private/internal URLs (SSRF prevention — async DNS resolution)
    if (await isPrivateUrlStrict(parsed.data.url)) {
      return NextResponse.json(
        { error: "Webhook URL cannot point to private or internal networks" },
        { status: 400 }
      );
    }

    const rawSecret = crypto.randomBytes(32).toString("hex");
    const encryptedSecret = encrypt(rawSecret);

    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        url: parsed.data.url,
        events: parsed.data.events,
        active: parsed.data.active,
        secret: encryptedSecret,
      },
      select: {
        id: true,
        url: true,
        events: true,
        active: true,
        createdAt: true,
      },
    });

    // Return raw secret only on creation (one-time display)
    return NextResponse.json({ ...webhook, secret: rawSecret }, { status: 201 });
  } catch (error) {
    console.error("Failed to create webhook:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
