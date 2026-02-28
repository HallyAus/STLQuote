import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAdmin();

    // Subscription stats
    const [totalUsers, proUsers, trialUsers, freeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { subscriptionTier: "pro", subscriptionStatus: "active" },
      }),
      prisma.user.count({
        where: { subscriptionStatus: "trialing" },
      }),
      prisma.user.count({
        where: {
          OR: [
            { subscriptionTier: "free" },
            { subscriptionStatus: "inactive" },
          ],
        },
      }),
    ]);

    // Users with Stripe subscriptions (paying)
    const stripeSubscribers = await prisma.user.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        stripeCustomerId: false,
        stripeSubscriptionId: false,
        subscriptionEndsAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Recent subscription events
    const events = await prisma.subscriptionEvent.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Env var check (don't expose values, just presence)
    const config = {
      stripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      monthlyPriceId: !!process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      annualPriceId: !!process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    };

    return NextResponse.json({
      stats: {
        totalUsers,
        proUsers,
        trialUsers,
        freeUsers,
      },
      stripeSubscribers,
      events,
      config,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch billing data:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing data" },
      { status: 500 }
    );
  }
}
