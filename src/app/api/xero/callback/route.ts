import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getXeroTenants } from "@/lib/xero";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Xero may redirect with an error (e.g. user denied access)
    if (error) {
      console.error("Xero OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?xero=error&reason=denied", request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?xero=error&reason=missing_params", request.url)
      );
    }

    // Verify state matches the cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get("xero-oauth-state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL("/settings?xero=error&reason=state_mismatch", request.url)
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
        new URL("/settings?xero=error&reason=no_tenants", request.url)
      );
    }

    const tenant = tenants[0];

    // Store tokens on the user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        xeroTenantId: tenant.tenantId,
        xeroAccessToken: tokens.access_token,
        xeroRefreshToken: tokens.refresh_token,
        xeroTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        xeroConnectedAt: new Date(),
      },
    });

    return NextResponse.redirect(new URL("/settings?xero=connected", request.url));
  } catch (error) {
    console.error("Xero callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?xero=error&reason=exchange_failed", request.url)
    );
  }
}
