import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { generateCsv } from "@/lib/csv";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const quotes = await prisma.quote.findMany({
      where: { userId: user.id },
      include: {
        client: { select: { name: true, email: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const headers = [
      "Quote Number",
      "Status",
      "Client",
      "Client Email",
      "Line Items",
      "Subtotal",
      "Markup %",
      "Total",
      "Currency",
      "Created",
      "Expiry",
    ];

    const rows = quotes.map((q) => [
      q.quoteNumber,
      q.status,
      q.client?.name ?? "",
      q.client?.email ?? "",
      q._count.lineItems,
      q.subtotal.toFixed(2),
      q.markupPct.toFixed(1),
      q.total.toFixed(2),
      q.currency,
      q.createdAt.toISOString().split("T")[0],
      q.expiryDate?.toISOString().split("T")[0] ?? "",
    ]);

    const csv = generateCsv(headers, rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="quotes-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export quotes error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
