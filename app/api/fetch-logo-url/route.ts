import { NextResponse } from "next/server";
import { LOGO_MAX_BYTES, detectImageMimeFromBytes } from "@/lib/group-logo-upload";

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "127.0.0.1" || h === "0.0.0.0" || h === "::1") return true;
  if (h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "metadata.google.internal" || h.includes("metadata.google")) return true;

  const parts = h.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const urlRaw =
    typeof body === "object" && body !== null && "url" in body ? String((body as { url: unknown }).url ?? "").trim() : "";
  if (!urlRaw) return NextResponse.json({ error: "missing_url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "invalid_scheme" }, { status: 400 });
  }

  if (isBlockedHostname(parsed.hostname)) {
    return NextResponse.json({ error: "blocked_host" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.href, {
      redirect: "follow",
      headers: {
        Accept: "image/png,image/jpeg,image/webp,image/svg+xml,*/*;q=0.8",
        "User-Agent": "PredibolLogoFetcher/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "fetch_failed", status: res.status }, { status: 502 });
    }

    const lenHeader = res.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > LOGO_MAX_BYTES) {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }

    const ab = await res.arrayBuffer();
    if (ab.byteLength > LOGO_MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

    const u8 = new Uint8Array(ab);
    const contentType = detectImageMimeFromBytes(u8);
    if (!contentType) return NextResponse.json({ error: "not_image" }, { status: 400 });

    const base64 = Buffer.from(ab).toString("base64");
    return NextResponse.json({ contentType, base64 });
  } catch {
    return NextResponse.json({ error: "fetch_error" }, { status: 502 });
  }
}
