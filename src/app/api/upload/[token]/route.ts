import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, access } from "fs/promises";
import { constants } from "fs";
import path from "path";
import crypto from "crypto";
import { sendEmail, escapeHtml } from "@/lib/email";
import { createQuoteRequestTask } from "@/lib/asana";

const ALLOWED_EXTENSIONS = new Set(["stl", "3mf", "step", "stp", "obj", "gcode", "gco", "g"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** Validate file content matches claimed extension (magic bytes / structure check) */
function validateFileContent(buffer: Buffer, ext: string): string | null {
  if (buffer.length === 0) return "File is empty";

  switch (ext) {
    case "stl": {
      // Binary STL: 80-byte header + 4-byte triangle count, then 50 bytes per triangle
      if (buffer.length >= 84) {
        const numTriangles = buffer.readUInt32LE(80);
        const expectedSize = 80 + 4 + numTriangles * 50;
        if (numTriangles > 0 && buffer.length >= expectedSize && buffer.length <= expectedSize + 2) {
          return null;
        }
      }
      // ASCII STL: must have "solid" header AND "endsolid" footer
      const text = buffer.toString("ascii");
      const trimmed = text.trimStart();
      if (trimmed.startsWith("solid") && /endsolid/i.test(text)) return null;
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
      const gcodeHead = buffer.subarray(0, 2048).toString("ascii");
      // Require actual G-code commands — not just a semicolon comment
      if (/G[0-2]\d?\s|M[01]\d{2}\s|M140|M190|G28|G29/.test(gcodeHead)) return null;
      // Also accept files where most lines are comments (slicer headers) followed by commands
      if (/^;/m.test(gcodeHead) && /\n[GM]\d/m.test(gcodeHead)) return null;
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

    if (!clientEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
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

    // Send confirmation email to customer (non-blocking)
    const ownerSettings = await prisma.settings.findUnique({
      where: { userId: link.userId },
      select: {
        businessName: true,
        businessEmail: true,
        businessPhone: true,
        businessAddress: true,
        businessLogoUrl: true,
      },
    });
    const linkOwner = await prisma.user.findUnique({
      where: { id: link.userId },
      select: { name: true, email: true },
    });

    const biz = ownerSettings;
    const bizName = biz?.businessName || linkOwner?.name || "our team";
    const safeClientName = escapeHtml(clientName);
    const safeBizName = escapeHtml(bizName);
    const safeFileName = escapeHtml(file.name);
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);

    const contactLines: string[] = [];
    if (biz?.businessEmail) contactLines.push(`Email: <a href="mailto:${escapeHtml(biz.businessEmail)}" style="color: #2563eb;">${escapeHtml(biz.businessEmail)}</a>`);
    if (biz?.businessPhone) contactLines.push(`Phone: ${escapeHtml(biz.businessPhone)}`);
    if (biz?.businessAddress) contactLines.push(`Address: ${escapeHtml(biz.businessAddress)}`);

    sendEmail({
      to: clientEmail,
      subject: `We've received your file — ${safeBizName}`,
      type: "quote_request_confirmation",
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${biz?.businessLogoUrl ? `<img src="${biz.businessLogoUrl}" alt="" style="height: 40px; margin-bottom: 16px;" />` : ""}
        <h2 style="color: #171717;">Thanks, ${safeClientName}!</h2>
        <p>We've received your file and will review it shortly. You can expect a quote from us soon.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">File received</p>
          <p style="margin: 0; font-weight: 600; color: #171717;">${safeFileName}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #666;">${fileSizeMB} MB</p>
        </div>
        ${description ? `<p style="color: #666; font-size: 14px;"><strong>Your notes:</strong> ${escapeHtml(description)}</p>` : ""}
        <p style="color: #333; font-size: 14px;">If you have any questions in the meantime, don&rsquo;t hesitate to reach out.</p>
        ${contactLines.length > 0 ? `
        <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e5e5;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em;">Contact us</p>
          ${contactLines.map((l) => `<p style="margin: 2px 0; font-size: 14px; color: #333;">${l}</p>`).join("")}
        </div>` : ""}
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">${safeBizName} — Powered by Printforge</p>
      </div>`,
    }).catch(() => {});

    // Create Asana task if owner has it configured (non-blocking)
    createQuoteRequestTask(link.userId, {
      clientName,
      clientEmail,
      fileName: file.name,
      fileSize: file.size,
      description: description || null,
      linkLabel: link.label,
    }).catch(() => {});

    return NextResponse.json(
      { id: quoteRequest.id, message: "File uploaded successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to process upload:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
