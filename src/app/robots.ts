import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/"],
        disallow: [
          "/dashboard",
          "/calculator",
          "/printers",
          "/materials",
          "/quotes",
          "/clients",
          "/jobs",
          "/settings",
          "/admin",
          "/api/",
          "/portal",
          "/upload",
          "/verify-2fa",
          "/change-password",
          "/forgot-password",
          "/reset-password",
          "/invoices",
          "/suppliers",
          "/consumables",
          "/purchase-orders",
          "/quote-requests",
          "/designs",
        ],
      },
    ],
    sitemap: "https://crm.printforge.com.au/sitemap.xml",
  };
}
