import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireFeature("cloud_storage");

    const connections = await prisma.cloudConnection.findMany({
      where: { userId: user.id },
      select: {
        provider: true,
        providerEmail: true,
        connectedAt: true,
        rootFolderId: true,
        lastSyncAt: true,
        syncEnabled: true,
      },
    });

    const result: Record<string, unknown> = {};

    for (const conn of connections) {
      const key = conn.provider === "google_drive" ? "google_drive" : "onedrive";
      result[key] = {
        connected: true,
        providerEmail: conn.providerEmail,
        connectedAt: conn.connectedAt?.toISOString() ?? null,
        rootFolderId: conn.rootFolderId,
        lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
        syncEnabled: conn.syncEnabled,
      };
    }

    // Fill in missing providers
    if (!result.google_drive) {
      result.google_drive = { connected: false, providerEmail: null, connectedAt: null, rootFolderId: null, lastSyncAt: null };
    }
    if (!result.onedrive) {
      result.onedrive = { connected: false, providerEmail: null, connectedAt: null, rootFolderId: null, lastSyncAt: null };
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Cloud status error:", error);
    return NextResponse.json({ error: "Failed to fetch cloud status" }, { status: 500 });
  }
}
