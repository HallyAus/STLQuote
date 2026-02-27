import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
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

    const { password } = parsed.data;

    // Fetch user to validate password and confirm 2FA is enabled
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, totpEnabled: true },
    });

    if (!dbUser || !dbUser.passwordHash) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!dbUser.totpEnabled) {
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

    // Generate 10 new backup codes
    const plainTextCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex");
      plainTextCodes.push(code);
      const hashed = await bcrypt.hash(code, 12);
      hashedCodes.push(hashed);
    }

    // Store new hashed backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
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
    console.error("Backup codes regeneration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
