import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import fs from "fs";
import path from "path";

// Read version at module load (not per-request)
const APP_VERSION = (() => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
    );
    return pkg.version || "unknown";
  } catch {
    return "unknown";
  }
})();

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      // Database info
      pgVersion,
      dbSize,
      // Table counts (expanded)
      userCount,
      quoteCount,
      jobCount,
      materialCount,
      printerCount,
      clientCount,
      invoiceCount,
      quoteRequestCount,
      designCount,
      partDrawingCount,
      cloudConnectionCount,
      webhookCount,
      uploadLinkCount,
      emailLogCount,
      systemLogCount,
      // Integration status
      xeroConnections,
      shopifyConnections,
      asanaConnections,
      googleDriveConnections,
      oneDriveConnections,
      // Recent errors
      recentErrorCount,
    ] = await Promise.all([
      // PostgreSQL version
      prisma.$queryRaw<{ server_version: string }[]>`SHOW server_version`.then(
        (r) => r[0]?.server_version || "unknown"
      ),
      // Database size
      prisma.$queryRaw<{ size: bigint }[]>`
        SELECT pg_database_size(current_database()) as size
      `.then((r) => Number(r[0]?.size || 0)),
      // Table counts
      prisma.user.count(),
      prisma.quote.count(),
      prisma.job.count(),
      prisma.material.count(),
      prisma.printer.count(),
      prisma.client.count(),
      prisma.invoice.count(),
      prisma.quoteRequest.count(),
      prisma.design.count(),
      prisma.partDrawing.count(),
      prisma.cloudConnection.count(),
      prisma.webhook.count(),
      prisma.uploadLink.count(),
      prisma.emailLog.count(),
      prisma.systemLog.count(),
      // Integration: Xero (stored on User)
      prisma.user.count({ where: { xeroAccessToken: { not: null } } }),
      // Integration: Shopify (stored on User)
      prisma.user.count({ where: { shopifyAccessToken: { not: null } } }),
      // Integration: Asana (stored on User)
      prisma.user.count({ where: { asanaAccessToken: { not: null } } }),
      // Integration: Google Drive (CloudConnection)
      prisma.cloudConnection.count({ where: { provider: "google_drive" } }),
      // Integration: OneDrive (CloudConnection)
      prisma.cloudConnection.count({ where: { provider: "onedrive" } }),
      // Recent errors (24h)
      prisma.systemLog.count({
        where: { level: "error", createdAt: { gte: twentyFourHoursAgo } },
      }),
    ]);

    // Storage breakdown by subdirectory
    const uploadsBase = path.join(process.cwd(), "uploads");
    const storageBreakdown: { name: string; sizeBytes: number }[] = [];
    let totalUploadBytes = 0;

    if (fs.existsSync(uploadsBase)) {
      const subdirs = ["designs", "photos", "quote-requests"];
      for (const dir of subdirs) {
        const dirPath = path.join(uploadsBase, dir);
        if (fs.existsSync(dirPath)) {
          const size = getDirSize(dirPath);
          storageBreakdown.push({ name: dir, sizeBytes: size });
          totalUploadBytes += size;
        } else {
          storageBreakdown.push({ name: dir, sizeBytes: 0 });
        }
      }

      // "other" — anything not in known subdirs
      const allEntries = fs.readdirSync(uploadsBase, { withFileTypes: true });
      let otherSize = 0;
      for (const entry of allEntries) {
        if (!subdirs.includes(entry.name)) {
          const fullPath = path.join(uploadsBase, entry.name);
          if (entry.isDirectory()) {
            otherSize += getDirSize(fullPath);
          } else if (entry.isFile()) {
            otherSize += fs.statSync(fullPath).size;
          }
        }
      }
      if (otherSize > 0) {
        storageBreakdown.push({ name: "other", sizeBytes: otherSize });
        totalUploadBytes += otherSize;
      }
    }

    // Integration status summary
    const integrations = [
      {
        name: "Stripe",
        configured: !!process.env.STRIPE_SECRET_KEY,
        connectedUsers: 0, // Stripe is system-wide, not per-user
      },
      {
        name: "Xero",
        configured: true, // OAuth-based, always "available"
        connectedUsers: xeroConnections,
      },
      {
        name: "Shopify",
        configured: true,
        connectedUsers: shopifyConnections,
      },
      {
        name: "Google Drive",
        configured: !!process.env.GOOGLE_CLIENT_ID,
        connectedUsers: googleDriveConnections,
      },
      {
        name: "OneDrive",
        configured: !!process.env.ONEDRIVE_CLIENT_ID,
        connectedUsers: oneDriveConnections,
      },
      {
        name: "Asana",
        configured: true,
        connectedUsers: asanaConnections,
      },
      {
        name: "Microsoft SSO",
        configured: !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        connectedUsers: 0,
      },
      {
        name: "Email (Resend)",
        configured: !!process.env.RESEND_API_KEY,
        connectedUsers: 0,
      },
    ];

    // Overall status
    const dbConnected = true; // If we got this far, DB is up
    const hasRecentErrors = recentErrorCount > 5;
    const status = !dbConnected
      ? "degraded"
      : hasRecentErrors
        ? "warning"
        : "healthy";

    const totalRecords =
      userCount + quoteCount + jobCount + materialCount + printerCount +
      clientCount + invoiceCount + quoteRequestCount + designCount +
      partDrawingCount + cloudConnectionCount + webhookCount +
      uploadLinkCount + emailLogCount + systemLogCount;

    return NextResponse.json({
      status,
      appVersion: APP_VERSION,
      nodeVersion: process.version,
      pgVersion,
      uptime: process.uptime(),
      database: {
        connected: dbConnected,
        sizeBytes: dbSize,
        totalRecords,
        tableCounts: {
          users: userCount,
          quotes: quoteCount,
          jobs: jobCount,
          materials: materialCount,
          printers: printerCount,
          clients: clientCount,
          invoices: invoiceCount,
          quoteRequests: quoteRequestCount,
          designs: designCount,
          partDrawings: partDrawingCount,
          cloudConnections: cloudConnectionCount,
          webhooks: webhookCount,
          uploadLinks: uploadLinkCount,
          emailLogs: emailLogCount,
          systemLogs: systemLogCount,
        },
      },
      storage: {
        totalBytes: totalUploadBytes,
        breakdown: storageBreakdown,
      },
      integrations,
      recentErrorCount,
    });
  } catch (error) {
    console.error("Admin health error:", error);
    return NextResponse.json(
      { error: "Failed to fetch health data" },
      { status: 500 }
    );
  }
}

function getDirSize(dirPath: string): number {
  let size = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else if (entry.isFile()) {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch {
    // Ignore permission errors
  }
  return size;
}
