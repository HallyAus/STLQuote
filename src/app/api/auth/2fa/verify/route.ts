import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const schema = z.object({
  code: z.string().min(1, "Code is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Use auth() directly — user has a JWT but hasn't completed 2FA yet
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }

    // IP-based rate limit: 5 attempts per 15 min
    const ip = getClientIp(request);
    const ipResult = rateLimit(`2fa-verify:${ip}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });
    if (ipResult.limited) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ipResult.retryAfterSeconds) } }
      );
    }

    // Per-user lockout: 5 attempts per 15 min
    const userResult = rateLimit(`2fa-user:${session.user.id}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });
    if (userResult.limited) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(userResult.retryAfterSeconds) } }
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

    const { code } = parsed.data;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totpSecret: true, totpEnabled: true, totpBackupCodes: true, email: true },
    });

    if (!dbUser || !dbUser.totpEnabled || !dbUser.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        { status: 400 }
      );
    }

    let verified = false;
    let backupCodeUsed = false;

    // Try TOTP code first (6-digit codes)
    if (/^\d{6}$/.test(code)) {
      const totp = new OTPAuth.TOTP({
        issuer: "Printforge",
        label: dbUser.email ?? "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(dbUser.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta !== null) {
        verified = true;
      }
    }

    // If TOTP didn't match, try backup codes (8-char hex)
    if (!verified && dbUser.totpBackupCodes) {
      const hashedCodes: string[] = JSON.parse(dbUser.totpBackupCodes);

      for (let i = 0; i < hashedCodes.length; i++) {
        const match = await bcrypt.compare(code, hashedCodes[i]);
        if (match) {
          verified = true;
          backupCodeUsed = true;

          // Remove the used backup code
          hashedCodes.splice(i, 1);
          await prisma.user.update({
            where: { id: session.user.id },
            data: {
              totpBackupCodes: JSON.stringify(hashedCodes),
            },
          });

          break;
        }
      }
    }

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Audit log backup code usage
    if (backupCodeUsed) {
      log({
        type: "auth",
        level: "warn",
        message: `2FA backup code used by ${dbUser.email}`,
        userId: session.user.id,
      });
    }

    // Set HttpOnly cookie to signal 2FA verification to middleware
    const timestamp = Date.now();
    const cookieValue = `${session.user.id}:${timestamp}`;

    const response = NextResponse.json({
      verified: true,
      backupCodeUsed,
      remainingBackupCodes: backupCodeUsed && dbUser.totpBackupCodes
        ? JSON.parse(dbUser.totpBackupCodes).length - 1
        : undefined,
    });

    response.cookies.set("__2fa_verified", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
