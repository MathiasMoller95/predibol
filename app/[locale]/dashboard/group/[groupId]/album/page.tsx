import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AI_PLAYER_ID } from "@/lib/constants";
import AlbumView from "./album-view";

type Props = { params: { locale: string; groupId: string } };

type StickerRow = {
  team: string;
  tier: string;
  earned_from_match_id: string | null;
};

type MatchLabel = {
  id: string;
  home_team: string;
  away_team: string;
};

export default async function AlbumPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: group } = await supabase
    .from("groups")
    .select("id,name,admin_id")
    .eq("id", groupId)
    .single();
  if (!group) notFound();
  const typedGroup = group as { id: string; name: string; admin_id: string };

  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership && typedGroup.admin_id !== user.id) redirect(`/${locale}/dashboard`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: stickers } = await db
    .from("sticker_album")
    .select("team,tier,earned_from_match_id")
    .eq("user_id", user.id)
    .eq("group_id", groupId);

  const stickerList = (stickers ?? []) as StickerRow[];

  const matchIds = Array.from(
    new Set(stickerList.map((s) => s.earned_from_match_id).filter(Boolean)),
  ) as string[];

  let matchLabels: MatchLabel[] = [];
  if (matchIds.length > 0) {
    const { data: ml } = await supabase
      .from("matches")
      .select("id,home_team,away_team")
      .in("id", matchIds);
    matchLabels = (ml ?? []) as MatchLabel[];
  }

  const { data: membersData } = await supabase
    .from("group_members")
    .select("user_id,display_name")
    .eq("group_id", groupId);
  const groupMembers = ((membersData ?? []) as { user_id: string; display_name: string }[])
    .filter((m) => m.user_id !== AI_PLAYER_ID && m.user_id !== user.id)
    .map((m) => ({ userId: m.user_id, displayName: m.display_name }));

  return (
    <AlbumView
      locale={locale}
      groupId={groupId}
      groupName={typedGroup.name}
      stickers={stickerList.map((s) => ({
        team: s.team,
        tier: s.tier as "bronze" | "silver" | "gold",
        matchId: s.earned_from_match_id,
      }))}
      matchLabels={matchLabels}
      groupMembers={groupMembers}
    />
  );
}
