-- Trigger: when a match is marked finished, notify the score-match Edge Function via pg_net.
--
-- One-time setup (Supabase Dashboard > SQL or Vault):
--   select vault.create_secret('<SERVICE_ROLE_JWT>', 'score_match_service_role_key');
--   select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/score-match', 'score_match_url');
--
-- Local smoke test (without trigger):
--   supabase functions serve score-match
--   curl -i POST http://127.0.0.1:54321/functions/v1/score-match \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--     -H "Content-Type: application/json" \
--     -d '{"match_id":"<uuid>"}'
--
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_score_match_on_match_finished()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id bigint;
  fn_url text;
  fn_key text;
begin
  if new.home_score is null or new.away_score is null then
    return new;
  end if;

  select ds.decrypted_secret into fn_url
  from vault.decrypted_secrets ds
  where ds.name = 'score_match_url'
  limit 1;

  select ds.decrypted_secret into fn_key
  from vault.decrypted_secrets ds
  where ds.name = 'score_match_service_role_key'
  limit 1;

  if fn_url is null or fn_key is null then
    raise warning 'score_match trigger: set vault secrets score_match_url and score_match_service_role_key (see migration header comments)';
    return new;
  end if;

  select net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || fn_key
    ),
    body := jsonb_build_object('match_id', new.id::text)
  ) into request_id;

  return new;
end;
$$;

drop trigger if exists trg_matches_finished_score on public.matches;
create trigger trg_matches_finished_score
after update of status, home_score, away_score on public.matches
for each row
when (
  new.status = 'finished'
  and old.status is distinct from 'finished'
  and new.home_score is not null
  and new.away_score is not null
)
execute procedure public.notify_score_match_on_match_finished();
