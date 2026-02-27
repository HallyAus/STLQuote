import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

const schema = z.object({
  secret: z.string().min(1, "Secret is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { secret, code } = parsed.data;

    // Validate the TOTP code against the provided secret
    const totp = new OTPAuth.TOTP({
      issuer: "Printforge",
      label: user.email ?? "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Generate 10 random backup codes (8 hex chars each)
    const plainTextCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex");
      plainTextCodes.push(code);
      const hashed = await bcrypt.hash(code, 12);
      hashedCodes.push(hashed);
    }

    // Store secret, enable 2FA, and save hashed backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: secret,
        totpEnabled: true,
        totpBackupCodes: JSON.stringify(hashedCodes),
      },
    });

    return NextResponse.json({ backupCodes: plainTextCodes });
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }
    console.error("2FA enable error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
