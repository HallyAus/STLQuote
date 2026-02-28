import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import * as googleDrive from "@/lib/google-drive";
import * as oneDrive from "@/lib/onedrive";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("cloud_storage");

    const rl = rateLimit(`cloud-folder:${user.id}`, { windowMs: 60 * 1000, maxRequests: 5 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }
    const body = await request.json();
    const { provider } = body;

    if (!provider || !["google_drive", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const connection = await prisma.cloudConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider } },
    });
    if (!connection) {
      return NextResponse.json({ error: "Provider not connected" }, { status: 400 });
    }

    const subFolders = ["Designs", "Quotes", "Invoices"];

    if (provider === "google_drive") {
      const accessToken = await googleDrive.getAccessToken(user.id);

      // Create root Printforge folder
      const rootId = await googleDrive.createFolder(accessToken, "Printforge CRM");

      // Create sub-folders
      for (const folder of subFolders) {
        await googleDrive.createFolder(accessToken, folder, rootId);
      }

      await prisma.cloudConnection.update({
        where: { id: connection.id },
        data: { rootFolderId: rootId },
      });

      return NextResponse.json({ success: true, rootFolderId: rootId });
    }

    // OneDrive
    const accessToken = await oneDrive.getAccessToken(user.id);

    const rootId = await oneDrive.createFolder(accessToken, "Printforge CRM");

    for (const folder of subFolders) {
      await oneDrive.createFolder(accessToken, folder, rootId);
    }

    await prisma.cloudConnection.update({
      where: { id: connection.id },
      data: { rootFolderId: rootId },
    });

    return NextResponse.json({ success: true, rootFolderId: rootId });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Cloud folder setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up folders" },
      { status: 500 }
    );
  }
}
