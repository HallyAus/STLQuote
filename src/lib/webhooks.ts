import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Fire webhooks for a user event. Non-blocking — errors never propagate.
 */
export async function fireWebhooks(
  userId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId, active: true },
    });

    const matching = webhooks.filter(
      (w) => w.events.length === 0 || w.events.includes(event)
    );

    if (matching.length === 0) return;

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    // Fire all webhooks concurrently
    await Promise.allSettled(
      matching.map(async (webhook) => {
        try {
          const signature = crypto
            .createHmac("sha256", webhook.secret)
            .update(body)
            .digest("hex");

          const res = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": `sha256=${signature}`,
              "X-Webhook-Event": event,
            },
            body,
            signal: AbortSignal.timeout(10000), // 10s timeout
          });

          // Update last fired info
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastFiredAt: new Date(),
              lastStatus: res.status,
            },
          });
        } catch (error) {
          console.error(`Webhook ${webhook.id} failed:`, error);
          await prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastFiredAt: new Date(),
              lastStatus: 0,
            },
          }).catch(() => {});
        }
      })
    );
  } catch (error) {
    console.error("fireWebhooks error:", error);
  }
}
