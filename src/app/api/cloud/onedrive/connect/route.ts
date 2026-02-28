import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireFeature } from "@/lib/auth-helpers";
import { getOneDriveAuthUrl } from "@/lib/onedrive";

export async function GET() {
  try {
    await requireFeature("cloud_storage");

    const state = crypto.randomUUID();

    const cookieStore = await cookies();
    cookieStore.set("onedrive-oauth-state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });

    const authUrl = getOneDriveAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("OneDrive connect error:", error);
    return NextResponse.json({ error: "Failed to initiate OneDrive connection" }, { status: 500 });
  }
}
