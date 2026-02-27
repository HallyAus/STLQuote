import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import path from "path";
import fs from "fs/promises";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id, fileId } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const file = await prisma.designFile.findFirst({
      where: { id: fileId, designId: id },
    });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from disk
    const filePath = path.join(process.cwd(), "uploads", "designs", user.id, id, file.filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist on disk
    }

    await prisma.designFile.delete({ where: { id: fileId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to delete design file:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const user = await requireFeature("design_studio");
    const { id, fileId } = await params;

    const design = await prisma.design.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }

    const file = await prisma.designFile.findFirst({
      where: { id: fileId, designId: id },
    });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body.isPrimary === true && file.fileType === "reference_image") {
      // Unset other primary images
      await prisma.designFile.updateMany({
        where: { designId: id, isPrimary: true, fileType: "reference_image", id: { not: fileId } },
        data: { isPrimary: false },
      });
      await prisma.designFile.update({
        where: { id: fileId },
        data: { isPrimary: true },
      });

      // Update design thumbnail
      const filePath = path.join(process.cwd(), "uploads", "designs", user.id, id, file.filename);
      try {
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.mimeType};base64,${base64}`;
        if (dataUrl.length < 200000) {
          await prisma.design.update({
            where: { id },
            data: { thumbnailUrl: dataUrl },
          });
        }
      } catch {
        // File may not exist
      }
    }

    if (body.notes !== undefined) {
      await prisma.designFile.update({
        where: { id: fileId },
        data: { notes: body.notes },
      });
    }

    const updated = await prisma.designFile.findUnique({ where: { id: fileId } });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    console.error("Failed to update design file:", err);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}
