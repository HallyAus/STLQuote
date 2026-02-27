import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ overrides: {} });
    }

    const modules = await prisma.userModule.findMany({
      where: { userId: user.id },
      select: { feature: true, override: true },
    });

    const overrides: Record<string, string> = {};
    for (const m of modules) overrides[m.feature] = m.override;

    return NextResponse.json({ overrides });
  } catch {
    return NextResponse.json({ overrides: {} });
  }
}
