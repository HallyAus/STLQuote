import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireFeature("xero_sync");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        xeroTenantId: null,
        xeroAccessToken: null,
        xeroRefreshToken: null,
        xeroTokenExpiresAt: null,
        xeroConnectedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("Xero disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Xero" },
      { status: 500 }
    );
  }
}
