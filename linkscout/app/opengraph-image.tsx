import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LinkScout — AI-Powered Tech Job Search";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-30%",
            left: "-15%",
            width: "70%",
            height: "70%",
            borderRadius: "50%",
            background: "rgba(37, 99, 235, 0.15)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.12)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "white",
            }}
          >
            L
          </div>
          <span
            style={{
              fontSize: "48px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#e2e8f0",
            }}
          >
            LinkScout
          </span>
        </div>
        <div
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
          }}
        >
          AI-Powered Tech Job Search
        </div>
        <div
          style={{
            marginTop: "8px",
            fontSize: "20px",
            fontWeight: 400,
            color: "#64748b",
            textAlign: "center",
            maxWidth: "600px",
          }}
        >
          Smart matching &bull; Real-time alerts &bull; CV analysis
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
