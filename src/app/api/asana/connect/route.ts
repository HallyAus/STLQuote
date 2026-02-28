import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { requireFeature } from "@/lib/auth-helpers";
import { getAuthUrl } from "@/lib/asana";

export async function GET() {
  try {
    await requireFeature("asana_sync");

    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set("asana-oauth-state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return NextResponse.redirect(getAuthUrl(state));
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Asana connect error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(
      new URL("/integrations?provider=asana&status=error&reason=connect_failed", baseUrl)
    );
  }
}
