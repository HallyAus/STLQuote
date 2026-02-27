import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ArrowLeft, Calendar, Clock, Tag, ArrowRight } from "lucide-react";
import { getBlogPost, getRecentPosts, BLOG_POSTS } from "@/lib/blog-posts";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Not Found — Printforge Blog" };

  return {
    title: `${post.title} — Printforge Blog`,
    description: post.excerpt,
  };
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  // Get related posts (same category, excluding current)
  const related = getRecentPosts(20)
    .filter((p) => p.slug !== slug && p.category === post.category)
    .slice(0, 3);

  // If not enough related by category, fill with recent
  if (related.length < 3) {
    const more = getRecentPosts(20)
      .filter((p) => p.slug !== slug && !related.some((r) => r.slug === p.slug))
      .slice(0, 3 - related.length);
    related.push(...more);
  }

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
            <Link href="/blog" className="font-medium text-foreground">
              Blog
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

      {/* Breadcrumb */}
      <div className="mx-auto max-w-3xl px-6 pt-[calc(57px+2rem)] md:pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to blog
        </Link>
      </div>

      {/* Article */}
      <article className="mx-auto max-w-3xl px-6 py-8">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(post.publishedAt).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {post.readingTime} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/* Author */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Printer className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">{post.author}</span>
        </div>

        {/* Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Content */}
        <div
          className="prose prose-neutral dark:prose-invert mt-10 max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
          <h3 className="text-xl font-bold">Try Printforge for free</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Calculate costs, create quotes, and manage your 3D print business — all in one place.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="border-t border-border/50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-xl font-bold">Related posts</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-primary w-fit">
                    {p.category}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                    {p.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs text-muted-foreground line-clamp-2">
                    {p.excerpt}
                  </p>
                  <span className="mt-3 text-xs text-muted-foreground">
                    {p.readingTime} min read
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
