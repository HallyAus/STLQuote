import type { Metadata } from "next";
import Link from "next/link";
import { Printer, ArrowRight, BookOpen } from "lucide-react";
import { LEARN_ARTICLES, LEARN_CATEGORIES, getArticlesByCategory } from "@/lib/learn-articles";
import { CategoryCard } from "@/components/learn/category-card";
import { LearnSearch } from "@/components/learn/learn-search";

export const metadata: Metadata = {
  title: "Learning Centre — Guides & Tutorials | Printforge",
  description:
    "Learn how to use Printforge — from your first cost calculation to advanced integrations. Guides for every feature, written for 3D printing businesses.",
  alternates: {
    canonical: "https://crm.printforge.com.au/learn",
  },
  openGraph: {
    title: "Learning Centre — Guides & Tutorials | Printforge",
    description:
      "Learn how to use Printforge — from your first cost calculation to advanced integrations.",
    url: "https://crm.printforge.com.au/learn",
    type: "website",
  },
};

export default function LearnPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 md:sticky md:top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Printer className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Printforge</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm sm:flex">
            <Link href="/#features" className="text-muted-foreground transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
              Blog
            </Link>
            <Link href="/learn" className="font-medium text-foreground">
              Learn
            </Link>
            <Link href="/#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
              Pricing
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

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-[calc(57px+3rem)] md:pt-16 pb-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Learning Centre
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Master 3D print quoting — from your first calculation to advanced integrations.
          Guides for every feature, written for real 3D printing businesses.
        </p>
      </section>

      {/* Category grid */}
      <section className="mx-auto max-w-6xl px-6 pb-12">
        <h2 className="text-lg font-bold text-foreground">Browse by topic</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {LEARN_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.slug}
              category={cat}
              articleCount={getArticlesByCategory(cat.slug).length}
            />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-6">
        <hr className="border-border/50" />
      </div>

      {/* All articles (filterable) */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-lg font-bold text-foreground">All articles</h2>
        <div className="mt-4">
          <LearnSearch articles={LEARN_ARTICLES} />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Ready to get started?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Start your free 14-day Scale trial — no credit card required.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-muted-foreground/60">
              &copy; {new Date().getFullYear()} Printforge. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                Home
              </Link>
              <Link href="/blog" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                Blog
              </Link>
              <Link href="/learn" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                Learn
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
