import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth routes, static assets, and API auth routes
  const publicPaths = ["/login", "/register", "/api/auth"];
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

  // Landing page is public
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block disabled users
  if (req.auth.user.role === "DISABLED") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "AccountDisabled");
    return NextResponse.redirect(loginUrl);
  }

  // Protect admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (req.auth.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
