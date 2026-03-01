import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ArrowRight, ChevronRight, Clock } from "lucide-react";
import {
  getLearnArticle,
  getLearnCategory,
  LEARN_ARTICLES,
  addHeadingIds,
  extractHeadings,
} from "@/lib/learn-articles";
import { DifficultyBadge } from "@/components/learn/difficulty-badge";
import { TableOfContents } from "@/components/learn/table-of-contents";
import { ArticleFeedback } from "@/components/learn/article-feedback";
import { ArticleCard } from "@/components/learn/article-card";
import { PublicFooter } from "@/components/layout/public-footer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  if (!article) return { title: "Not Found — Printforge Learning Centre" };

  return {
    title: `${article.title} — Printforge Learning Centre`,
    description: article.excerpt,
    alternates: {
      canonical: `https://crm.printforge.com.au/learn/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      tags: article.tags,
      url: `https://crm.printforge.com.au/learn/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
  };
}

export function generateStaticParams() {
  return LEARN_ARTICLES.map((a) => ({ slug: a.slug }));
}

const TIER_BADGE: Record<string, { text: string; className: string }> = {
  starter: { text: "Starter", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  pro: { text: "Pro", className: "bg-primary/10 text-primary" },
  scale: { text: "Scale", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

export default async function LearnArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  if (!article) notFound();

  const category = getLearnCategory(article.category);
  const contentWithIds = addHeadingIds(article.content);
  const headings = extractHeadings(article.content);

  // Related articles: explicit first, then same-category, then popular
  const relatedSlugs = new Set(article.relatedSlugs);
  const related = article.relatedSlugs
    .map((s) => getLearnArticle(s))
    .filter((a): a is NonNullable<typeof a> => a != null && a.slug !== slug)
    .slice(0, 3);

  if (related.length < 3) {
    const more = LEARN_ARTICLES.filter(
      (a) =>
        a.slug !== slug &&
        !relatedSlugs.has(a.slug) &&
        a.category === article.category
    ).slice(0, 3 - related.length);
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

      {/* Breadcrumbs */}
      <div className="mx-auto max-w-6xl px-6 pt-[calc(57px+1.5rem)] md:pt-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/learn" className="hover:text-foreground transition-colors">
            Learning Centre
          </Link>
          <ChevronRight className="h-3 w-3" />
          {category && (
            <>
              <Link
                href={`/learn?category=${article.category}`}
                className="hover:text-foreground transition-colors"
              >
                {category.label}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="truncate text-foreground font-medium">{article.title}</span>
        </nav>
      </div>

      {/* Main content: article + TOC sidebar */}
      <div className="mx-auto max-w-6xl px-6 py-8 lg:flex lg:gap-10">
        {/* Article */}
        <article className="min-w-0 flex-1 lg:max-w-3xl">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {category.label}
              </span>
            )}
            <DifficultyBadge difficulty={article.difficulty} />
            {article.tier && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_BADGE[article.tier]?.className ?? ""}`}
              >
                {TIER_BADGE[article.tier]?.text} plan
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {article.readingTime} min read
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>

          {/* Tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Content */}
          <div
            className="prose prose-neutral dark:prose-invert mt-10 max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-24 prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: contentWithIds }}
          />

          {/* Feedback */}
          <div className="mt-12">
            <ArticleFeedback slug={slug} />
          </div>
        </article>

        {/* TOC sidebar */}
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <TableOfContents headings={headings} />
        </aside>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t border-border/50">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="text-lg font-bold">Related articles</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Try Printforge for free</h2>
          <p className="mt-3 text-sm text-muted-foreground">
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
      </section>

      <PublicFooter />

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://crm.printforge.com.au",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Learning Centre",
                item: "https://crm.printforge.com.au/learn",
              },
              ...(category
                ? [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: category.label,
                      item: `https://crm.printforge.com.au/learn?category=${article.category}`,
                    },
                    {
                      "@type": "ListItem",
                      position: 4,
                      name: article.title,
                      item: `https://crm.printforge.com.au/learn/${slug}`,
                    },
                  ]
                : [
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: article.title,
                      item: `https://crm.printforge.com.au/learn/${slug}`,
                    },
                  ]),
            ],
          }),
        }}
      />

      {/* TechArticle JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            headline: article.title,
            description: article.excerpt,
            proficiencyLevel: article.difficulty === "beginner" ? "Beginner" : article.difficulty === "intermediate" ? "Expert" : "Expert",
            author: {
              "@type": "Organization",
              name: "Printforge",
              url: "https://crm.printforge.com.au",
            },
            publisher: {
              "@type": "Organization",
              name: "Printforge",
              logo: {
                "@type": "ImageObject",
                url: "https://crm.printforge.com.au/icon.svg",
              },
            },
            datePublished: article.publishedAt,
            dateModified: article.updatedAt || article.publishedAt,
            mainEntityOfPage: `https://crm.printforge.com.au/learn/${slug}`,
            keywords: article.tags.join(", "),
            image: `https://crm.printforge.com.au/learn/${slug}/opengraph-image`,
          }),
        }}
      />
    </div>
  );
}
