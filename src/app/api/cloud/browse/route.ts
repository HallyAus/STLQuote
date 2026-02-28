import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import * as googleDrive from "@/lib/google-drive";
import * as oneDrive from "@/lib/onedrive";

export async function GET(request: NextRequest) {
  try {
    const user = await requireFeature("cloud_storage");
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const folderId = searchParams.get("folderId") || undefined;
    const pageToken = searchParams.get("pageToken") || undefined;

    if (!provider || !["google_drive", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (provider === "google_drive") {
      const accessToken = await googleDrive.getAccessToken(user.id);
      const result = await googleDrive.listFiles(accessToken, folderId, pageToken);

      const files = result.files.map((f) => ({
        id: f.id,
        name: f.name,
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
        mimeType: f.mimeType,
        size: f.size ? parseInt(f.size) : undefined,
        modifiedTime: f.modifiedTime,
      }));

      return NextResponse.json({ files, nextPageToken: result.nextPageToken });
    }

    // OneDrive
    const accessToken = await oneDrive.getAccessToken(user.id);
    const result = await oneDrive.listFiles(accessToken, folderId, pageToken);

    const files = result.items.map((item) => ({
      id: item.id,
      name: item.name,
      isFolder: !!item.folder,
      mimeType: item.file?.mimeType ?? "application/octet-stream",
      size: item.size,
      modifiedTime: item.lastModifiedDateTime,
    }));

    // Extract skipToken from nextLink if present
    let nextPageToken: string | undefined;
    if (result.nextLink) {
      const url = new URL(result.nextLink);
      nextPageToken = url.searchParams.get("$skiptoken") || undefined;
    }

    return NextResponse.json({ files, nextPageToken });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Cloud browse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to browse files" },
      { status: 500 }
    );
  }
}
