import Link from "next/link";
import { Printer } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-8">
        {/* Main grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand column — wider */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
                <Printer className="h-[18px] w-[18px] text-primary-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">Printforge</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The complete business platform for 3D print shops. Calculate costs,
              create quotes, track jobs, and manage your entire operation.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/register"
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Start free trial
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Product */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Product
            </p>
            <nav className="mt-4 flex flex-col gap-2.5">
              <Link href="/#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Features
              </Link>
              <Link href="/#integrations" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Integrations
              </Link>
              <Link href="/#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Pricing
              </Link>
              <Link href="/#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                FAQ
              </Link>
              <Link href="/roadmap" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Roadmap
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Resources
            </p>
            <nav className="mt-4 flex flex-col gap-2.5">
              <Link href="/learn" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Learning Centre
              </Link>
              <Link href="/blog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Blog
              </Link>
              <Link href="/#demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Live Demo
              </Link>
              <Link href="/learn/getting-started-welcome" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Getting Started
              </Link>
            </nav>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Company
            </p>
            <nav className="mt-4 flex flex-col gap-2.5">
              <a
                href="https://printforge.com.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Printforge Store
              </a>
              <Link href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* Community */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground">
              Community
            </p>
            <nav className="mt-4 flex flex-col gap-2.5">
              <a
                href="https://buymeacoffee.com/printforge"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Buy Me a Coffee
              </a>
              <a
                href="https://www.starlink.com/referral"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Free Month of Starlink
              </a>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 border-t border-border/50" />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Printforge. All rights reserved.
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              Made in Australia for 3D print businesses worldwide.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
            <span>Hobby tier free forever</span>
            <span>&middot;</span>
            <span>No credit card required</span>
            <span>&middot;</span>
            <span>14-day Scale trial</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
