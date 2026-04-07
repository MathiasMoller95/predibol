import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0E14",
          fontFamily: "sans-serif",
          padding: 80,
        }}
      >
        {/* Pb mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            backgroundColor: "#111720",
            fontSize: 42,
            fontWeight: 800,
            marginBottom: 18,
          }}
        >
          <span style={{ color: "#10B981" }}>P</span>
          <span style={{ color: "#FFFFFF" }}>b</span>
        </div>

        <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -1 }}>
          <span style={{ color: "#10B981" }}>Predi</span>
          <span style={{ color: "#FFFFFF" }}>bol</span>
        </div>

        <div style={{ color: "#9CA3AF", fontSize: 34, marginTop: 22, textAlign: "center", lineHeight: 1.25 }}>
          Predice el Mundial 2026 con tus amigos
        </div>

        <div style={{ color: "#6B7280", fontSize: 26, marginTop: 28, textAlign: "center" }}>
          ⚡ Superpoderes · 🎴 Álbum · 🤖 IA rival
        </div>

        <div style={{ color: "#10B981", fontSize: 22, marginTop: 42, fontWeight: 700 }}>
          predibol.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

