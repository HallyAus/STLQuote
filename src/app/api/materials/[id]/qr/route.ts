import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/materials/[id]/qr — Generate a QR code PNG for a material.
 * The QR encodes the material's barcode value (or auto-generates one).
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { id } = await context.params;

    const material = await prisma.material.findFirst({
      where: { id, userId: user.id },
      select: { id: true, barcode: true, materialType: true, brand: true, colour: true },
    });

    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // If no barcode set yet, generate one and save it
    let barcode = material.barcode;
    if (!barcode) {
      barcode = `PF-${material.id.slice(-8).toUpperCase()}`;
      await prisma.material.update({
        where: { id },
        data: { barcode },
      });
    }

    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(barcode, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to generate QR code:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
