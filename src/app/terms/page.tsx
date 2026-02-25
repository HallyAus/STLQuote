import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 26 February 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing and using Printforge Quote (&quot;the Service&quot;), you agree to be bound
              by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="mt-2">
              Printforge Quote is a self-hosted 3D print cost calculator and business management
              platform. The Service allows you to calculate costs, manage clients, generate quotes,
              track inventory, and manage print jobs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account. You agree to provide accurate
              information when creating an account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Ownership</h2>
            <p className="mt-2">
              You retain full ownership of all data you input into the Service, including client
              information, quotes, materials, and job records. As this is a self-hosted application,
              your data remains on your own infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="mt-2">
              You agree not to use the Service for any unlawful purpose or in any way that could
              damage, disable, or impair the Service. You are solely responsible for ensuring your
              use complies with applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Disclaimer of Warranties</h2>
            <p className="mt-2">
              The Service is provided &quot;as is&quot; without warranties of any kind, either express
              or implied. Printforge does not guarantee the accuracy of cost calculations — these
              are estimates based on the parameters you provide.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, Printforge shall not be liable for any
              indirect, incidental, special, or consequential damages arising from your use of
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Changes to Terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. Continued use of the Service after
              changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
            <p className="mt-2">
              For questions about these Terms, contact us at{" "}
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
