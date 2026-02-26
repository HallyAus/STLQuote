import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** Lightweight endpoint to check Xero connection status for the current user. */
export async function GET() {
  try {
    const user = await requireFeature("xero_sync");

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        xeroTenantId: true,
        xeroAccessToken: true,
        xeroConnectedAt: true,
      },
    });

    const connected = !!(dbUser?.xeroAccessToken && dbUser?.xeroTenantId);

    return NextResponse.json({
      connected,
      tenantId: dbUser?.xeroTenantId ?? null,
      connectedAt: dbUser?.xeroConnectedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error("Xero status error:", error);
    return NextResponse.json(
      { error: "Failed to check Xero status" },
      { status: 500 }
    );
  }
}
