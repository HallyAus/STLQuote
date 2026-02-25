import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmailVerificationToken } from "@/lib/tokens";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login?error=InvalidToken", request.url));
    }

    const result = await validateEmailVerificationToken(token);

    if (!result.valid) {
      return NextResponse.redirect(new URL("/login?error=ExpiredToken", request.url));
    }

    await prisma.user.update({
      where: { email: result.email },
      data: { emailVerified: new Date() },
    });

    return NextResponse.redirect(new URL("/login?verified=true", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/login?error=VerificationFailed", request.url));
  }
}
