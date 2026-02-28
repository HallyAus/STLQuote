import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireFeature } from "@/lib/auth-helpers";
import { getGoogleAuthUrl } from "@/lib/google-drive";

export async function GET() {
  try {
    await requireFeature("cloud_storage");

    const state = crypto.randomUUID();

    const cookieStore = await cookies();
    cookieStore.set("google-oauth-state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });

    const authUrl = getGoogleAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Google Drive connect error:", error);
    return NextResponse.json({ error: "Failed to initiate Google Drive connection" }, { status: 500 });
  }
}
