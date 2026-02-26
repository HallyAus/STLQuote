import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

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
    "/api/invoices/portal",
    "/waitlist",
    "/api/waitlist",
    "/terms",
    "/privacy",
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
