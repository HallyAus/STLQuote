import type { Metadata } from "next";
import Link from "next/link";
import {
  Calculator,
  FileText,
  Palette,
  Briefcase,
  FileDown,
  Printer,
  ArrowRight,
  ChevronRight,
  Check,
  Sparkles,
  Receipt,
  Users,
  Package,
  Wrench,
  Shield,
  BarChart3,
  Zap,
  Bot,
  ShoppingBag,
  Plug,
  Send,
  MessageSquare,
  CreditCard,
  Gamepad2,
  Upload,
  CalendarDays,
  Crown,
  Globe,
  X,
  Minus,
  Link2,
  HardDrive,
  Cloud,
  PenTool,
  Mail,
} from "lucide-react";
import { CalculatorDemo } from "@/components/landing/calculator-demo";

export const metadata: Metadata = {
  title: "Free 3D Print Cost Calculator & Quote Software | Printforge",
  description:
    "Calculate your 3D printing costs instantly. Free 3D print cost calculator with material, machine, labour & overhead breakdown. Generate professional quotes, track jobs, and manage your 3D printing business. Try free — no credit card required.",
  keywords: [
    "3D print cost calculator",
    "3D printing quote software",
    "3D printing pricing tool",
    "3D print quoting",
    "3D printing business software",
    "3D print cost estimator",
    "STL file cost calculator",
    "G-code cost calculator",
    "3D printing invoice software",
    "3D print shop management",
  ],
  alternates: {
    canonical: "https://crm.printforge.com.au",
  },
  openGraph: {
    title: "Free 3D Print Cost Calculator & Quote Software | Printforge",
    description:
      "Stop guessing your 3D print costs. Calculate material, machine, labour & overhead costs instantly. Generate professional quotes, track jobs, and invoice clients. Free to start.",
    url: "https://crm.printforge.com.au",
    type: "website",
    locale: "en_AU",
    siteName: "Printforge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free 3D Print Cost Calculator & Quote Software | Printforge",
    description:
      "Calculate 3D printing costs instantly. Material, machine, labour & overhead — all in one tool. Free to start, no credit card.",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const HERO_BADGES = [
  "Print Farms",
  "Makers",
  "Etsy Sellers",
  "Shopify Stores",
  "Small Businesses",
];

const STATS = [
  { value: "< 1 min", label: "to calculate a quote" },
  { value: "100%", label: "secure & private" },
  { value: "14 days", label: "free Pro trial" },
  { value: "$0", label: "to get started" },
];

const FEATURES = [
  {
    icon: Calculator,
    title: "Cost Calculator",
    description:
      "Material, machine, labour, overhead — all calculated instantly. Upload STL or G-code files from Bambu Studio, OrcaSlicer, PrusaSlicer, or Cura for automatic estimates.",
    badge: "Core",
  },
  {
    icon: Bot,
    title: "AI Quote Assistant",
    description:
      "Describe a print job in plain English — or upload a reference image. Claude generates structured line items with material selection, cost estimates, and feasibility notes. Pro feature.",
    badge: "Pro",
  },
  {
    icon: FileText,
    title: "Professional Quotes",
    description:
      "Numbered quotes with line items, markup, terms, and expiry dates. Track from draft through sent to accepted. Save templates for repeat jobs.",
    badge: null,
  },
  {
    icon: Receipt,
    title: "Invoicing",
    description:
      "Create invoices from quotes or jobs. PDF generation with TAX INVOICE header, GST, ABN, and PAID watermark. Send via email with PDF attachment.",
    badge: "Pro",
  },
  {
    icon: Briefcase,
    title: "Job Tracking",
    description:
      "Kanban board with 7 stages — queued through to shipped. Print farm calendar with weekly Gantt view. Drag-and-drop scheduling across printers.",
    badge: null,
  },
  {
    icon: Palette,
    title: "Material & Inventory",
    description:
      "Track filament and resin stock levels, costs per gram, and low-stock alerts. Manage suppliers with part numbers and reorder thresholds.",
    badge: null,
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "Full client database with tags, payment terms, and interaction timeline (calls, emails, meetings). Auto-created from Shopify orders.",
    badge: null,
  },
  {
    icon: Link2,
    title: "Customer Upload Links",
    description:
      "Create shareable links for customers to upload 3D files directly. Uploaded files land in your quote request queue with customer details — ready to review and quote.",
    badge: null,
  },
  {
    icon: FileDown,
    title: "PDF Export",
    description:
      "Print-ready quote and invoice PDFs with your business logo, line item breakdown, terms, and payment details. Multi-currency support (AUD, USD, EUR, GBP).",
    badge: null,
  },
  {
    icon: BarChart3,
    title: "Dashboard Analytics",
    description:
      "Revenue tracking, quote conversion rates, printer utilisation bars, top materials breakdown, and average markup insights at a glance.",
    badge: "Pro",
  },
  {
    icon: Upload,
    title: "STL & G-code Upload",
    description:
      "Upload slicer files to auto-fill print time, weight, and material. Supports Bambu Studio, OrcaSlicer, PrusaSlicer, and Cura metadata.",
    badge: null,
  },
  {
    icon: CalendarDays,
    title: "Print Farm Calendar",
    description:
      "Weekly Gantt grid view — printer rows, hour columns. Native drag-to-reschedule. Unscheduled jobs sidebar. Built for multi-printer farms.",
    badge: null,
  },
  {
    icon: Wrench,
    title: "Consumables Tracking",
    description:
      "Track nozzles, build plates, and other consumables. Stock alerts, reorder thresholds, and supplier links for one-click reordering.",
    badge: "Pro",
  },
  {
    icon: PenTool,
    title: "Design Studio",
    description:
      "Manage design projects with AI chat, reference image analysis, file versioning, and revision timelines. Generate briefs and convert designs to quotes.",
    badge: "Pro",
  },
  {
    icon: Cloud,
    title: "Cloud Storage",
    description:
      "Sync design files, quotes, and invoices to Google Drive or OneDrive. Auto-creates organised folder structure. Connect via OAuth in seconds.",
    badge: "Pro",
  },
];

const INTEGRATIONS_ACTIVE = [
  {
    icon: ShoppingBag,
    name: "Shopify",
    description:
      "Pull unfulfilled orders as jobs automatically. Auto-creates clients from customer data with pricing. One-click sync.",
    status: "live" as const,
  },
  {
    icon: Globe,
    name: "Xero",
    description:
      "Sync contacts, invoices, and payments to your Xero account. OAuth connection — your data stays in Printforge, Xero receives a copy.",
    status: "live" as const,
  },
  {
    icon: Bot,
    name: "AI Assistant",
    description:
      "Describe a job in plain English and get a structured quote draft with line items, material selection, and cost estimates. Powered by Claude.",
    status: "live" as const,
  },
  {
    icon: Zap,
    name: "Webhooks",
    description:
      "Trigger external services on quote and job events — created, updated, accepted, completed. HMAC-signed payloads with test mode.",
    status: "live" as const,
  },
  {
    icon: HardDrive,
    name: "Google Drive",
    description:
      "Export design files, quote PDFs, and invoices directly to Google Drive. Auto-creates Printforge CRM folder structure with organised sub-folders.",
    status: "live" as const,
  },
  {
    icon: Cloud,
    name: "OneDrive",
    description:
      "Sync files to Microsoft OneDrive with the same organised folder structure. Each user connects their own account via OAuth.",
    status: "live" as const,
  },
];

const INTEGRATIONS_SOON = [
  { icon: CreditCard, name: "Stripe Connect", description: "Accept payments from invoices" },
  { icon: MessageSquare, name: "Slack", description: "Quote & job notifications" },
  { icon: Gamepad2, name: "Discord", description: "Job updates to your server" },
  { icon: Send, name: "Telegram", description: "Instant bot notifications" },
];

const STEPS = [
  {
    number: "01",
    title: "Calculate",
    description:
      "Enter material, machine, and labour costs — or upload your slicer files for instant estimates. Save presets for repeat materials.",
  },
  {
    number: "02",
    title: "Quote",
    description:
      "Convert calculations into professional quotes with markup, client details, and payment terms. Use AI to draft quotes from a description.",
  },
  {
    number: "03",
    title: "Track",
    description:
      "Manage jobs on a kanban board or print farm calendar. Drag-and-drop scheduling across your printer fleet. Invoice on completion.",
  },
];

const COMPARISON = [
  { feature: "Cost calculator", spreadsheet: false, printforge: true },
  { feature: "Auto-fill from G-code", spreadsheet: false, printforge: true },
  { feature: "Professional PDF quotes", spreadsheet: false, printforge: true },
  { feature: "Client database", spreadsheet: false, printforge: true },
  { feature: "Job tracking (kanban)", spreadsheet: false, printforge: true },
  { feature: "Inventory & stock alerts", spreadsheet: false, printforge: true },
  { feature: "Invoicing with email", spreadsheet: false, printforge: true },
  { feature: "Shopify / Xero sync", spreadsheet: false, printforge: true },
  { feature: "Customer upload links", spreadsheet: false, printforge: true },
  { feature: "AI quote drafting", spreadsheet: false, printforge: true },
  { feature: "Design studio with AI", spreadsheet: false, printforge: true },
  { feature: "Cloud storage sync", spreadsheet: false, printforge: true },
  { feature: "Multi-user with roles", spreadsheet: false, printforge: true },
];

const FREE_FEATURES = [
  "Cost calculator + presets",
  "Unlimited quotes + PDF download",
  "Printers & materials library",
  "Client management",
  "Job tracking (kanban + calendar)",
  "Customer upload links",
  "STL & G-code upload",
  "Quote templates",
  "Dark mode",
];

const PRO_FEATURES = [
  "Everything in Free",
  "AI Quote Assistant (Claude)",
  "Invoicing with PDF & email",
  "Client portal (shareable links)",
  "Send quotes via email",
  "Shopify integration",
  "Xero accounting sync",
  "Suppliers & consumables",
  "Dashboard analytics",
  "Business logo on PDFs",
  "Webhooks & CSV export",
  "Job photos",
  "Bulk actions",
  "Design Studio with AI",
  "Cloud Storage (Google Drive, OneDrive)",
];

interface PricingFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}

const PRICING_COMPARE: PricingFeature[] = [
  { name: "Cost calculator", free: true, pro: true },
  { name: "Unlimited quotes", free: true, pro: true },
  { name: "PDF export", free: true, pro: true },
  { name: "Printers & materials", free: true, pro: true },
  { name: "Client management", free: true, pro: true },
  { name: "Job tracking", free: true, pro: true },
  { name: "STL & G-code upload", free: true, pro: true },
  { name: "Customer upload links", free: true, pro: true },
  { name: "Quote templates", free: true, pro: true },
  { name: "AI Quote Assistant", free: false, pro: true },
  { name: "Invoicing", free: false, pro: true },
  { name: "Client portal", free: false, pro: true },
  { name: "Email quotes & invoices", free: false, pro: true },
  { name: "Shopify integration", free: false, pro: true },
  { name: "Xero sync", free: false, pro: true },
  { name: "Suppliers & consumables", free: false, pro: true },
  { name: "Dashboard analytics", free: false, pro: true },
  { name: "Webhooks", free: false, pro: true },
  { name: "CSV export", free: false, pro: true },
  { name: "Business logo on PDFs", free: false, pro: true },
  { name: "Job photos", free: false, pro: true },
  { name: "Bulk actions", free: false, pro: true },
  { name: "Design Studio", free: false, pro: true },
  { name: "Cloud Storage", free: false, pro: true },
];

const FAQ = [
  {
    q: "What happens after the 14-day trial?",
    a: "You keep all your data and the Free tier features forever. Pro features simply lock until you subscribe. No data is deleted.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. Sign up and get 14 days of Pro features completely free. We only ask for payment if you decide to continue with Pro.",
  },
  {
    q: "What printers are supported?",
    a: "Any 3D printer. The calculator is generic — enter your machine's specs and costs. G-code parsing supports Bambu Studio, OrcaSlicer, PrusaSlicer, and Cura.",
  },
  {
    q: "Can I import orders from Shopify?",
    a: "Yes. Connect your Shopify store and Printforge pulls unfulfilled orders as jobs, auto-creates client records, and tracks pricing. One-click sync or automatic via webhooks.",
  },
  {
    q: "How does the AI assistant work?",
    a: "Describe a print job in plain English (e.g. 'PETG phone stand, 50g, red') and Claude generates a structured quote with line items, material costs, and print time estimates based on your actual printer and material data.",
  },
  {
    q: "Can multiple people use it?",
    a: "Yes. Printforge supports multiple users with role-based access. Each user sees only their own data.",
  },
  {
    q: "How do customer upload links work?",
    a: "Create a shareable link from the Requests page and send it to customers via email, your website, or social media. They can upload 3D files (STL, 3MF, STEP, OBJ, G-code) with their name and details. Files appear in your quote request queue — review, quote, or dismiss. Each link is rate-limited and revocable.",
  },
  {
    q: "What currencies are supported?",
    a: "AUD, USD, EUR, and GBP. Set your default in settings — all quotes, invoices, and calculations use your chosen currency.",
  },
  {
    q: "How do you calculate 3D printing costs?",
    a: "Total Cost = Material + Machine Time + Labour + Overhead. Material cost is part weight (plus supports and waste) multiplied by per-gram filament cost. Machine cost includes electricity, depreciation, and maintenance per hour. Labour covers setup, post-processing, and packing. Overhead includes monthly fixed costs divided across jobs. Printforge automates this entire calculation — upload your STL or G-code file and get an instant breakdown.",
  },
  {
    q: "How much does it cost to 3D print something?",
    a: "Typically $0.50 to $50+ depending on size, material, and complexity. A small PLA keychain might cost $0.50–$2 in materials plus $1–3 in machine time. A large PETG enclosure could cost $10–20 in materials plus $5–10 in machine time. Use Printforge's free calculator to get exact cost breakdowns for your specific prints.",
  },
  {
    q: "What is the best 3D printing quote software?",
    a: "Printforge is a free 3D printing quote software for small to medium print shops. It includes a cost calculator, professional PDF quotes, job tracking, inventory management, Shopify integration, and AI-powered quote drafting. The free tier includes unlimited quotes with no per-quote fees.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FeatureCheck({ included }: { included: boolean | string }) {
  if (typeof included === "string") {
    return <span className="text-sm text-muted-foreground">{included}</span>;
  }
  return included ? (
    <Check className="h-4 w-4 text-primary" />
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground/30" />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ----------------------------------------------------------------- */}
      {/* Nav */}
      {/* ----------------------------------------------------------------- */}
      <nav className="fixed top-0 left-0 right-0 md:sticky md:top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Printer className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Printforge</span>
          </div>
          <div className="hidden items-center gap-6 text-sm sm:flex">
            <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#demo" className="text-muted-foreground transition-colors hover:text-foreground">
              Demo
            </a>
            <a href="#integrations" className="text-muted-foreground transition-colors hover:text-foreground">
              Integrations
            </a>
            <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">
              FAQ
            </a>
            <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
              Blog
            </Link>
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

      {/* ----------------------------------------------------------------- */}
      {/* Hero */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-[57px] md:pt-0">
        {/* Gradient background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -top-24 left-1/4 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center lg:pb-28 lg:pt-28">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Trial badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              14-day free Pro trial &middot; No credit card required
            </div>

            {/* Headline */}
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              The free{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                3D print cost calculator
              </span>
              {" "}that does it all
            </h1>

            {/* Subheadline */}
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Stop guessing. Calculate material, machine, labour, and overhead costs in seconds.
              Generate professional quotes, track jobs, manage inventory, and invoice clients
              — the complete 3D printing business software, free to start.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                Sign in
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Built for badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
              <span className="text-xs font-medium text-muted-foreground/60">Built for:</span>
              {HERO_BADGES.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Stats bar */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-6 py-8 text-center">
              <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Features */}
      {/* ----------------------------------------------------------------- */}
      <section id="features" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              3D print cost calculator features for every print shop
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built for 3D print shops — not another generic invoicing tool.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                {feature.badge && (
                  <span
                    className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      feature.badge === "Pro"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {feature.badge}
                  </span>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
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

      {/* ----------------------------------------------------------------- */}
      {/* How it works */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-border/50 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              How the 3D printing quote software works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From file upload to delivered order — streamlined for speed.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[calc(50%+2rem)] right-[calc(-50%+2rem)] top-7 hidden border-t-2 border-dashed border-primary/20 md:block" />
                )}
                <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20">
                  {step.number}
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

      {/* ----------------------------------------------------------------- */}
      {/* Calculator Demo */}
      {/* ----------------------------------------------------------------- */}
      <section id="demo" className="scroll-mt-16 border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <CalculatorDemo />
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Integrations */}
      {/* ----------------------------------------------------------------- */}
      <section id="integrations" className="scroll-mt-16 border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Integrations
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              3D printing software integrations
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pull orders from Shopify, sync accounting with Xero, export files to Google Drive or OneDrive, draft quotes with AI, and trigger webhooks — all built in.
            </p>
          </div>

          {/* Active integrations */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {INTEGRATIONS_ACTIVE.map((int) => (
              <div
                key={int.name}
                className="flex gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <int.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{int.name}</h3>
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success-foreground">
                      Live
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {int.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {INTEGRATIONS_SOON.map((int) => (
              <div
                key={int.name}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 opacity-60"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <int.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{int.name}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">Coming soon</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Why not a spreadsheet? */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-border/50 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Comparison
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              3D print quoting software vs spreadsheets
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              You could track everything in a spreadsheet. But should you?
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-xl">
            <div className="overflow-hidden rounded-xl border border-border">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_80px] bg-muted/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Feature</span>
                <span className="text-center">Sheet</span>
                <span className="text-center text-primary">Printforge</span>
              </div>
              {/* Rows */}
              {COMPARISON.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[1fr_80px_80px] items-center px-4 py-2.5 text-sm ${
                    i % 2 === 0 ? "bg-card" : "bg-card/50"
                  }`}
                >
                  <span>{row.feature}</span>
                  <span className="flex justify-center">
                    <X className="h-4 w-4 text-destructive-foreground/50" />
                  </span>
                  <span className="flex justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Pricing */}
      {/* ----------------------------------------------------------------- */}
      <section id="pricing" className="scroll-mt-16 border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              3D print cost calculator pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start with a 14-day Pro trial. No credit card required. Keep Free forever.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-border bg-card p-8">
              <h3 className="text-lg font-semibold">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Everything you need to calculate costs and create quotes. No limits, no expiry.
              </p>
              <Link
                href="/register"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Get started free
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
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-xl shadow-primary/5">
              <div className="absolute -top-3.5 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                <Crown className="h-3 w-3" />
                Most Popular
              </div>
              <h3 className="text-lg font-semibold">Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                or <strong>$290/year</strong> (save 17%)
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Full business management with AI, invoicing, analytics, and integrations.
              </p>
              <Link
                href="/register"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl"
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

          {/* Feature comparison table */}
          <div className="mx-auto mt-20 max-w-3xl">
            <h3 className="text-center text-lg font-semibold">
              Full feature comparison
            </h3>
            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_80px_80px] bg-muted/50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Feature</span>
                <span className="text-center">Free</span>
                <span className="text-center">Pro</span>
              </div>
              {PRICING_COMPARE.map((row, i) => (
                <div
                  key={row.name}
                  className={`grid grid-cols-[1fr_80px_80px] items-center px-6 py-2.5 text-sm ${
                    i % 2 === 0 ? "bg-card" : "bg-card/50"
                  }`}
                >
                  <span>{row.name}</span>
                  <span className="flex justify-center">
                    <FeatureCheck included={row.free} />
                  </span>
                  <span className="flex justify-center">
                    <FeatureCheck included={row.pro} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* FAQ */}
      {/* ----------------------------------------------------------------- */}
      <section id="faq" className="scroll-mt-16 border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              3D print cost calculator FAQ
            </h2>
          </div>

          <div className="mt-12 divide-y divide-border">
            {FAQ.map((item) => (
              <div key={item.q} className="py-6">
                <h3 className="text-sm font-semibold text-foreground">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* From the Blog */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-border/50 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Resources
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              3D printing business guides
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Learn how to price 3D prints, choose materials, and grow your print business.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Link href="/blog/how-to-price-3d-prints-for-profit" className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
              <h3 className="font-semibold group-hover:text-primary">How to Price 3D Prints for Profit</h3>
              <p className="mt-2 text-sm text-muted-foreground">The proven formula for covering costs and staying competitive.</p>
            </Link>
            <Link href="/blog/how-to-calculate-3d-printing-costs-accurately" className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
              <h3 className="font-semibold group-hover:text-primary">How to Calculate 3D Printing Costs Accurately</h3>
              <p className="mt-2 text-sm text-muted-foreground">Material, machine, labour, and overhead — the complete breakdown.</p>
            </Link>
            <Link href="/blog/why-3d-print-businesses-need-quoting-software" className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
              <h3 className="font-semibold group-hover:text-primary">Why 3D Print Businesses Need Quoting Software</h3>
              <p className="mt-2 text-sm text-muted-foreground">Stop losing money with spreadsheets and manual calculations.</p>
            </Link>
          </div>
          <div className="mt-8 text-center">
            <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
              View all guides →
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Final CTA */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative border-t border-border/50 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Start calculating your 3D printing costs today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Join print shops already using Printforge to quote accurately,
            track jobs, and grow their business.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
            >
              Start your free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            14-day Pro trial &middot; No credit card required &middot; Free tier forever
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Footer */}
      {/* ----------------------------------------------------------------- */}
      <footer className="border-t border-border/50 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Printer className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">Printforge</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                The complete business platform for 3D print shops.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <div className="mt-4 space-y-2.5">
                <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </a>
                <a href="#integrations" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Integrations
                </a>
                <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </a>
                <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </a>
                <Link href="/blog" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Legal
              </p>
              <div className="mt-4 space-y-2.5">
                <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>

            {/* Support */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Support
              </p>
              <div className="mt-4 space-y-2.5">
                <Link href="/login" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link href="/register" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Create account
                </Link>
                <Link href="/waitlist" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Join waitlist
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Printforge. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://buymeacoffee.com/printforge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Buy me a coffee
              </a>
              <a
                href="https://www.starlink.com/referral"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Free month of Starlink
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": "https://crm.printforge.com.au/#website",
                url: "https://crm.printforge.com.au",
                name: "Printforge",
                description: "Free 3D Print Cost Calculator & Business Management Software",
                publisher: { "@id": "https://crm.printforge.com.au/#organization" },
                inLanguage: "en-AU",
              },
              {
                "@type": "Organization",
                "@id": "https://crm.printforge.com.au/#organization",
                name: "Printforge",
                url: "https://crm.printforge.com.au",
                logo: {
                  "@type": "ImageObject",
                  url: "https://crm.printforge.com.au/icon.svg",
                },
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "AU",
                },
              },
              {
                "@type": "SoftwareApplication",
                "@id": "https://crm.printforge.com.au/#software",
                name: "Printforge — 3D Print Cost Calculator",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                url: "https://crm.printforge.com.au",
                description:
                  "Free 3D print cost calculator that calculates material, machine, labour, and overhead costs. Generate professional quotes, track jobs, manage inventory, and invoice clients.",
                offers: [
                  {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "AUD",
                    name: "Free",
                    description: "Cost calculator, unlimited quotes, job tracking, client management",
                  },
                  {
                    "@type": "Offer",
                    price: "29",
                    priceCurrency: "AUD",
                    name: "Pro",
                    description: "Everything in Free plus AI assistant, invoicing, analytics, integrations",
                  },
                ],
                featureList: [
                  "3D print cost calculator",
                  "STL and G-code file upload",
                  "Professional PDF quotes",
                  "Job tracking kanban board",
                  "Print farm calendar",
                  "Material inventory management",
                  "Client database",
                  "Invoicing with email",
                  "Shopify integration",
                  "Xero accounting sync",
                  "AI quote assistant",
                  "Design Studio with AI",
                  "Google Drive sync",
                  "OneDrive sync",
                ],
              },
              {
                "@type": "FAQPage",
                "@id": "https://crm.printforge.com.au/#faq",
                mainEntity: FAQ.map((item) => ({
                  "@type": "Question",
                  name: item.q,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.a,
                  },
                })),
              },
            ],
          }),
        }}
      />
    </div>
  );
}
