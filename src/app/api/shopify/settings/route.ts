import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { z } from "zod";

const updateSchema = z.object({
  autoCreateJobs: z.boolean(),
});

export async function PUT(request: Request) {
  try {
    const user = await requireFeature("shopify_sync");

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { shopifyAutoCreateJobs: parsed.data.autoCreateJobs },
    });

    return NextResponse.json({ autoCreateJobs: parsed.data.autoCreateJobs });
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.json();
      return NextResponse.json(body, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
