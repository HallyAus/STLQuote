import { ImageResponse } from "next/og";
import { getLearnArticle, getLearnCategory } from "@/lib/learn-articles";

export const runtime = "edge";
export const alt = "Printforge Learning Centre";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DIFFICULTY_COLOUR: Record<string, string> = {
  beginner: "#10b981",
  intermediate: "#f59e0b",
  advanced: "#ef4444",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  const category = article ? getLearnCategory(article.category) : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Category + Difficulty + Read time */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span
            style={{
              background: "#2563eb",
              color: "white",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            {category?.label || "Learning Centre"}
          </span>
          {article && (
            <span
              style={{
                background: DIFFICULTY_COLOUR[article.difficulty] || "#6b7280",
                color: "white",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "16px",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {article.difficulty}
            </span>
          )}
          <span style={{ color: "#9ca3af", fontSize: "18px" }}>
            {article?.readingTime || 5} min read
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            marginTop: "32px",
            fontSize: "48px",
            fontWeight: 800,
            color: "white",
            lineHeight: 1.2,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {article?.title || "Printforge Learning Centre"}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 700,
              color: "white",
            }}
          >
            P
          </div>
          <span style={{ color: "#9ca3af", fontSize: "20px" }}>
            Printforge Learning Centre
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
