import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export function emailPrefix(email: string | null | undefined): string {
  if (email && email.includes("@")) {
    return email.split("@")[0]!;
  }
  return "Player";
}

/** Prefer global profile name, then per-group stored name, then email prefix. */
export function resolveDisplayName(
  profileDisplayName: string | null | undefined,
  memberDisplayName: string | null | undefined,
  email: string | null | undefined
): string {
  const fromProfile = profileDisplayName?.trim();
  if (fromProfile) return fromProfile;
  const fromMember = memberDisplayName?.trim();
  if (fromMember) return fromMember;
  return emailPrefix(email);
}

export async function syncGroupMembersDisplayName(
  supabase: SupabaseClient<Database>,
  userId: string,
  displayName: string
) {
  return supabase.from("group_members").update({ display_name: displayName }).eq("user_id", userId);
}

/** For group_members insert: prefer global profile name, else email prefix. */
export async function getDisplayNameForMemberInsert(
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string | undefined
): Promise<string> {
  const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  const trimmed = data?.display_name?.trim();
  if (trimmed) return trimmed;
  return emailPrefix(email);
}
