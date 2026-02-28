import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { encrypt } from "@/lib/encryption";

export async function POST() {
  try {
    const user = await requireAuth();

    const totp = new OTPAuth.TOTP({
      issuer: "Printforge",
      label: user.email ?? "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret(),
    });

    const qrCode = await QRCode.toDataURL(totp.toString());

    // Store pending secret server-side (encrypted) — never trust client to send it back
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingTotpSecret: encrypt(totp.secret.base32) },
    });

    return NextResponse.json({
      qrCode,
      uri: totp.toString(),
    });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
