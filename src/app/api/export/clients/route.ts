import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { generateCsv } from "@/lib/csv";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const clients = await prisma.client.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { quotes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "Tags",
      "Quotes",
      "Billing Address",
      "Created",
    ];

    const rows = clients.map((c) => [
      c.name,
      c.email ?? "",
      c.phone ?? "",
      c.company ?? "",
      c.tags.join(", "),
      c._count.quotes,
      c.billingAddress ?? "",
      c.createdAt.toISOString().split("T")[0],
    ]);

    const csv = generateCsv(headers, rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export clients error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
