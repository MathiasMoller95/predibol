import { ImageResponse } from "next/og";
import { createAnonClient } from "@/lib/supabase/anon";

export const runtime = "edge";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  const supabase = createAnonClient();
  const { data: rows } = await supabase.rpc("get_group_public_by_slug", { _slug: slug });
  const row = rows?.[0];
  const groupName = (row?.name ?? "Predibol").trim() || "Predibol";
  const logoUrl = (row?.logo_url ?? "").trim() || null;

  let logoDataUrl: string | null = null;
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const ct = res.headers.get("content-type") ?? "image/png";
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]!);
        }
        const b64 = btoa(binary);
        logoDataUrl = `data:${ct};base64,${b64}`;
      }
    } catch {
      logoDataUrl = null;
    }
  }

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
          padding: 72,
        }}
      >
        {logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- @vercel/og ImageResponse requires native img
          <img
            src={logoDataUrl}
            alt=""
            width={140}
            height={140}
            style={{
              borderRadius: 28,
              objectFit: "cover",
              marginBottom: 28,
              border: "3px solid rgba(16,185,129,0.35)",
            }}
          />
        ) : (
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
        )}

        <div
          style={{
            display: "flex",
            fontSize: logoDataUrl ? 56 : 84,
            fontWeight: 800,
            letterSpacing: -1,
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: "100%",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>{groupName}</span>
        </div>

        <div style={{ color: "#9CA3AF", fontSize: 30, marginTop: 22, textAlign: "center", lineHeight: 1.25 }}>
          Predibol · Mundial 2026
        </div>

        <div style={{ color: "#10B981", fontSize: 22, marginTop: 36, fontWeight: 700 }}>
          predibol.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
