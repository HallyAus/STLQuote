import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ quotes: [], clients: [], jobs: [] });
    }

    const searchTerm = `%${q}%`;

    const [quotes, clients, jobs] = await Promise.all([
      prisma.quote.findMany({
        where: {
          userId: user.id,
          OR: [
            { quoteNumber: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          client: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.client.findMany({
        where: {
          userId: user.id,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          company: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.job.findMany({
        where: {
          userId: user.id,
          OR: [
            { notes: { contains: q, mode: "insensitive" } },
            { quote: { quoteNumber: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          status: true,
          quote: { select: { quoteNumber: true } },
          printer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({ quotes, clients, jobs });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
