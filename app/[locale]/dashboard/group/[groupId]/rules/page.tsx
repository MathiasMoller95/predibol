import { setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RulesContent from "./rules-content";

type Props = {
  params: { locale: string; groupId: string };
};

type GroupRow = {
  name: string;
  admin_id: string;
  points_correct_result: number;
  points_correct_difference: number;
  points_exact_score: number;
};

export default async function GroupRulesPage({ params }: Props) {
  const { locale, groupId } = params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/dashboard/group/${groupId}/rules`)}`
    );
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("name,admin_id,points_correct_result,points_correct_difference,points_exact_score")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const typed = group as GroupRow;
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership && typed.admin_id !== user.id) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <RulesContent
      locale={locale}
      groupId={groupId}
      groupName={typed.name}
      pointsResult={typed.points_correct_result}
      pointsDiff={typed.points_correct_difference}
      pointsExact={typed.points_exact_score}
    />
  );
}
