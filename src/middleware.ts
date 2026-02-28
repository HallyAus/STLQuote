import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // CSRF protection: block state-changing requests from foreign origins
  const method = req.method;
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    // Allow requests with no origin (same-origin navigations, curl, etc.)
    // Block requests where origin exists but doesn't match host
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          // Allow Stripe/Shopify webhooks — they don't send matching origin
          const webhookPaths = ["/api/billing/webhook", "/api/shopify/webhook"];
          if (!webhookPaths.some((p) => pathname.startsWith(p))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // Allow auth routes, static assets, API auth routes, and public portal
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/api/auth",
    "/portal",
    "/api/portal",
    "/api/health",
    "/api/billing/webhook",
    "/api/shopify/webhook",
    "/api/xero/callback",
    "/api/cloud/google/callback",
    "/api/cloud/onedrive/callback",
    "/api/invoices/portal",
    "/waitlist",
    "/api/waitlist",
    "/upload",
    "/api/upload",
    "/terms",
    "/privacy",
    "/blog",
    "/verify-2fa",
    "/api/auth/2fa/verify",
  ];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Landing page is always public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Force password change for users with temporary passwords
  if ((req.auth as any)?.user?.mustChangePassword) {
    const allowed = ["/change-password", "/api/auth/change-password", "/api/auth"];
    if (!allowed.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
  }

  // Two-factor authentication gate
  const requiresTwoFactor = (req.auth as any)?.user?.requiresTwoFactor || (req.auth as any)?.token?.requiresTwoFactor;
  if (requiresTwoFactor) {
    const twoFaVerifiedCookie = req.cookies.get("__2fa_verified")?.value;
    const userId = req.auth?.user?.id;
    const isVerified = twoFaVerifiedCookie?.startsWith(`${userId}:`);

    if (!isVerified) {
      const twoFaAllowed = ["/verify-2fa", "/api/auth/2fa/verify", "/api/auth"];
      if (!twoFaAllowed.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/verify-2fa", req.url));
      }
    }
  }

  // Block disabled users mid-session (disabled flag synced via JWT refresh)
  if ((req.auth as any)?.user?.disabled || (req.auth as any)?.token?.disabled) {
    // For API routes, return 403
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account disabled" }, { status: 403 });
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL("/login?error=disabled", req.url));
  }

  // Protect admin routes (ADMIN and SUPER_ADMIN)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const role = req.auth.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
