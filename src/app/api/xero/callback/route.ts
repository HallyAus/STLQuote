import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getXeroTenants } from "@/lib/xero";
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

    // Xero may redirect with an error (e.g. user denied access)
    if (error) {
      console.error("Xero OAuth error:", error);
      return NextResponse.redirect(
        new URL("/integrations?xero=error&reason=denied", baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/integrations?xero=error&reason=missing_params", baseUrl)
      );
    }

    // Verify state matches the cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get("xero-oauth-state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL("/integrations?xero=error&reason=state_mismatch", baseUrl)
      );
    }

    // Clear the state cookie
    cookieStore.delete("xero-oauth-state");

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get the tenant list — use the first tenant
    const tenants = await getXeroTenants(tokens.access_token);
    if (!tenants.length) {
      return NextResponse.redirect(
        new URL("/integrations?xero=error&reason=no_tenants", baseUrl)
      );
    }

    const tenant = tenants[0];

    // Store encrypted tokens on the user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        xeroTenantId: tenant.tenantId,
        xeroAccessToken: encrypt(tokens.access_token),
        xeroRefreshToken: encrypt(tokens.refresh_token),
        xeroTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        xeroConnectedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/integrations?xero=connected", baseUrl));
  } catch (error) {
    console.error("Xero callback error:", error);
    return NextResponse.redirect(
      new URL("/integrations?xero=error&reason=exchange_failed", baseUrl)
    );
  }
}
