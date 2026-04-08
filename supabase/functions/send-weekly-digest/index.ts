/**
 * Weekly digest: one email per user (sections per group) via Resend.
 * Invoke from cron with header `Authorization: Bearer <DIGEST_CRON_SECRET>` or `x-cron-secret: <DIGEST_CRON_SECRET>`.
 * Week window: previous UTC calendar week (Mon 00:00:00 — Sun 23:59:59.999).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const AI_PLAYER_ID = "00000000-0000-0000-0000-000000000001";

type MemberRow = { user_id: string; display_name: string };
type LeaderboardDbRow = {
  user_id: string;
  total_points: number;
  correct_results: number;
  exact_scores: number;
  predictions_made: number;
  virtual_pnl: number | null;
  virtual_bets_won: number | null;
  virtual_bets_lost: number | null;
};

type MergedRow = {
  user_id: string;
  rank: number;
  total_points: number;
  display_name: string;
};

function emailPrefix(email: string | undefined): string {
  if (email?.includes("@")) return email.split("@")[0]!;
  return "Jugador";
}

function resolveDisplayName(
  profileName: string | null | undefined,
  memberName: string | null | undefined,
  email: string | null | undefined,
): string {
  const p = profileName?.trim();
  if (p) return p;
  const m = memberName?.trim();
  if (m) return m;
  return emailPrefix(email ?? undefined);
}

function mergeGroupLeaderboardRows(
  members: MemberRow[],
  boardRows: LeaderboardDbRow[],
  resolveName: (userId: string) => string,
): MergedRow[] {
  const byUser = new Map(boardRows.map((r) => [r.user_id, r]));
  const merged: MergedRow[] = members.map((m) => {
    const row = byUser.get(m.user_id);
    return {
      user_id: m.user_id,
      rank: 0,
      total_points: row?.total_points ?? 0,
      display_name: resolveName(m.user_id),
    };
  });
  merged.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" });
  });
  merged.forEach((row, i) => {
    row.rank = i + 1;
  });
  return merged;
}

/** Previous full UTC week (Mon–Sun) relative to `ref`. */
function getPreviousWeekUtcBounds(ref: Date): { start: Date; end: Date } {
  const d = new Date(ref.getTime());
  const day = d.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const mondayThisWeek = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysFromMonday, 0, 0, 0, 0),
  );
  const weekStart = new Date(mondayThisWeek);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekEnd = new Date(mondayThisWeek.getTime() - 1);
  return { start: weekStart, end: weekEnd };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWeekLabelEs(start: Date, end: Date): string {
  const o: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  };
  const a = start.toLocaleDateString("es-ES", o);
  const b = end.toLocaleDateString("es-ES", o);
  return `${a} – ${b} (UTC)`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const cronSecret = Deno.env.get("DIGEST_CRON_SECRET");
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://predibol.com";
  const fromEmail = Deno.env.get("FROM_EMAIL") ?? "Predibol <noreply@predibol.com>";
  const digestDisabled = Deno.env.get("DIGEST_DISABLED") === "1" || Deno.env.get("DIGEST_DISABLED") === "true";

  if (!supabaseUrl || !serviceKey || !resendKey || !cronSecret) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const auth = req.headers.get("Authorization");
  const xCron = req.headers.get("x-cron-secret");
  const bearerOk = auth === `Bearer ${cronSecret}`;
  const headerOk = xCron === cronSecret;
  if (!bearerOk && !headerOk) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (digestDisabled) {
    return new Response(JSON.stringify({ message: "Digest disabled (DIGEST_DISABLED)", emailsSent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const { start: weekStart, end: weekEnd } = getPreviousWeekUtcBounds(now);
  const weekLabel = formatWeekLabelEs(weekStart, weekEnd);

  try {
    await req.json().catch(() => ({}));

    const { data: profileRows, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("email_weekly_recap", true)
      .neq("id", AI_PLAYER_ID);

    if (profErr) throw profErr;
    const eligibleIds = new Set((profileRows ?? []).map((p: { id: string }) => p.id));
    if (eligibleIds.size === 0) {
      return new Response(JSON.stringify({ message: "No subscribers", emailsSent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailByUserId = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage });
      if (listErr) throw listErr;
      const users = listData?.users ?? [];
      for (const u of users) {
        if (u.email && eligibleIds.has(u.id)) {
          emailByUserId.set(u.id, u.email);
        }
      }
      if (users.length < perPage) break;
      page += 1;
    }

    const { data: matchRows } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "finished")
      .gte("match_time", weekStart.toISOString())
      .lte("match_time", weekEnd.toISOString());

    const weekMatchIds = new Set((matchRows ?? []).map((m: { id: string }) => m.id));

    let emailsSent = 0;

    for (const [userId, email] of emailByUserId) {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      const groupIds = [...new Set((memberships ?? []).map((m: { group_id: string }) => m.group_id))];
      if (groupIds.length === 0) continue;

      const { data: profileSelf } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      const selfName = (profileSelf?.display_name as string | undefined)?.trim() || "Jugador";

      const sectionsHtml: string[] = [];

      for (const groupId of groupIds) {
        const { data: group } = await supabase.from("groups").select("id,name").eq("id", groupId).maybeSingle();
        if (!group) continue;
        const groupName = (group as { name: string }).name;

        const [{ data: boardRows }, { data: members }] = await Promise.all([
          supabase
            .from("leaderboard")
            .select(
              "user_id,total_points,correct_results,exact_scores,predictions_made,virtual_pnl,virtual_bets_won,virtual_bets_lost",
            )
            .eq("group_id", groupId),
          supabase.from("group_members").select("user_id,display_name").eq("group_id", groupId),
        ]);

        const memberList = (members ?? []) as MemberRow[];
        const memberByUser = new Map(memberList.map((m) => [m.user_id, m.display_name]));
        const memberIds = memberList.map((m) => m.user_id);
        let profileByUserId = new Map<string, string>();
        if (memberIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id,display_name").in("id", memberIds);
          profileByUserId = new Map(
            ((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
          );
        }

        const resolveName = (uid: string) =>
          resolveDisplayName(
            profileByUserId.get(uid),
            memberByUser.get(uid),
            uid === userId ? email : undefined,
          );

        const overall = mergeGroupLeaderboardRows(
          memberList,
          (boardRows ?? []) as LeaderboardDbRow[],
          resolveName,
        );

        let weekPointsByUser = new Map<string, number>();
        const groupWeekMatchIds = new Set<string>();
        if (weekMatchIds.size > 0) {
          const ids = [...weekMatchIds];
          const { data: preds } = await supabase
            .from("predictions")
            .select("user_id,points_earned,match_id")
            .eq("group_id", groupId)
            .in("match_id", ids);

          for (const row of preds ?? []) {
            const p = row as { user_id: string; points_earned: number; match_id: string };
            groupWeekMatchIds.add(p.match_id);
            weekPointsByUser.set(p.user_id, (weekPointsByUser.get(p.user_id) ?? 0) + (p.points_earned ?? 0));
          }
        }

        const weekRowsRaw = memberList.map((m) => ({
          user_id: m.user_id,
          week_points: weekPointsByUser.get(m.user_id) ?? 0,
          display_name: resolveName(m.user_id),
        }));
        weekRowsRaw.sort((a, b) => {
          if (b.week_points !== a.week_points) return b.week_points - a.week_points;
          return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: "base" });
        });
        const weekRows = weekRowsRaw.map((r, i) => ({ ...r, rank: i + 1 }));

        const finishedInWeek = groupWeekMatchIds.size;
        let topWeekName = "—";
        let topWeekPts = 0;
        for (const r of weekRows) {
          if (r.week_points > topWeekPts) {
            topWeekPts = r.week_points;
            topWeekName = r.display_name;
          }
        }

        const overallSlice = overall.slice(0, 12);
        const weekSlice = weekRows.slice(0, 12);

        const overallTable = overallSlice
          .map(
            (r) =>
              `<tr><td style="padding:6px 8px;border-bottom:1px solid #1a2332;">${r.rank}</td><td style="padding:6px 8px;border-bottom:1px solid #1a2332;">${escapeHtml(r.display_name)}</td><td style="padding:6px 8px;border-bottom:1px solid #1a2332;text-align:right;">${r.total_points}</td></tr>`,
          )
          .join("");
        const weekTable = weekSlice
          .map(
            (r) =>
              `<tr><td style="padding:6px 8px;border-bottom:1px solid #1a2332;">${r.rank}</td><td style="padding:6px 8px;border-bottom:1px solid #1a2332;">${escapeHtml(r.display_name)}</td><td style="padding:6px 8px;border-bottom:1px solid #1a2332;text-align:right;">${r.week_points}</td></tr>`,
          )
          .join("");

        sectionsHtml.push(`
          <div style="margin-bottom:28px;">
            <h2 style="color:#10B981;font-size:18px;margin:0 0 8px 0;">Esta semana en ${escapeHtml(groupName)}</h2>
            <p style="color:#9CA3AF;font-size:13px;margin:0 0 12px 0;">
              Clasificación general · Partidos terminados en la semana (UTC): ${finishedInWeek}
              ${topWeekPts > 0 ? ` · Más puntos en la semana: ${escapeHtml(topWeekName)} (${topWeekPts} pts)` : ""}
            </p>
            <p style="color:#E5E7EB;font-size:14px;margin:12px 0 6px 0;font-weight:600;">Ranking general</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#E5E7EB;">
              <thead><tr><th align="left" style="padding:6px 8px;color:#9CA3AF;">#</th><th align="left" style="padding:6px 8px;color:#9CA3AF;">Jugador</th><th align="right" style="padding:6px 8px;color:#9CA3AF;">Pts</th></tr></thead>
              <tbody>${overallTable}</tbody>
            </table>
            ${overall.length > 12 ? `<p style="color:#6B7280;font-size:12px;margin:8px 0 0 0;">Mostrando 12 de ${overall.length} jugadores.</p>` : ""}
            <p style="color:#E5E7EB;font-size:14px;margin:16px 0 6px 0;font-weight:600;">Puntos de la semana anterior (${weekLabel})</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#E5E7EB;">
              <thead><tr><th align="left" style="padding:6px 8px;color:#9CA3AF;">#</th><th align="left" style="padding:6px 8px;color:#9CA3AF;">Jugador</th><th align="right" style="padding:6px 8px;color:#9CA3AF;">Pts sem.</th></tr></thead>
              <tbody>${weekTable}</tbody>
            </table>
            ${weekRows.length > 12 ? `<p style="color:#6B7280;font-size:12px;margin:8px 0 0 0;">Mostrando 12 de ${weekRows.length} jugadores.</p>` : ""}
            <p style="margin:12px 0 0 0;"><a href="${escapeHtml(`${siteUrl}/es/dashboard/group/${groupId}/leaderboard`)}" style="color:#10B981;">Ver clasificación completa →</a></p>
          </div>
        `);
      }

      if (sectionsHtml.length === 0) continue;

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0A0E14;color:#fff;padding:28px;border-radius:12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="font-size:24px;font-weight:bold;"><span style="color:#fff;">PREDI</span><span style="color:#10B981;">BOL</span></span>
          </div>
          <p style="color:#9CA3AF;margin-bottom:16px;">Hola ${escapeHtml(selfName)},</p>
          <p style="color:#E5E7EB;margin-bottom:20px;font-size:15px;">Tu resumen semanal (${weekLabel}).</p>
          ${sectionsHtml.join("")}
          <hr style="border:none;border-top:1px solid #1a2332;margin:24px 0;" />
          <p style="color:#6B7280;font-size:12px;text-align:center;">Puedes desactivar estos correos en tu perfil en predibol.com.</p>
        </div>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `Tu semana en Predibol — ${weekLabel}`,
          html,
        }),
      });

      if (emailRes.ok) {
        emailsSent++;
      } else {
        console.error("Resend error:", email, await emailRes.text());
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${emailsSent} digest email(s)`,
        emailsSent,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error) {
    console.error("Digest error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
