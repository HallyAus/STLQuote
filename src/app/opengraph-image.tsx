import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Printforge — Free 3D Print Cost Calculator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "12px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 700,
              color: "white",
            }}
          >
            P
          </div>
          <span style={{ fontSize: "48px", fontWeight: 700, color: "white" }}>
            Printforge
          </span>
        </div>
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            lineHeight: 1.1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>Free 3D Print</span>
          <span style={{ color: "#2563eb" }}>Cost Calculator</span>
        </div>
        <p
          style={{
            fontSize: "24px",
            color: "#9ca3af",
            textAlign: "center",
            marginTop: "24px",
            maxWidth: "700px",
          }}
        >
          Calculate costs, generate quotes, track jobs, and invoice clients
        </p>
        <div
          style={{
            marginTop: "40px",
            padding: "12px 32px",
            borderRadius: "12px",
            background: "#2563eb",
            color: "white",
            fontSize: "20px",
            fontWeight: 600,
            display: "flex",
          }}
        >
          Try Free — No Credit Card Required
        </div>
      </div>
    ),
    { ...size },
  );
}
