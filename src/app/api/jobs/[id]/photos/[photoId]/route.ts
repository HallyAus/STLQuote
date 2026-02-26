import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { unlink } from "fs/promises";
import path from "path";

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireFeature("job_photos");

    const { id, photoId } = await context.params;

    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Find the photo and verify it belongs to this job
    const photo = await prisma.jobPhoto.findFirst({
      where: { id: photoId, jobId: id },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete file from disk (ignore if already missing)
    const absolutePath = path.join(process.cwd(), "uploads", photo.filename);
    try {
      await unlink(absolutePath);
    } catch (err: unknown) {
      const fsErr = err as NodeJS.ErrnoException;
      if (fsErr.code !== "ENOENT") throw err;
    }

    // Delete DB record
    await prisma.jobPhoto.delete({ where: { id: photoId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete job photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
