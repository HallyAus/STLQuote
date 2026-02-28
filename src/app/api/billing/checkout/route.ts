import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { getStripe, getStripePrices } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";

const checkoutSchema = z.object({
  interval: z.enum(["month", "year"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const rl = rateLimit(`checkout:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { interval } = parsed.data;
    const prices = getStripePrices();
    const priceId = interval === "month" ? prices.monthly : prices.annual;

    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price not configured for this interval" },
        { status: 500 }
      );
    }

    // Fetch fresh user data for stripeCustomerId
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true, email: true },
    });

    const origin = request.nextUrl.origin;
    const stripe = getStripe();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings?billing=cancel`,
      metadata: { userId: user.id },
      allow_promotion_codes: true,
    };

    if (dbUser?.stripeCustomerId) {
      sessionParams.customer = dbUser.stripeCustomerId;
    } else {
      sessionParams.customer_email = dbUser?.email ?? user.email ?? undefined;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
