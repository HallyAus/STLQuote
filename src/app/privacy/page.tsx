import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Printforge Quote — how your data is handled in our self-hosted 3D print cost calculator and business management platform.",
  alternates: {
    canonical: "https://crm.printforge.com.au/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 26 February 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Overview</h2>
            <p className="mt-2">
              Printforge Quote is a self-hosted application. This Privacy Policy explains how
              data is handled when you use the Service. Because this software runs on your own
              infrastructure, you maintain full control over your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Data Collection</h2>
            <p className="mt-2">
              The Service collects and stores data that you provide directly, including:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Account information (name, email address, password hash)</li>
              <li>Client details (name, email, phone, company, address)</li>
              <li>Quote and job records</li>
              <li>Material and printer inventory data</li>
              <li>Calculator settings and presets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Data Storage</h2>
            <p className="mt-2">
              All data is stored in the PostgreSQL database on your self-hosted server. No data
              is transmitted to Printforge or any third party, except where you explicitly
              configure integrations (e.g. email via Resend, webhooks to your own endpoints).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Email</h2>
            <p className="mt-2">
              If configured, the Service sends transactional emails (password resets, email
              verification, quote delivery) via a third-party email provider. Email addresses
              used for these purposes are shared with the configured provider solely for delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Client Portal</h2>
            <p className="mt-2">
              When you send a quote to a client, a unique portal link is generated. Clients
              who access this link can view the quote and submit a response. No account
              creation or personal data collection occurs through the portal.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
            <p className="mt-2">
              The Service uses essential cookies for authentication session management. No
              tracking or analytics cookies are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Data Retention</h2>
            <p className="mt-2">
              Data is retained for as long as your account exists. As the server administrator,
              you have full access to the database and can delete any data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Your Rights</h2>
            <p className="mt-2">
              As this is a self-hosted application, you have complete control over all stored
              data. You can access, modify, export, or delete any data directly through the
              application interface or database.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p className="mt-2">
              For questions about this Privacy Policy, contact us at{" "}
              <a
                href="mailto:hello@printforge.com.au"
                className="text-primary hover:underline"
              >
                hello@printforge.com.au
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
