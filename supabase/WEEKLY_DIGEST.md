# Weekly digest email (`send-weekly-digest`)

Sends one HTML email per subscribed user with a section per group (overall ranking + last completed UTC week points).

## Secrets (Supabase Dashboard → Edge Functions → Secrets, or CLI)

| Secret | Required | Notes |
|--------|----------|--------|
| `SUPABASE_URL` | Yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role |
| `RESEND_API_KEY` | Yes | Same as prediction reminders |
| `SITE_URL` | Yes | e.g. `https://predibol.com` (links in email) |
| `DIGEST_CRON_SECRET` | Yes | Long random string; cron sends this on each request |
| `FROM_EMAIL` | No | Default: `Predibol <noreply@predibol.com>` (must match Resend domain) |
| `DIGEST_DISABLED` | No | Set to `1` or `true` to skip sending (dry run / kill switch) |

## Invoke (scheduled job)

`POST` the function URL with either:

- Header `Authorization: Bearer <DIGEST_CRON_SECRET>`, or  
- Header `x-cron-secret: <DIGEST_CRON_SECRET>`

Example:

```bash
curl -X POST "$SUPABASE_FUNCTIONS_URL/send-weekly-digest" \
  -H "Authorization: Bearer $DIGEST_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Schedule **weekly** (e.g. Monday 08:00 UTC) with Supabase `pg_cron` + `pg_net`, GitHub Actions, or any external cron.

## User opt-out

Users toggle **Resumen semanal por correo** in Profile (`profiles.email_weekly_recap`).

## Week definition

Digest covers the **previous full UTC week** (Monday 00:00:00 through Sunday 23:59:59.999). Match points use `matches.match_time` for finished matches in that window.
