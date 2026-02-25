import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { generateCsv } from "@/lib/csv";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      include: {
        quote: { select: { quoteNumber: true, total: true } },
        printer: { select: { name: true } },
        material: { select: { materialType: true, brand: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const headers = [
      "Quote Number",
      "Status",
      "Printer",
      "Material",
      "Actual Time (min)",
      "Actual Weight (g)",
      "Started",
      "Completed",
      "Created",
    ];

    const rows = jobs.map((j) => [
      j.quote?.quoteNumber ?? "",
      j.status,
      j.printer?.name ?? "",
      j.material ? `${j.material.materialType}${j.material.brand ? ` - ${j.material.brand}` : ""}` : "",
      j.actualTimeMinutes?.toFixed(1) ?? "",
      j.actualWeightG?.toFixed(1) ?? "",
      j.startedAt?.toISOString().split("T")[0] ?? "",
      j.completedAt?.toISOString().split("T")[0] ?? "",
      j.createdAt.toISOString().split("T")[0],
    ]);

    const csv = generateCsv(headers, rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jobs-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export jobs error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
