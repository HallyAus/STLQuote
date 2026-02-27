import { NextResponse } from "next/server";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { requireAuth } from "@/lib/auth-helpers";

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

    return NextResponse.json({
      secret: totp.secret.base32,
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
