import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";

export async function POST() {
  try {
    const user = await requireFeature("asana_sync");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        asanaAccessToken: null,
        asanaRefreshToken: null,
        asanaTokenExpiresAt: null,
        asanaConnectedAt: null,
        asanaWorkspaceGid: null,
        asanaWorkspaceName: null,
        asanaProjectGid: null,
        asanaProjectName: null,
        asanaAutoCreateTasks: false,
      },
    });

    return NextResponse.json({ message: "Asana disconnected" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Asana disconnect error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
