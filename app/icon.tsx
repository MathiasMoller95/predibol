import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E14",
          borderRadius: "6px",
          fontFamily: "sans-serif",
        }}
      >
        <span style={{ color: "#10B981", fontWeight: 800 }}>P</span>
        <span style={{ color: "#FFFFFF", fontWeight: 800 }}>b</span>
      </div>
    ),
    { ...size },
  );
}
