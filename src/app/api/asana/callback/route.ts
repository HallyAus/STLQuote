import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { exchangeCodeForTokens, listWorkspaces } from "@/lib/asana";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirect = (params: string) =>
    NextResponse.redirect(new URL(`/integrations?provider=asana&${params}`, baseUrl));

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return redirect("status=error&reason=not_authenticated");
    }

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      return redirect(`status=error&reason=${errorParam === "access_denied" ? "denied" : "oauth_error"}`);
    }

    if (!code || !state) {
      return redirect("status=error&reason=missing_params");
    }

    // Validate state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("asana-oauth-state")?.value;
    cookieStore.delete("asana-oauth-state");

    if (!storedState || storedState !== state) {
      return redirect("status=error&reason=state_mismatch");
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch workspaces to auto-select the first one
    let workspaceGid: string | null = null;
    let workspaceName: string | null = null;
    try {
      const workspaces = await listWorkspaces(tokens.access_token);
      if (workspaces.length > 0) {
        workspaceGid = workspaces[0].gid;
        workspaceName = workspaces[0].name;
      }
    } catch {
      // Not critical — user can configure later
    }

    // Store encrypted tokens on user
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        asanaAccessToken: encrypt(tokens.access_token),
        asanaRefreshToken: encrypt(tokens.refresh_token),
        asanaTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        asanaConnectedAt: new Date(),
        asanaWorkspaceGid: workspaceGid,
        asanaWorkspaceName: workspaceName,
      },
    });

    return redirect("status=connected");
  } catch (error) {
    console.error("Asana callback error:", error);
    return redirect("status=error&reason=exchange_failed");
  }
}
