import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { z } from "zod";

// Whitelist of allowed system config keys
const ALLOWED_CONFIG_KEYS = new Set([
  "waitlist_enabled",
  "maintenance_mode",
  "registration_enabled",
  "max_upload_size",
  "default_trial_days",
  "smtp_from_name",
  "smtp_from_email",
  "app_name",
  "announcement_banner",
  "announcement_enabled",
]);

const updateSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

// GET: fetch all system config
export async function GET() {
  try {
    await requireAdmin();

    const configs = await prisma.systemConfig.findMany();
    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// PUT: update a system config value
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { key, value } = parsed.data;

    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      return NextResponse.json(
        { error: `Config key "${key}" is not allowed` },
        { status: 400 }
      );
    }

    await prisma.systemConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ message: "Config updated" });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
