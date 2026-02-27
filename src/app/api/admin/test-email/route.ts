import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    // Rate limit: 10 test emails per 60 min per admin
    const rl = rateLimit(`test-email:${admin.id}`, { windowMs: 60 * 60 * 1000, maxRequests: 10 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many test emails. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const { to } = await request.json();
    const email = to || admin.email;

    if (!email) {
      return NextResponse.json({ error: "No email address provided" }, { status: 400 });
    }

    const sent = await sendEmail({
      to: email,
      subject: "Printforge Test Email",
      type: "test",
      userId: admin.id,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #171717;">Test Email</h2>
          <p>This is a test email from your Printforge instance.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #166534; font-weight: 600;">Email is working correctly!</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            Sent at ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
        </div>
      `,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send. Check RESEND_API_KEY is configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: `Test email sent to ${email}` });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Test email error:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
