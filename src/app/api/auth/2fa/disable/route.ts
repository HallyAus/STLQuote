import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { decryptOrPlaintext } from "@/lib/encryption";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Rate limit: 5 attempts per 15 min per user
    const rl = rateLimit(`2fa-disable:${user.id}`, { windowMs: 15 * 60 * 1000, maxRequests: 5 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { password, code } = parsed.data;

    // Fetch the user's password hash and TOTP secret
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, totpSecret: true, totpEnabled: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!dbUser.totpEnabled || !dbUser.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 403 }
      );
    }

    // Validate TOTP code (decrypt secret which may be encrypted at rest)
    const decryptedSecret = decryptOrPlaintext(dbUser.totpSecret);
    const totp = new OTPAuth.TOTP({
      issuer: "Printforge",
      label: user.email ?? "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(decryptedSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Disable 2FA and clear all TOTP data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
        totpEnabled: false,
        totpBackupCodes: null,
      },
    });

    // Clear the 2FA verification cookie so it doesn't linger
    const response = NextResponse.json({ success: true });
    response.cookies.set("__2fa_verified", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof Response) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
