import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

// GET — list user's quote requests
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const requests = await prisma.quoteRequest.findMany({
      where: { userId: user.id },
      include: {
        uploadLink: { select: { label: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to fetch quote requests:", error);
    return NextResponse.json({ error: "Failed to fetch quote requests" }, { status: 500 });
  }
}
