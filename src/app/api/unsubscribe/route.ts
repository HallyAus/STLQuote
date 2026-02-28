import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/email";

/**
 * GET /api/unsubscribe?uid=xxx&token=xxx
 *
 * One-click unsubscribe from marketing emails (drip + newsletter).
 * Token is HMAC-signed — no login required.
 * Returns an HTML confirmation page.
 */
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid");
  const token = request.nextUrl.searchParams.get("token");

  if (!uid || !token || !verifyUnsubscribeToken(uid, token)) {
    return new NextResponse(htmlPage("Invalid Link", "This unsubscribe link is invalid or has expired."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    await prisma.user.update({
      where: { id: uid },
      data: { marketingUnsubscribed: true },
    });

    return new NextResponse(
      htmlPage(
        "Unsubscribed",
        "You've been unsubscribed from marketing emails (onboarding tips and newsletters). You'll still receive important account emails like password resets, invoices, and quotes."
      ),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return new NextResponse(htmlPage("Error", "Something went wrong. Please try again later."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Printforge</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #171717; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 440px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 22px; margin: 0 0 12px; }
    p { color: #666; font-size: 15px; line-height: 1.6; margin: 0; }
    .logo { font-size: 13px; color: #999; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="logo">Printforge</p>
  </div>
</body>
</html>`;
}
