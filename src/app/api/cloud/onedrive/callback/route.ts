import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getUserEmail } from "@/lib/onedrive";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", baseUrl));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("OneDrive OAuth error:", error);
      return NextResponse.redirect(
        new URL("/integrations?onedrive=error&reason=denied", baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/integrations?onedrive=error&reason=missing_params", baseUrl)
      );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("onedrive-oauth-state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL("/integrations?onedrive=error&reason=state_mismatch", baseUrl)
      );
    }

    cookieStore.delete("onedrive-oauth-state");

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL("/integrations?onedrive=error&reason=no_refresh_token", baseUrl)
      );
    }

    // Get user email
    const providerEmail = await getUserEmail(tokens.access_token);

    // Upsert the connection with encrypted tokens
    await prisma.cloudConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: "onedrive" } },
      create: {
        userId: user.id,
        provider: "onedrive",
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        providerEmail,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        providerEmail,
        connectedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/integrations?onedrive=connected", baseUrl));
  } catch (error) {
    console.error("OneDrive callback error:", error);
    return NextResponse.redirect(
      new URL("/integrations?onedrive=error&reason=exchange_failed", baseUrl)
    );
  }
}
