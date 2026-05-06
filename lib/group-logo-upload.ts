import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const GROUP_LOGOS_BUCKET = "group-logos" as const;

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

export type AllowedLogoMime = (typeof ALLOWED_LOGO_MIME_TYPES)[number];

/** Sniff PNG / JPEG / WebP / SVG from bytes (for URL downloads where Content-Type is wrong). */
export function detectImageMimeFromBytes(buf: Uint8Array): AllowedLogoMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    const tag = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (tag === "WEBP") return "image/webp";
  }
  const head = new TextDecoder("utf-8", { fatal: false }).decode(buf.subarray(0, Math.min(512, buf.length))).trimStart();
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.includes("<svg")) return "image/svg+xml";
  return null;
}

export function extFromMime(m: string): string {
  if (m === "image/png") return "png";
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/webp") return "webp";
  if (m === "image/svg+xml") return "svg";
  return "png";
}

export type LogoValidationResult =
  | { ok: true }
  | { ok: false; reason: "size" | "type" };

export function validateLogoFile(file: File): LogoValidationResult {
  if (file.size > LOGO_MAX_BYTES) return { ok: false, reason: "size" };
  if (!ALLOWED_LOGO_MIME_TYPES.includes(file.type as AllowedLogoMime)) {
    return { ok: false, reason: "type" };
  }
  return { ok: true };
}

export async function uploadGroupLogo(
  supabase: SupabaseClient<Database>,
  groupId: string,
  body: File | Blob,
  contentType: string
): Promise<{ error: Error | null; publicUrl?: string }> {
  const ext = extFromMime(contentType);
  const path = `${groupId}/logo.${ext}`;
  const { error: upErr } = await supabase.storage.from(GROUP_LOGOS_BUCKET).upload(path, body, {
    upsert: true,
    contentType,
  });
  if (upErr) return { error: upErr };
  const { data: pub } = supabase.storage.from(GROUP_LOGOS_BUCKET).getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  const { error: dbErr } = await supabase.from("groups").update({ logo_url: publicUrl }).eq("id", groupId);
  if (dbErr) return { error: new Error(dbErr.message) };
  return { error: null, publicUrl };
}

export const PENDING_GROUP_LOGO_STORAGE_KEY = "pending_group_logo";

export type PendingGroupLogoPayload = {
  groupId: string;
  dataUrl: string;
};

export function parsePendingGroupLogoPayload(raw: string | null): PendingGroupLogoPayload | null {
  if (!raw?.trim()) return null;
  try {
    const p = JSON.parse(raw) as unknown;
    if (
      typeof p !== "object" ||
      p === null ||
      typeof (p as PendingGroupLogoPayload).groupId !== "string" ||
      typeof (p as PendingGroupLogoPayload).dataUrl !== "string"
    ) {
      return null;
    }
    return p as PendingGroupLogoPayload;
  } catch {
    return null;
  }
}

export function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } | null {
  // Avoid /s (dotAll) flag so we don't require ES2018 target.
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUrl.trim());
  if (!m) return null;
  const contentType = m[1];
  const b64 = m[2].replace(/\s/g, "");
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: contentType }), contentType };
  } catch {
    return null;
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === "string") resolve(r.result);
      else reject(new Error("readAsDataURL did not return string"));
    };
    r.onerror = () => reject(r.error ?? new Error("FileReader error"));
    r.readAsDataURL(file);
  });
}
