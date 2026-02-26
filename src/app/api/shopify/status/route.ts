import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await requireFeature("shopify_sync");

    const data = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        shopifyShopDomain: true,
        shopifyConnectedAt: true,
        shopifyLastSyncAt: true,
        shopifyAutoCreateJobs: true,
      },
    });

    return NextResponse.json({
      connected: !!data?.shopifyShopDomain,
      shopDomain: data?.shopifyShopDomain ?? null,
      connectedAt: data?.shopifyConnectedAt?.toISOString() ?? null,
      lastSyncAt: data?.shopifyLastSyncAt?.toISOString() ?? null,
      autoCreateJobs: data?.shopifyAutoCreateJobs ?? true,
    });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
