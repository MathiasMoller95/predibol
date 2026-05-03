-- RUN THIS IN SUPABASE SQL EDITOR
-- Schedules sync-matches Edge Function via pg_cron + pg_net + Vault secrets.
--
-- One-time setup (Supabase Dashboard > SQL or Vault):
--   select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/sync-matches', 'sync_matches_fn_url');
--   select vault.create_secret('<SERVICE_ROLE_JWT>', 'sync_matches_fn_service_role_key');
--
-- If the job already exists and you need to re-schedule:
--   select cron.unschedule(jobid) from cron.job where jobname = 'sync-matches';

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_sync_matches_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  fn_key text;
  request_id bigint;
begin
  select ds.decrypted_secret into fn_url
  from vault.decrypted_secrets ds
  where ds.name = 'sync_matches_fn_url'
  limit 1;

  select ds.decrypted_secret into fn_key
  from vault.decrypted_secrets ds
  where ds.name = 'sync_matches_fn_service_role_key'
  limit 1;

  if fn_url is null or fn_key is null then
    raise warning 'sync-matches cron: set vault secrets sync_matches_fn_url and sync_matches_fn_service_role_key';
    return;
  end if;

  select net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || fn_key
    ),
    body := '{}'::jsonb
  ) into request_id;
end;
$$;

select cron.schedule(
  'sync-matches',
  '* * * * *',
  $$select public.invoke_sync_matches_cron()$$
);

