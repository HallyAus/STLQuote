import { Resend } from "resend";

// Lazy-init — Resend constructor throws if API key is missing (breaks Docker build)
let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const fromAddress = process.env.RESEND_FROM || "Printforge <noreply@printforge.com.au>";

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.warn("RESEND_API_KEY not configured — skipping email to", to);
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: "Reset your Printforge password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Reset your password</h2>
        <p>You requested a password reset for your Printforge account.</p>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  return sendEmail({
    to: email,
    subject: "Verify your Printforge email",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Verify your email</h2>
        <p>Welcome to Printforge! Click the button below to verify your email address.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Verify Email
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return sendEmail({
    to: email,
    subject: "Welcome to Printforge!",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Welcome, ${name}!</h2>
        <p>Your Printforge account is ready. Here&rsquo;s what you can do:</p>
        <ul style="padding-left: 20px; color: #333;">
          <li><strong>Calculate costs</strong> — upload STL/G-code files and get instant estimates</li>
          <li><strong>Create quotes</strong> — professional quotes with your business branding</li>
          <li><strong>Manage inventory</strong> — track materials, printers, and stock levels</li>
          <li><strong>Track jobs</strong> — kanban board from queue to completion</li>
        </ul>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Go to Dashboard
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Happy printing!</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>
    `,
  });
}

export async function sendAccountCreatedEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: email,
    subject: "Your Printforge account is ready",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Welcome to Printforge, ${name}!</h2>
        <p>An account has been created for you on <strong>Printforge</strong> — the 3D print cost calculator and business management platform.</p>
        <p>To get started, set your password using the link below:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Set Your Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If it expires, use the "Forgot password" option on the login page to request a new one.</p>
        <p style="color: #666; font-size: 14px;">Once you&rsquo;ve set your password, sign in at <a href="${appUrl}/login" style="color: #2563eb;">${appUrl.replace(/^https?:\/\//, "")}</a>.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">Printforge — 3D Print Cost Calculator</p>
      </div>
    `,
  });
}

export async function sendBulkEmail({
  recipients,
  subject,
  html,
}: {
  recipients: string[];
  subject: string;
  html: string;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    const ok = await sendEmail({ to, subject, html });
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function sendQuoteEmail({
  to,
  quoteNumber,
  total,
  currency,
  portalUrl,
  businessName,
  pdfBuffer,
}: {
  to: string;
  quoteNumber: string;
  total: number;
  currency: string;
  portalUrl: string;
  businessName?: string;
  pdfBuffer?: Buffer;
}): Promise<boolean> {
  const from = businessName || "Printforge";
  const attachments = pdfBuffer
    ? [{ filename: `${quoteNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
    : undefined;

  return sendEmail({
    to,
    subject: `Quote ${quoteNumber} from ${from}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #171717;">Quote ${quoteNumber}</h2>
        <p>You've received a quote from <strong>${from}</strong>.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Total</p>
          <p style="margin: 4px 0 0; font-size: 24px; font-weight: bold; color: #171717;">
            $${total.toFixed(2)} ${currency}
          </p>
        </div>
        <p>View and respond to this quote online:</p>
        <p style="margin: 24px 0;">
          <a href="${portalUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            View Quote
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">You can accept or decline this quote from the link above.</p>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">${from} — Powered by Printforge</p>
      </div>
    `,
    attachments,
  });
}
