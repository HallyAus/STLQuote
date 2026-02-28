import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import * as googleDrive from "@/lib/google-drive";
import * as oneDrive from "@/lib/onedrive";
import path from "path";
import fs from "fs/promises";

export async function POST(request: NextRequest) {
  try {
    const user = await requireFeature("cloud_storage");
    const body = await request.json();
    const { provider, fileType, fileId } = body;

    if (!provider || !["google_drive", "onedrive"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (!fileType || !fileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get the cloud connection
    const connection = await prisma.cloudConnection.findUnique({
      where: { userId_provider: { userId: user.id, provider } },
    });
    if (!connection) {
      return NextResponse.json({ error: `${provider === "google_drive" ? "Google Drive" : "OneDrive"} not connected` }, { status: 400 });
    }

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    let targetFolder: string;

    if (fileType === "design_file") {
      // Export a design file
      const designFile = await prisma.designFile.findUnique({
        where: { id: fileId },
        include: { design: { select: { userId: true, designNumber: true } } },
      });
      if (!designFile || designFile.design.userId !== user.id) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const filePath = path.join(process.cwd(), "uploads", "designs", user.id, designFile.designId, designFile.filename);
      fileBuffer = await fs.readFile(filePath);
      fileName = designFile.originalName;
      mimeType = designFile.mimeType;
      targetFolder = `Designs/${designFile.design.designNumber}`;

    } else if (fileType === "quote_pdf" || fileType === "invoice_pdf") {
      // For quote/invoice PDFs, generate the PDF on the fly
      // The caller should provide the rendered PDF as base64 in the request body
      const { pdfBase64, pdfFileName } = body;
      if (!pdfBase64 || !pdfFileName) {
        return NextResponse.json({ error: "PDF data required for quote/invoice export" }, { status: 400 });
      }
      fileBuffer = Buffer.from(pdfBase64, "base64");
      fileName = pdfFileName;
      mimeType = "application/pdf";
      targetFolder = fileType === "quote_pdf" ? "Quotes" : "Invoices";

    } else {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Get access token
    let cloudFileResult: { id: string; name: string };

    if (provider === "google_drive") {
      const accessToken = await googleDrive.getAccessToken(user.id);

      // Find or create target folder under root
      let targetFolderId = connection.rootFolderId;
      if (targetFolderId) {
        // Navigate to sub-folder
        for (const segment of targetFolder.split("/")) {
          const existing = await googleDrive.listFiles(accessToken, targetFolderId!);
          const folder = existing.files.find(
            (f) => f.name === segment && f.mimeType === "application/vnd.google-apps.folder"
          );
          if (folder) {
            targetFolderId = folder.id;
          } else {
            targetFolderId = await googleDrive.createFolder(accessToken, segment, targetFolderId!);
          }
        }
      }

      const result = await googleDrive.uploadFile(accessToken, fileName, mimeType, fileBuffer, targetFolderId || undefined);
      cloudFileResult = { id: result.id, name: result.name };

    } else {
      const accessToken = await oneDrive.getAccessToken(user.id);

      let targetFolderId = connection.rootFolderId;
      if (targetFolderId) {
        for (const segment of targetFolder.split("/")) {
          const existing = await oneDrive.listFiles(accessToken, targetFolderId!);
          const folder = existing.items.find((item) => item.name === segment && !!item.folder);
          if (folder) {
            targetFolderId = folder.id;
          } else {
            targetFolderId = await oneDrive.createFolder(accessToken, segment, targetFolderId!);
          }
        }
      }

      const result = await oneDrive.uploadFile(accessToken, fileName, mimeType, fileBuffer, targetFolderId || undefined);
      cloudFileResult = { id: result.id, name: result.name };
    }

    // Create sync record
    await prisma.cloudSyncRecord.upsert({
      where: {
        connectionId_localFileType_localFileId: {
          connectionId: connection.id,
          localFileType: fileType,
          localFileId: fileId,
        },
      },
      create: {
        connectionId: connection.id,
        localFileType: fileType,
        localFileId: fileId,
        cloudFileId: cloudFileResult.id,
        cloudFileName: cloudFileResult.name,
        cloudFolderPath: targetFolder,
        direction: "upload",
        localModifiedAt: new Date(),
        cloudModifiedAt: new Date(),
        syncStatus: "synced",
      },
      update: {
        cloudFileId: cloudFileResult.id,
        cloudFileName: cloudFileResult.name,
        cloudModifiedAt: new Date(),
        syncStatus: "synced",
        errorMessage: null,
      },
    });

    // Update last sync time
    await prisma.cloudConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      cloudFileId: cloudFileResult.id,
      cloudFileName: cloudFileResult.name,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Cloud export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export file" },
      { status: 500 }
    );
  }
}
