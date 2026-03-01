/**
 * Onboarding drip email sequence.
 *
 * 8 emails over 7 days:
 *   Day 0: Personal welcome from Daniel (CEO)
 *   Day 1: Quote Calculator
 *   Day 2: Materials & Printers Library
 *   Day 3: Client Management & Quote Templates
 *   Day 4: Invoicing & Payment Tracking
 *   Day 5: Job Board & Print Farm Calendar
 *   Day 6: Design Studio (Pro teaser)
 *   Day 7: Integrations deep-dive + trial reminder
 *
 * Triggered on dashboard load via /api/drip-emails.
 * Each email is sent at most once per user (DripEmailLog).
 */

import { prisma } from "@/lib/prisma";
import { sendEmail, unsubscribeFooter, escapeHtml } from "@/lib/email";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DripEmail {
  key: string;
  dayOffset: number; // days after signup
  subject: string;
  html: (name: string, appUrl: string, trialDaysLeft: number, userId: string) => string;
}

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------

const STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;`;
const CTA_STYLE = `background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;`;
const HR = `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />`;
const FOOTER = `<p style="color: #999; font-size: 12px;">Printforge &mdash; Stop guessing your 3D print costs</p>`;

function integrationsBadges(): string {
  return `
    <div style="margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #475569;">Integrations &mdash; Connect your tools</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 8px 4px 0; font-size: 13px; color: #334155; width: 50%;">&#x2705; Xero Accounting</td>
          <td style="padding: 4px 8px 4px 0; font-size: 13px; color: #334155; width: 50%;">&#x2705; Shopify Orders</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0; font-size: 13px; color: #334155;">&#x2705; Google Drive</td>
          <td style="padding: 4px 8px 4px 0; font-size: 13px; color: #334155;">&#x2705; OneDrive</td>
        </tr>
        <tr>
          <td style="padding: 4px 8px 4px 0; font-size: 13px; color: #334155;">&#x2705; Webhooks (Zapier, Make)</td>
          <td style="padding: 4px 8px 4px 0; font-size: 13px; color: #334155;">&#x2705; CSV Export</td>
        </tr>
      </table>
    </div>`;
}

function trialBanner(daysLeft: number): string {
  if (daysLeft <= 0) return "";
  return `<p style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #1e40af; margin: 16px 0;">
    &#x23F3; You have <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong> left on your free Pro trial. All features are unlocked!
  </p>`;
}

// ---------------------------------------------------------------------------
// Email sequence
// ---------------------------------------------------------------------------

export const DRIP_SEQUENCE: DripEmail[] = [
  // Day 0 — Personal welcome from Daniel
  {
    key: "day_0",
    dayOffset: 0,
    subject: "Welcome to Printforge — a personal note from Daniel",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">Hey ${name},</h2>
        <p>I'm Daniel, the founder of Printforge. I built this because I was tired of guessing my 3D print costs and losing money on quotes.</p>
        <p>Whether you run a print farm or tinker in your garage, Printforge is designed to help you <strong>know your real costs</strong> and <strong>run your 3D printing like a business</strong>.</p>
        <p>Over the next week I'll send you a quick daily email showing off one feature at a time. No spam, just useful tips to get you up and running.</p>
        <p><strong>Got questions? Hit reply.</strong> Seriously &mdash; this goes straight to my inbox and I read every message.</p>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/dashboard" style="${CTA_STYLE}">Go to Your Dashboard</a>
        </p>
        <p style="color: #666; font-size: 14px;">Cheers,<br/><strong>Daniel Hall</strong><br/>Founder &amp; CEO, Printforge<br/><a href="https://printforge.com.au" style="color: #2563eb;">printforge.com.au</a></p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 1 — Quote Calculator
  {
    key: "day_1",
    dayOffset: 1,
    subject: "Quote Calculator — Never lose money on a print again",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">Know your costs, ${name}</h2>
        <p>The calculator is the heart of Printforge. Upload an STL or G-code file and get an <strong>instant cost breakdown</strong>:</p>
        <ul style="padding-left: 20px; color: #333; line-height: 1.8;">
          <li><strong>Material costs</strong> &mdash; exact filament/resin usage priced per gram</li>
          <li><strong>Machine costs</strong> &mdash; depreciation, power, and maintenance per hour</li>
          <li><strong>Labour &amp; overhead</strong> &mdash; your time and running costs factored in</li>
          <li><strong>Markup</strong> &mdash; set your margin and see the final price instantly</li>
        </ul>
        <p>Save presets for your most common setups (e.g. "PLA on X1C" or "Resin miniatures") and calculate in seconds.</p>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/calculator" style="${CTA_STYLE}">Try the Calculator</a>
        </p>
        <p style="color: #666; font-size: 14px;">Questions? Just reply to this email.<br/>&mdash; Daniel</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 2 — Materials & Printers
  {
    key: "day_2",
    dayOffset: 2,
    subject: "Your print farm, organised — Materials & Printers",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">Track every spool and machine, ${name}</h2>
        <p>Stop guessing what filament you have left or what your printers cost to run.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F3A8; Materials Library</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>Track stock levels with low-stock alerts on your dashboard</li>
            <li>Price per gram auto-calculated from spool weight and cost</li>
            <li>Link materials to suppliers for easy reordering</li>
          </ul>
        </div>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F5A8; Printer Fleet</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>Depreciation calculated from purchase price and lifetime hours</li>
            <li>Power cost per hour based on your electricity rate</li>
            <li>Track consumables (nozzles, build plates) per printer</li>
          </ul>
        </div>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/materials" style="${CTA_STYLE}">Set Up Your Materials</a>
        </p>
        <p style="color: #666; font-size: 14px;">Reply any time &mdash; I read every message.<br/>&mdash; Daniel</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 3 — Clients & Quote Templates
  {
    key: "day_3",
    dayOffset: 3,
    subject: "Professional quotes in 60 seconds — Clients & Templates",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">Look professional, ${name}</h2>
        <p>Your clients get polished PDF quotes with your branding. You get a system that remembers everything.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F4C4; Smart Quoting</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>Auto-numbered quotes (PF-2026-001, PF-2026-002...)</li>
            <li>Save quote templates for repeat jobs</li>
            <li>Client portal links &mdash; customers view and accept online</li>
            <li>Send quotes via email with PDF attachment</li>
          </ul>
        </div>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F465; Client CRM</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>Store contacts, billing/shipping addresses, and notes</li>
            <li>Interaction timeline (calls, emails, meetings)</li>
            <li>Tag clients for easy filtering</li>
          </ul>
        </div>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/quotes/new" style="${CTA_STYLE}">Create Your First Quote</a>
        </p>
        <p style="color: #666; font-size: 14px;">Hit reply with any questions.<br/>&mdash; Daniel</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 4 — Invoicing
  {
    key: "day_4",
    dayOffset: 4,
    subject: "Get paid faster — Invoicing & Payment Tracking",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">Time to get paid, ${name}</h2>
        <p>Turn accepted quotes into invoices with one click. Track what's paid and what's overdue.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F4B0; Invoicing</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>Create from quote or from scratch</li>
            <li>Professional PDF with TAX INVOICE header, GST, and ABN</li>
            <li>PAID watermark auto-applied when marked as paid</li>
            <li>Email invoices with PDF attachment</li>
            <li>Sync to Xero accounting automatically</li>
          </ul>
        </div>
        <p>Printforge handles the paperwork so you can focus on printing.</p>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/invoices" style="${CTA_STYLE}">View Invoices</a>
        </p>
        <p style="color: #666; font-size: 14px;">Questions about billing or Xero? Just reply.<br/>&mdash; Daniel</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 5 — Jobs & Calendar
  {
    key: "day_5",
    dayOffset: 5,
    subject: "Run your print farm like a pro — Jobs & Calendar",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">Track every print, ${name}</h2>
        <p>From the moment a quote is accepted to the day you ship &mdash; Printforge tracks the full lifecycle.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F4CB; Kanban Job Board</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>7 status columns: Queued &rarr; Printing &rarr; Post-Processing &rarr; QC &rarr; Packing &rarr; Shipped &rarr; Complete</li>
            <li>Drag cards to advance status</li>
            <li>Upload job photos for quality records</li>
          </ul>
        </div>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x1F4C5; Print Farm Calendar</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li>Weekly Gantt view with printer rows</li>
            <li>Drag-to-schedule jobs across your fleet</li>
            <li>See at a glance what each printer is doing</li>
          </ul>
        </div>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/jobs" style="${CTA_STYLE}">View Job Board</a>
        </p>
        <p style="color: #666; font-size: 14px;">Got a fleet of printers? I'd love to hear how you run them &mdash; just reply.<br/>&mdash; Daniel</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 6 — Design Studio
  {
    key: "day_6",
    dayOffset: 6,
    subject: "AI-powered design planning — Design Studio",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">From idea to print-ready, ${name}</h2>
        <p>Design Studio is your AI-powered workspace for planning new products before you ever fire up CAD.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 600;">&#x2728; Design Studio</p>
          <ul style="padding-left: 20px; margin: 0; color: #333; line-height: 1.8;">
            <li><strong>AI Brainstorm</strong> &mdash; describe what you want to make, get suggestions for materials, dimensions, and approach</li>
            <li><strong>Reference images</strong> &mdash; upload photos of inspiration pieces, AI analyses printability</li>
            <li><strong>Feasibility scoring</strong> &mdash; 1&ndash;10 rating with estimated cost and time</li>
            <li><strong>Revision tracking</strong> &mdash; version your designs from concept to production</li>
            <li><strong>One-click quote</strong> &mdash; turn a design into a quote when it's ready</li>
          </ul>
        </div>
        <p>Import reference files from Google Drive or OneDrive, and export finished designs straight to the cloud.</p>
        ${trialBanner(daysLeft)}
        ${integrationsBadges()}
        <p style="margin: 24px 0;">
          <a href="${appUrl}/designs" style="${CTA_STYLE}">Open Design Studio</a>
        </p>
        <p style="color: #666; font-size: 14px;">What would you design first? Reply and tell me &mdash; I'm curious!<br/>&mdash; Daniel</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },

  // Day 7 — Integrations + trial ending
  {
    key: "day_7",
    dayOffset: 7,
    subject: "Connect everything — Integrations & what's next",
    html: (name, appUrl, daysLeft, userId) => `
      <div style="${STYLE}">
        <h2 style="color: #171717;">You've made it to day 7, ${name}!</h2>
        <p>This is the last email in the series. Let's talk about connecting Printforge to the rest of your workflow.</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 12px; font-weight: 600;">&#x1F517; Integrations</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top; width: 140px;"><strong>Xero</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #555;">Sync invoices, contacts, and payments to your accounting</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top;"><strong>Shopify</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #555;">Pull orders from your Shopify store as print jobs automatically</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top;"><strong>Google Drive</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #555;">Import design files and export quote/invoice PDFs</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top;"><strong>OneDrive</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #555;">Same cloud features for Microsoft users</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top;"><strong>Webhooks</strong></td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; color: #555;">Connect to Zapier, Make, or custom services on any event</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;"><strong>CSV Export</strong></td>
              <td style="padding: 8px 0; color: #555;">Export quotes, clients, and jobs for reporting</td>
            </tr>
          </table>
        </div>
        ${daysLeft > 0 ? `
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600; color: #92400e;">&#x23F3; Your Pro trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}</p>
          <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">After your trial, you'll keep access to the calculator, quotes, materials, printers, clients, and jobs on the Free plan. Upgrade to Pro to keep invoicing, integrations, Design Studio, and more.</p>
        </div>` : ""}
        <p><strong>That's the tour!</strong> You've now seen everything Printforge can do. If you have any questions or feature requests, I'm always just a reply away.</p>
        <p style="margin: 24px 0;">
          <a href="${appUrl}/integrations" style="${CTA_STYLE}">Set Up Integrations</a>
        </p>
        <p style="color: #666; font-size: 14px;">Thanks for giving Printforge a go. I hope it helps your business.<br/><br/>Cheers,<br/><strong>Daniel Hall</strong><br/>Founder &amp; CEO, Printforge</p>
        ${HR}
        ${FOOTER}
        ${unsubscribeFooter(userId)}
      </div>`,
  },
];

// ---------------------------------------------------------------------------
// Send logic
// ---------------------------------------------------------------------------

/**
 * Check and send any pending drip emails for a user.
 * Called on dashboard load — lightweight, idempotent.
 * Returns the number of emails sent in this call.
 */
const MIN_GAP_MS = 24 * 60 * 60 * 1000; // 24 hours between emails

export async function processDripEmails(userId: string): Promise<number> {
  // Check global toggle — admins can disable drip emails system-wide
  const toggle = await prisma.systemConfig.findUnique({
    where: { key: "dripEmailsEnabled" },
    select: { value: true },
  });
  if (toggle?.value === "false") return 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      createdAt: true,
      trialEndsAt: true,
      marketingUnsubscribed: true,
      dripEmails: {
        select: { emailKey: true, sentAt: true },
        orderBy: { sentAt: "desc" },
      },
    },
  });

  if (!user?.email || user.marketingUnsubscribed) return 0;

  // Enforce 24h gap since last drip email
  const lastSent = user.dripEmails[0]?.sentAt;
  if (lastSent && Date.now() - lastSent.getTime() < MIN_GAP_MS) {
    return 0;
  }

  const sentKeys = new Set(user.dripEmails.map((d) => d.emailKey));
  const daysSinceSignup = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.printforge.com.au";
  const name = escapeHtml(user.name?.split(" ")[0] || "there");

  let sent = 0;

  for (const drip of DRIP_SEQUENCE) {
    // Skip if already sent
    if (sentKeys.has(drip.key)) continue;

    // Skip if not due yet
    if (daysSinceSignup < drip.dayOffset) continue;

    // Send at most 1 email per check to avoid flooding
    const html = drip.html(name, appUrl, trialDaysLeft, userId);
    const ok = await sendEmail({
      to: user.email,
      subject: drip.subject,
      html,
      type: "drip",
      userId,
    });

    if (ok) {
      await prisma.dripEmailLog.create({
        data: { userId, emailKey: drip.key },
      }).catch(() => {
        // Unique constraint = already sent (race condition), ignore
      });
      sent++;
    }

    // Only send one email per trigger to space them out
    break;
  }

  return sent;
}
