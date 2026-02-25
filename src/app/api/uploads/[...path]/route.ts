import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { readFile } from "fs/promises";
import path from "path";

type RouteContext = { params: Promise<{ path: string[] }> };

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const segments = await context.params;
    const filePath = segments.path.join("/");

    // Security: verify the path starts with photos/{userId}/ to prevent directory traversal
    if (!filePath.startsWith(`photos/${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent directory traversal via .. segments
    if (segments.path.some((s) => s === ".." || s === ".")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const absolutePath = path.join(process.cwd(), "uploads", filePath);

    // Determine MIME type from extension
    const ext = path.extname(absolutePath).replace(".", "").toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const fileBuffer = await readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const fsErr = error as NodeJS.ErrnoException;
    if (fsErr.code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("Failed to serve file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
