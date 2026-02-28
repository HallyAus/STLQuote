import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import path from "path";
import fs from "fs/promises";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_THUMBNAIL_BYTES = 50 * 1024; // 50KB base64 for thumbnail storage
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "bmp",
  "stl", "3mf", "step", "stp", "obj", "gcode",
  "pdf", "txt",
]);

// Magic byte signatures for content validation
const MAGIC_BYTES: Record<string, (buf: Buffer) => boolean> = {
  jpg: (buf) => buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8,
  jpeg: (buf) => buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8,
  png: (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47,
  gif: (buf) => buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46,
  pdf: (buf) => buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46,
  "3mf": (buf) => buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b, // ZIP-based
  stl: (buf) => {
    if (buf.length < 5) return false;
    // Binary STL: 80-byte header + 4-byte triangle count, then 50 bytes per triangle
    if (buf.length >= 84) {
      const numTriangles = buf.readUInt32LE(80);
      const expectedSize = 80 + 4 + numTriangles * 50;
      if (numTriangles > 0 && buf.length >= expectedSize && buf.length <= expectedSize + 2) {
        return true;
      }
    }
    // ASCII STL: must have "solid" header AND "endsolid" footer
    const text = buf.toString("ascii");
    return text.trimStart().startsWith("solid") && /endsolid/i.test(text);
  },
};

function getFileType(ext: string): string {
  const imageExts = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp"]);
  const cadExts: Record<string, string> = { stl: "stl", "3mf": "3mf", step: "step", stp: "step", obj: "obj", gcode: "gcode" };
  if (imageExts.has(ext)) return "reference_image";
  if (cadExts[ext]) return cadExts[ext];
  if (["pdf", "txt"].includes(ext)) return "document";
  return "other";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const files = await prisma.designFile.findMany({
      where: { designId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to fetch design files:", err);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id } = await params;

    // Rate limit: 20 uploads per 15 min per user
    const rl = rateLimit(`design-upload:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 20 });
    if (rl.limited) {
      return NextResponse.json(
        { error: `Too many uploads. Try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const isPrimary = formData.get("isPrimary") === "true";
    const notes = formData.get("notes") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File type .${ext} not allowed` }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "uploads", "designs", user.id, id);
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}-${safeName}`;
    const filePath = path.join(uploadDir, filename);

    // Write file to disk after magic bytes validation
    const buffer = Buffer.from(await file.arrayBuffer());

    const validator = MAGIC_BYTES[ext];
    if (validator && !validator(buffer)) {
      return NextResponse.json(
        { error: `File content does not match .${ext} format` },
        { status: 400 }
      );
    }

    await fs.writeFile(filePath, buffer);

    const fileType = getFileType(ext);

    // If setting as primary, unset existing primary images
    if (isPrimary && fileType === "reference_image") {
      await prisma.designFile.updateMany({
        where: { designId: id, isPrimary: true, fileType: "reference_image" },
        data: { isPrimary: false },
      });
    }

    const designFile = await prisma.designFile.create({
      data: {
        designId: id,
        userId: user.id,
        fileType,
        filename,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        isPrimary: isPrimary && fileType === "reference_image",
        notes,
      },
    });

    // If this is the first primary image, set it as the design thumbnail
    if (isPrimary && fileType === "reference_image") {
      // Create a small base64 thumbnail for the design card
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      // Only store if reasonably small (< 50KB base64)
      if (dataUrl.length < MAX_THUMBNAIL_BYTES * (4 / 3) + 100) {
        await prisma.design.update({
          where: { id },
          data: { thumbnailUrl: dataUrl },
        });
      }
    }

    return NextResponse.json(designFile, { status: 201 });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to upload design file:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
