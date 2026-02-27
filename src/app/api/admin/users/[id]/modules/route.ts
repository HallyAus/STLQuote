import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { PRO_FEATURE_LIST, hasFeature, getEffectiveTier, type Feature } from "@/lib/tier";
import { z } from "zod";

const updateSchema = z.object({
  feature: z.string(),
  override: z.enum(["enabled", "disabled"]).nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        role: true,
        modules: { select: { feature: true, override: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tier = getEffectiveTier(user);
    const overrides: Record<string, string> = {};
    for (const m of user.modules) overrides[m.feature] = m.override;

    const features = PRO_FEATURE_LIST.map((f) => ({
      feature: f.feature,
      label: f.label,
      description: f.description,
      tierDefault: hasFeature(tier, f.feature),
      override: overrides[f.feature] ?? null,
      effectiveAccess: overrides[f.feature] === "enabled" ? true : overrides[f.feature] === "disabled" ? false : hasFeature(tier, f.feature),
    }));

    return NextResponse.json({ features, tier });
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error("Failed to fetch modules:", err);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { feature, override } = parsed.data;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (override === null) {
      // Remove override — revert to tier default
      await prisma.userModule.deleteMany({
        where: { userId: id, feature },
      });
    } else {
      // Upsert override
      await prisma.userModule.upsert({
        where: { userId_feature: { userId: id, feature } },
        create: { userId: id, feature, override },
        update: { override },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error("Failed to update module:", err);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}
