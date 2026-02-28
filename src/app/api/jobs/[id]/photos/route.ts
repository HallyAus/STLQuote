import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type RouteContext = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireFeature("job_photos");

    const { id } = await context.params;

    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const photos = await prisma.jobPhoto.findMany({
      where: { jobId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Failed to fetch job photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch job photos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireFeature("job_photos");

    const { id } = await context.params;

    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    // Build file path: uploads/photos/{userId}/{jobId}/{timestamp}-{uuid}.{ext}
    const VALID_PHOTO_EXTS = ["jpg", "jpeg", "png", "webp", "gif"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!VALID_PHOTO_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file extension. Only JPG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    // Use forward slashes for the DB-stored path (used in URLs)
    const relativePath = `photos/${user.id}/${id}/${uniqueName}`;
    const absoluteDir = path.join(process.cwd(), "uploads", "photos", user.id, id);
    const absolutePath = path.join(absoluteDir, uniqueName);

    // Create directories recursively
    await mkdir(absoluteDir, { recursive: true });

    // Write file to disk after magic bytes validation
    const buffer = Buffer.from(await file.arrayBuffer());

    const MAGIC: Record<string, (b: Buffer) => boolean> = {
      jpg: (b) => b.length >= 2 && b[0] === 0xff && b[1] === 0xd8,
      jpeg: (b) => b.length >= 2 && b[0] === 0xff && b[1] === 0xd8,
      png: (b) => b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
      gif: (b) => b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
      webp: (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
    };
    const validator = MAGIC[ext];
    if (validator && !validator(buffer)) {
      return NextResponse.json(
        { error: `File content does not match .${ext} image format` },
        { status: 400 }
      );
    }

    await writeFile(absolutePath, buffer);

    // Create DB record
    const photo = await prisma.jobPhoto.create({
      data: {
        jobId: id,
        userId: user.id,
        filename: relativePath,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Failed to upload job photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}
