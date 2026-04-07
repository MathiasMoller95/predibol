import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E14",
          borderRadius: "32px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ color: "#10B981", fontWeight: 800, fontSize: 90 }}>P</span>
          <span style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 90 }}>b</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
