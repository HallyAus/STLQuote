import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireFeature } from "@/lib/auth-helpers";
import { getXeroAuthUrl } from "@/lib/xero";

export async function GET() {
  try {
    await requireFeature("xero_sync");

    // Generate a random state string for CSRF protection
    const state = crypto.randomUUID();

    // Store state in an httpOnly cookie so we can verify on callback
    const cookieStore = await cookies();
    cookieStore.set("xero-oauth-state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = getXeroAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    // requireFeature throws a Response on 401/403 — re-throw it
    if (error instanceof Response) {
      return error;
    }

    console.error("Xero connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Xero connection" },
      { status: 500 }
    );
  }
}
