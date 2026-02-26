import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error);
    // Return 200 anyway so Stripe doesn't retry indefinitely
  }

  return NextResponse.json({ received: true });
}

// --- Event handlers ---

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("checkout.session.completed: no userId in metadata");
    return;
  }

  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id ?? null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      stripeCustomerId,
      stripeSubscriptionId,
      trialEndsAt: null,
    },
  });

  await prisma.subscriptionEvent.create({
    data: {
      userId,
      action: "upgraded",
      detail: `Checkout completed — subscription ${stripeSubscriptionId}`,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });

  if (!user) {
    console.error(`subscription.updated: no user found for subscription ${subscription.id}`);
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "cancelled",
    trialing: "trialing",
    paused: "cancelled",
  };

  const mappedStatus = statusMap[subscription.status] ?? "active";

  const updateData: Record<string, unknown> = {
    subscriptionStatus: mappedStatus,
  };

  // If the subscription is set to cancel at period end, record when it ends
  if (subscription.cancel_at_period_end && subscription.current_period_end) {
    updateData.subscriptionEndsAt = new Date(subscription.current_period_end * 1000);
  } else {
    updateData.subscriptionEndsAt = null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  await prisma.subscriptionEvent.create({
    data: {
      userId: user.id,
      action: subscription.cancel_at_period_end ? "downgraded" : "renewed",
      detail: `Subscription status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });

  if (!user) {
    console.error(`subscription.deleted: no user found for subscription ${subscription.id}`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: "free",
      subscriptionStatus: "cancelled",
      stripeSubscriptionId: null,
    },
  });

  await prisma.subscriptionEvent.create({
    data: {
      userId: user.id,
      action: "cancelled",
      detail: `Subscription ${subscription.id} deleted`,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const stripeCustomerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id ?? null;

  if (!stripeCustomerId) {
    console.error("invoice.payment_failed: no customer ID on invoice");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId },
    select: { id: true },
  });

  if (!user) {
    console.error(`invoice.payment_failed: no user found for customer ${stripeCustomerId}`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "past_due",
    },
  });

  await prisma.subscriptionEvent.create({
    data: {
      userId: user.id,
      action: "payment_failed",
      detail: `Invoice ${invoice.id} payment failed`,
    },
  });
}
