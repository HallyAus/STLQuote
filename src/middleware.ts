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

  // Landing page: public for guests, redirect logged-in users to dashboard
  // Allow ?preview=true to bypass redirect (for admins viewing their landing page)
  if (pathname === "/") {
    const preview = req.nextUrl.searchParams.get("preview");
    if (req.auth?.user && preview !== "true") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
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
