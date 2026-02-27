import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_EXTENSIONS = new Set(["stl", "3mf", "step", "stp", "obj", "gcode", "gco", "g"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
    await mkdir(absoluteDir, { recursive: true });

    const absolutePath = path.join(absoluteDir, safeFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

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
