import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import * as googleDrive from "@/lib/google-drive";
import * as oneDrive from "@/lib/onedrive";
import path from "path";
import fs from "fs/promises";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp",
  "stl", "3mf", "step", "stp", "obj", "gcode",
  "pdf", "doc", "docx", "txt",
]);

// Magic byte signatures for content validation
const MAGIC_BYTES: Record<string, (buf: Buffer) => boolean> = {
  jpg: (buf) => buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8,
  jpeg: (buf) => buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8,
  png: (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  gif: (buf) => buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46,
  pdf: (buf) => buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46,
  "3mf": (buf) => buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b, // ZIP-based
  docx: (buf) => buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b, // ZIP-based
  stl: (buf) => {
    if (buf.length < 5) return false;
    // Binary STL starts with 80-byte header; ASCII STL starts with "solid"
    const header = buf.subarray(0, 80).toString("ascii").toLowerCase();
    return header.startsWith("solid") || buf.length > 84;
  },
};

function getFileType(ext: string): string {
  const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"]);
  const cadExts: Record<string, string> = { stl: "stl", "3mf": "3mf", step: "step", stp: "step", obj: "obj", gcode: "gcode" };
  if (imageExts.has(ext)) return "reference_image";
  if (cadExts[ext]) return cadExts[ext];
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return "document";
  return "other";
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("cloud_storage");
    const body = await request.json();
    const { provider, cloudFileId, cloudFileName, designId } = body;

    if (!provider || !["google_drive", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!cloudFileId || !cloudFileName || !designId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify design ownership
    const design = await prisma.design.findFirst({
      where: { id: designId, userId: user.id },
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    // Validate file extension
    const ext = cloudFileName.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File type .${ext} not allowed` }, { status: 400 });
    }

    // Download file from cloud
    let fileBuffer: Buffer;
    let mimeType = "application/octet-stream";

    if (provider === "google_drive") {
      const accessToken = await googleDrive.getAccessToken(user.id);
      const metadata = await googleDrive.getFileMetadata(accessToken, cloudFileId);
      mimeType = metadata.mimeType || mimeType;
      fileBuffer = await googleDrive.downloadFile(accessToken, cloudFileId);
    } else {
      const accessToken = await oneDrive.getAccessToken(user.id);
      const metadata = await oneDrive.getFileMetadata(accessToken, cloudFileId);
      mimeType = metadata.file?.mimeType || mimeType;
      fileBuffer = await oneDrive.downloadFile(accessToken, cloudFileId);
    }

    // Enforce file size limit
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 50MB)" },
        { status: 400 }
      );
    }

    // Validate content matches claimed extension (magic bytes check)
    const validator = MAGIC_BYTES[ext];
    if (validator && !validator(fileBuffer)) {
      return NextResponse.json(
        { error: `File content does not match .${ext} format` },
        { status: 400 }
      );
    }

    // Save to disk (same pattern as design file upload)
    const uploadDir = path.join(process.cwd(), "uploads", "designs", user.id, designId);
    await fs.mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeName = cloudFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}-${safeName}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, fileBuffer);

    const fileType = getFileType(ext);

    // Create DesignFile record with cloud reference
    const designFile = await prisma.designFile.create({
      data: {
        designId,
        userId: user.id,
        fileType,
        filename,
        originalName: cloudFileName,
        mimeType,
        sizeBytes: fileBuffer.length,
        isPrimary: false,
        cloudFileId,
        cloudProvider: provider,
      },
    });

    // Create sync record
    const connection = await prisma.cloudConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider } },
    });

    if (connection) {
      await prisma.cloudSyncRecord.create({
        data: {
          connectionId: connection.id,
          localFileType: "design_file",
          localFileId: designFile.id,
          cloudFileId,
          cloudFileName,
          direction: "download",
          cloudModifiedAt: new Date(),
          localModifiedAt: new Date(),
          syncStatus: "synced",
        },
      });
    }

    return NextResponse.json(designFile, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Cloud import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import file" },
      { status: 500 }
    );
  }
}
