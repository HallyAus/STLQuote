import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import fs from "fs/promises";
import path from "path";

interface DeployRecord {
  timestamp: string;
  fromHash: string;
  toHash: string;
  success: boolean;
  startedAt: string;
  endedAt: string;
  commits: string[];
  dockerOutput: string;
}

const DEPLOY_LOG_PATH = path.join(process.cwd(), "deploy-logs", "deploys.jsonl");

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    let deploys: DeployRecord[] = [];

    try {
      const content = await fs.readFile(DEPLOY_LOG_PATH, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      deploys = lines
        .map((line) => {
          try {
            return JSON.parse(line) as DeployRecord;
          } catch {
            return null;
          }
        })
        .filter((d): d is DeployRecord => d !== null)
        .reverse()
        .slice(0, limit);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }

    return NextResponse.json({ deploys });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Failed to fetch deploy logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch deploy logs" },
      { status: 500 }
    );
  }
}
