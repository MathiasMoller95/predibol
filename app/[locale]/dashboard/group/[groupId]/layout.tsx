import GroupBottomNav from "@/components/GroupBottomNav";
import { createClient } from "@/lib/supabase/server";
import { resolveGroupTheme } from "@/lib/group-theme";
import { hexToRgbSpaceSeparated } from "@/lib/hex-rgb";

type Props = {
  children: React.ReactNode;
  params: { locale: string; groupId: string };
};

export default async function GroupSectionLayout({ children, params }: Props) {
  const { locale, groupId } = params;
  const supabase = await createClient();
  const { data: group } = await supabase
    .from("groups")
    .select("colors, primary_color, secondary_color")
    .eq("id", groupId)
    .maybeSingle();

  const theme = resolveGroupTheme({
    colors: group?.colors ?? null,
    primary_color: group?.primary_color ?? null,
    secondary_color: group?.secondary_color ?? null,
  });

  const shellStyle = {
    "--gpri-rgb": hexToRgbSpaceSeparated(theme.primary),
    "--gsec-rgb": hexToRgbSpaceSeparated(theme.secondary),
    "--group-primary": theme.primary,
    "--group-secondary": theme.secondary,
    "--group-bg-tint": theme.backgroundTint,
  } as React.CSSProperties;

  return (
    <div data-group-shell style={shellStyle} className="min-h-0">
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</div>
      <GroupBottomNav locale={locale} groupId={groupId} />
    </div>
  );
}
