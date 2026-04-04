/**
 * Prediction reminder emails (~48h before locked_at) via Resend.
 * TODO(future): pick email locale from profiles or user metadata instead of Spanish-only body.
 *
 * "from" must use a domain/sender verified in Resend (e.g. noreply@predibol.com).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  match_time: string;
  locked_at: string;
};

type MemberRow = {
  group_id: string;
  user_id: string;
};

type PredRow = {
  user_id: string;
  group_id: string;
};

function getBearer(req: Request): string | null {
  const h = req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim();
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://predibol.vercel.app";

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const bearer = getBearer(req);
  if (!bearer) {
    return new Response(JSON.stringify({ error: "Missing Authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseService = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (bearer !== serviceKey) {
    if (!anonKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing SUPABASE_ANON_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const { data: adminRow, error: adminErr } = await supabaseService
      .from("groups")
      .select("id")
      .eq("admin_id", user.id)
      .limit(1)
      .maybeSingle();
    if (adminErr || !adminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  try {
    await req.json().catch(() => ({}));

    const now = new Date();
    const minLock = new Date(now.getTime() + 47 * 60 * 60 * 1000);
    const maxLock = new Date(now.getTime() + 49 * 60 * 60 * 1000);

    const { data: upcomingMatches, error: matchError } = await supabaseService
      .from("matches")
      .select("id, home_team, away_team, match_time, locked_at")
      .eq("status", "scheduled")
      .not("locked_at", "is", null)
      .gte("locked_at", minLock.toISOString())
      .lte("locked_at", maxLock.toISOString());

    if (matchError) throw matchError;

    const matches = (upcomingMatches ?? []) as MatchRow[];
    if (matches.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No matches locking in ~48h",
          matchesProcessed: 0,
          emailsSent: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { data: allMembers, error: membersError } = await supabaseService
      .from("group_members")
      .select("group_id, user_id");

    if (membersError) throw membersError;
    const members = (allMembers ?? []) as MemberRow[];
    if (members.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No group members",
          matchesProcessed: matches.length,
          emailsSent: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    let totalEmailsSent = 0;

    for (const match of matches) {
      const { data: existingPredictions, error: predError } = await supabaseService
        .from("predictions")
        .select("user_id, group_id")
        .eq("match_id", match.id);

      if (predError) throw predError;

      const predictedSet = new Set(
        (existingPredictions as PredRow[] | null)?.map((p) => `${p.user_id}-${p.group_id}`) ?? [],
      );

      const needsReminder = members.filter((m) => !predictedSet.has(`${m.user_id}-${m.group_id}`));
      const uniqueUserIds = [...new Set(needsReminder.map((m) => m.user_id))];

      for (const userId of uniqueUserIds) {
        const { data: userData } = await supabaseService.auth.admin.getUserById(userId);
        if (!userData?.user?.email) continue;

        const email = userData.user.email;

        const { data: profile } = await supabaseService
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();

        const displayName =
          (profile?.display_name as string | undefined)?.trim() || "Jugador";

        const matchDate = new Date(match.match_time);
        const formattedDate = matchDate.toLocaleDateString("es-ES", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Madrid",
        });

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Predibol <noreply@predibol.com>",
            to: email,
            subject: `⚽ ¡Predice ${match.home_team} vs ${match.away_team}!`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; background: #0A0E14; color: white; padding: 32px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 28px; font-weight: bold;">
                    <span style="color: white;">PREDI</span><span style="color: #10B981;">BOL</span>
                  </span>
                </div>

                <p style="color: #9CA3AF; margin-bottom: 16px;">Hola ${escapeHtml(displayName)},</p>

                <div style="background: #111720; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                  <p style="font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">
                    ${escapeHtml(match.home_team)} vs ${escapeHtml(match.away_team)}
                  </p>
                  <p style="color: #9CA3AF; margin: 0; font-size: 14px;">${escapeHtml(formattedDate)} (hora España)</p>
                </div>

                <p style="color: #9CA3AF; margin-bottom: 20px;">
                  ¡Las predicciones se cierran en menos de 48 horas! No te quedes sin jugar.
                </p>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${escapeHtml(`${siteUrl}/es/dashboard`)}"
                     style="display: inline-block; background: #10B981; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Predice ahora →
                  </a>
                </div>

                <hr style="border: none; border-top: 1px solid #1a2332; margin: 20px 0;" />

                <p style="color: #6B7280; font-size: 12px; text-align: center;">
                  predibol.com — La plataforma de predicciones del Mundial 2026
                </p>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          totalEmailsSent++;
        } else {
          console.error(`Failed to send to ${email}:`, await emailRes.text());
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${totalEmailsSent} reminder email(s)`,
        matchesProcessed: matches.length,
        emailsSent: totalEmailsSent,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error) {
    console.error("Reminder error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
