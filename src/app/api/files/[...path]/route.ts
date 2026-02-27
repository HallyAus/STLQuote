import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { readFile } from "fs/promises";
import path from "path";

// GET — serve uploaded files (auth required, scoped to user)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const segments = await params;
    const filePath = segments.path.join("/");

    // Security: only allow serving from uploads/ directory scoped to user
    if (!filePath.startsWith("uploads/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure the file belongs to this user (path contains their userId)
    if (!filePath.includes(`/${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent path traversal
    const normalized = path.normalize(filePath);
    if (normalized.includes("..")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const absolutePath = path.join(process.cwd(), normalized);
    const buffer = await readFile(absolutePath);

    // Determine content type from extension
    const ext = path.extname(absolutePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".stl": "model/stl",
      ".3mf": "model/3mf",
      ".step": "model/step",
      ".stp": "model/step",
      ".obj": "model/obj",
      ".gcode": "text/x-gcode",
      ".gco": "text/x-gcode",
      ".g": "text/x-gcode",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${path.basename(absolutePath)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    console.error("Failed to serve file:", error);
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 });
  }
}
