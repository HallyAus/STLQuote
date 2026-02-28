import { ImageResponse } from "next/og";
import { getBlogPost } from "@/lib/blog-posts";

export const runtime = "edge";
export const alt = "Printforge Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

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
        {/* Category + Read time */}
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
            {post?.category || "Blog"}
          </span>
          <span style={{ color: "#9ca3af", fontSize: "18px" }}>
            {post?.readingTime || 5} min read
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
          {post?.title || "Printforge Blog"}
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
            Printforge Blog
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
