import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "72px",
          background: "linear-gradient(145deg, #0A0A0A 0%, #141410 45%, #0A0A0A 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #e8e4a8 0%, #c9c47a 100%)",
              color: "#141410",
              fontSize: "36px",
              fontWeight: 800,
            }}
          >
            G
          </div>
          <span style={{ fontSize: "48px", fontWeight: 700, letterSpacing: "-0.03em" }}>
            {siteConfig.name}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "56px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            {siteConfig.tagline}
          </p>
          <p style={{ margin: 0, fontSize: "28px", lineHeight: 1.4, color: "rgba(255,255,255,0.72)" }}>
            {siteConfig.description}
          </p>
        </div>

        <p style={{ margin: 0, fontSize: "24px", color: "rgba(232,228,168,0.9)" }}>
          greetup.co
        </p>
      </div>
    ),
    { ...size },
  );
}
