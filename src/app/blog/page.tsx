import type { Metadata } from "next";
import Link from "next/link";
import { Printer, ArrowRight, Calendar, Clock } from "lucide-react";
import { getRecentPosts } from "@/lib/blog-posts";
import { PublicFooter } from "@/components/layout/public-footer";

export const metadata: Metadata = {
  title: "3D Printing Business Blog — Pricing Guides, Tips & Tutorials | Printforge",
  description:
    "Guides, tips, and insights for 3D print businesses. Learn how to price prints, choose materials, reduce waste, and grow your business.",
  alternates: {
    canonical: "https://crm.printforge.com.au/blog",
  },
  openGraph: {
    title: "3D Printing Business Blog — Pricing Guides & Tips | Printforge",
    description:
      "Guides, tips, and insights for 3D print businesses. Learn how to price prints, choose materials, reduce waste, and grow your business.",
    url: "https://crm.printforge.com.au/blog",
    type: "website",
  },
};

export default function BlogPage() {
  const posts = getRecentPosts(20);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav — same as landing page */}
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
            <Link href="/#demo" className="text-muted-foreground transition-colors hover:text-foreground">
              Demo
            </Link>
            <Link href="/blog" className="font-medium text-foreground">
              Blog
            </Link>
            <Link href="/learn" className="text-muted-foreground transition-colors hover:text-foreground">
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
      <section className="border-b border-border/50 bg-card/30 pt-[57px] md:pt-0">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            3D Printing Business Guides & Tips
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Guides, tips, and insights for running a successful 3D printing business.
            From pricing strategies to material selection — everything you need to grow.
          </p>
        </div>
      </section>

      {/* Featured post */}
      {featured && (
        <section className="mx-auto max-w-6xl px-6 py-12">
          <Link
            href={`/blog/${featured.slug}`}
            className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg"
          >
            <div className="p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {featured.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(featured.publishedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {featured.readingTime} min read
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight transition-colors group-hover:text-primary sm:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground line-clamp-3">
                {featured.excerpt}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Read more
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Post grid */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readingTime} min
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to streamline your 3D print business?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Stop guessing your costs. Start quoting accurately with Printforge.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
