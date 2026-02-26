import { prisma } from "@/lib/prisma";

type LogLevel = "info" | "warn" | "error";
type LogType = "xero_sync" | "email" | "billing" | "auth" | "system";

export async function log(opts: {
  type: LogType;
  level?: LogLevel;
  message: string;
  detail?: string;
  userId?: string;
}) {
  try {
    await prisma.systemLog.create({
      data: {
        type: opts.type,
        level: opts.level || "info",
        message: opts.message,
        detail: opts.detail || null,
        userId: opts.userId || null,
      },
    });
  } catch {
    // Don't let logging failures crash the app
    console.error("Failed to write log:", opts.message);
  }
}
