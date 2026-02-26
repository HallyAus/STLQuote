import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  FileText,
  Palette,
  Briefcase,
  FileDown,
  Moon,
  Printer,
  ArrowRight,
  Shield,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Printforge Quote — Stop Guessing Your 3D Print Costs",
  description:
    "The complete business tool for 3D print shops. Calculate costs, send professional quotes, manage materials, and track jobs.",
  openGraph: {
    title: "Printforge Quote — Stop Guessing Your 3D Print Costs",
    description:
      "Calculate costs, send professional quotes, manage materials, and track jobs.",
  },
};

const FREE_FEATURES = [
  "Cost calculator + presets",
  "Unlimited quotes + PDF download",
  "Printers & materials library",
  "Client management",
  "Job tracking (kanban)",
  "STL/G-code upload",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Client portal (shareable quote links)",
  "Send quotes via email",
  "Invoicing with PDF & email",
  "Suppliers & consumables tracking",
  "Webhooks",
  "CSV export",
  "Job photos",
  "Business logo on PDFs",
  "Dashboard analytics",
  "Xero accounting sync",
];

const features = [
  {
    icon: Calculator,
    title: "Cost Calculator",
    description:
      "Instant material, machine, labour, and overhead cost calculations. Upload STL or G-code files for automatic estimates.",
  },
  {
    icon: FileText,
    title: "Professional Quotes",
    description:
      "Generate numbered quotes with line items, markup, and terms. Track status from draft to accepted.",
  },
  {
    icon: Palette,
    title: "Material Library",
    description:
      "Track your filament and resin inventory. Stock levels, costs per gram, and low stock alerts.",
  },
  {
    icon: Briefcase,
    title: "Job Tracking",
    description:
      "Kanban board for print jobs. Track from queue through printing, post-processing, and shipping.",
  },
  {
    icon: FileDown,
    title: "PDF Export",
    description:
      "Print-ready quote PDFs with your business branding, line item breakdown, and terms.",
  },
  {
    icon: Moon,
    title: "Dark Mode",
    description:
      "Built for the workshop. Dark theme by default with careful contrast tuning for readability.",
  },
];

const steps = [
  {
    number: "01",
    title: "Calculate",
    description:
      "Enter material, machine, and labour costs — or upload your slicer files for instant estimates.",
  },
  {
    number: "02",
    title: "Quote",
    description:
      "Convert calculations into professional quotes with markup, client details, and payment terms.",
  },
  {
    number: "03",
    title: "Track",
    description:
      "Manage print jobs from queue to delivery. Know exactly where every order stands.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Printer className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Printforge
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center lg:py-32">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            14-day free Pro trial &middot; No credit card required
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Stop guessing your{" "}
            <span className="text-primary">3D print costs</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            The complete business tool for 3D print shops. Calculate costs,
            send professional quotes, manage materials, and track jobs.
            Start free, upgrade when you&apos;re ready.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
            >
              Sign in
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to run a print business
            </h2>
            <p className="mt-4 text-muted-foreground">
              Purpose-built for 3D print shops — not another generic invoicing tool.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Three steps to accurate pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              From file upload to delivered order — streamlined for speed.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/5">
                  <span className="text-lg font-bold text-primary">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border/50 bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-muted-foreground">
              Start with a 14-day Pro trial. No credit card required.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 mx-auto max-w-4xl">
            {/* Free */}
            <div className="rounded-xl border border-border bg-card p-8">
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold tracking-tight">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything you need to calculate costs and create quotes.
              </p>
              <Link
                href="/register"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Get started
              </Link>
              <ul className="mt-8 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="relative rounded-xl border-2 border-primary bg-card p-8">
              <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                Most Popular
              </div>
              <h3 className="text-lg font-semibold">Pro</h3>
              <div className="mt-4">
                <span className="text-4xl font-bold tracking-tight">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                or $290/year (save 17%)
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Full business management with invoicing, analytics, and integrations.
              </p>
              <Link
                href="/register"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Start 14-day free trial
              </Link>
              <ul className="mt-8 space-y-3">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to know your real costs?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start your 14-day Pro trial. No credit card required.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Printer className="h-4 w-4" />
            <span>Printforge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
