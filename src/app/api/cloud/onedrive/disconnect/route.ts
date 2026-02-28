import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireFeature("cloud_storage");

    // Delete the connection (cascades to sync records)
    await prisma.cloudConnection.deleteMany({
      where: { userId: user.id, provider: "onedrive" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("OneDrive disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect OneDrive" }, { status: 500 });
  }
}
