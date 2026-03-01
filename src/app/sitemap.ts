import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { LEARN_ARTICLES } from "@/lib/learn-articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://crm.printforge.com.au";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date("2026-02-28"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date("2026-02-28"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date("2026-02-28"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date("2026-02-28"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-02-26"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-02-26"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const learnPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/learn`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...LEARN_ARTICLES.map((article) => ({
      url: `${baseUrl}/learn/${article.slug}`,
      lastModified: new Date(article.updatedAt || article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];

  return [...staticPages, ...blogPages, ...learnPages];
}
