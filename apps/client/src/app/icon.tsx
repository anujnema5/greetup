import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #e8e4a8 0%, #c9c47a 100%)",
          color: "#141410",
          fontSize: "20px",
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        G
      </div>
    ),
    { ...size },
  );
}
