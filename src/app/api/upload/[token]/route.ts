import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import crypto from "crypto";

const ALLOWED_EXTENSIONS = new Set(["stl", "3mf", "step", "stp", "obj", "gcode", "gco", "g"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** Validate file content matches claimed extension (magic bytes / structure check) */
function validateFileContent(buffer: Buffer, ext: string): string | null {
  if (buffer.length === 0) return "File is empty";

  switch (ext) {
    case "stl": {
      // ASCII STL starts with "solid"
      const head = buffer.subarray(0, 80).toString("ascii").trimStart();
      if (head.startsWith("solid")) return null; // ASCII STL
      // Binary STL: 80-byte header + 4-byte triangle count, then 50 bytes per triangle
      if (buffer.length >= 84) {
        const numTriangles = buffer.readUInt32LE(80);
        const expectedSize = 80 + 4 + numTriangles * 50;
        if (buffer.length === expectedSize) return null;
        // Some exporters pad the file — allow if reasonably close
        if (buffer.length >= expectedSize && buffer.length <= expectedSize + 2) return null;
      }
      return "File content does not match STL format";
    }

    case "3mf":
      // 3MF is ZIP-based — check for ZIP magic bytes PK\x03\x04
      if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
        return null;
      }
      return "File content does not match 3MF format (expected ZIP archive)";

    case "step":
    case "stp": {
      const stepHead = buffer.subarray(0, 64).toString("ascii").trimStart();
      if (stepHead.startsWith("ISO-10303-21")) return null;
      return "File content does not match STEP format";
    }

    case "obj": {
      const objHead = buffer.subarray(0, 1024).toString("ascii");
      if (/^(v |f |#|vn |vt |o |g |s |mtllib |usemtl )/m.test(objHead)) return null;
      return "File content does not match OBJ format";
    }

    case "gcode":
    case "gco":
    case "g": {
      const gcodeHead = buffer.subarray(0, 1024).toString("ascii");
      if (/G[01]\s|M10[49]|M140|;/.test(gcodeHead)) return null;
      return "File content does not match G-code format";
    }

    default:
      return null;
  }
}

// GET — validate token and return link info (public, no auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const link = await prisma.uploadLink.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            settings: {
              select: {
                businessName: true,
                businessLogoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!link || !link.active) {
      return NextResponse.json({ error: "Upload link not found or inactive" }, { status: 404 });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "This upload link has expired" }, { status: 410 });
    }

    return NextResponse.json({
      label: link.label,
      allowedTypes: link.allowedTypes,
      maxFileSize: link.maxFileSize,
      businessName: link.user.settings?.businessName ?? null,
      businessLogo: link.user.settings?.businessLogoUrl ?? null,
    });
  } catch (error) {
    console.error("Failed to validate upload link:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — handle file upload (public, no auth)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token
    const link = await prisma.uploadLink.findUnique({
      where: { token },
    });

    if (!link || !link.active) {
      return NextResponse.json({ error: "Upload link not found or inactive" }, { status: 404 });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return NextResponse.json({ error: "This upload link has expired" }, { status: 410 });
    }

    // Rate limit: max 10 uploads per link per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.quoteRequest.count({
      where: {
        uploadLinkId: link.id,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentCount >= 10) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientName = (formData.get("clientName") as string || "").trim();
    const clientEmail = (formData.get("clientEmail") as string || "").trim();
    const description = (formData.get("description") as string || "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!clientName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate file size
    if (file.size > Math.min(link.maxFileSize, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(link.maxFileSize / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `File type .${ext} is not allowed. Accepted: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}` },
        { status: 400 }
      );
    }

    // Save file to disk
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    const safeFilename = `${timestamp}-${uuid}.${ext}`;
    const relDir = `uploads/quote-requests/${link.userId}`;
    const absoluteDir = path.join(process.cwd(), relDir);

    try {
      await mkdir(absoluteDir, { recursive: true });
    } catch (mkdirErr) {
      console.error("Failed to create upload directory:", absoluteDir, mkdirErr);
      return NextResponse.json(
        { error: "Server storage error — unable to create upload directory" },
        { status: 500 }
      );
    }

    // Verify directory is writable
    try {
      await access(absoluteDir, constants.W_OK);
    } catch {
      console.error("Upload directory not writable:", absoluteDir);
      return NextResponse.json(
        { error: "Server storage error — upload directory not writable" },
        { status: 500 }
      );
    }

    const absolutePath = path.join(absoluteDir, safeFilename);
    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch (bufErr) {
      console.error("Failed to read file buffer:", bufErr);
      return NextResponse.json(
        { error: "Failed to read uploaded file" },
        { status: 400 }
      );
    }

    // Validate file content matches extension (magic bytes)
    const contentError = validateFileContent(buffer, ext);
    if (contentError) {
      return NextResponse.json(
        { error: `Invalid file: ${contentError}` },
        { status: 400 }
      );
    }

    try {
      await writeFile(absolutePath, buffer);
    } catch (writeErr) {
      console.error("Failed to write file:", absolutePath, writeErr);
      return NextResponse.json(
        { error: "Server storage error — unable to save file" },
        { status: 500 }
      );
    }

    // Create quote request record
    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        userId: link.userId,
        uploadLinkId: link.id,
        clientName,
        clientEmail: clientEmail || null,
        description: description || null,
        fileName: safeFilename,
        originalName: file.name,
        filePath: `${relDir}/${safeFilename}`,
        fileSizeBytes: file.size,
        mimeType: file.type || null,
      },
    });

    return NextResponse.json(
      { id: quoteRequest.id, message: "File uploaded successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to process upload:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
