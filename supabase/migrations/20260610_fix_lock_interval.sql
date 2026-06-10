-- Update trigger to lock 30 minutes before kickoff (was 24 hours)
create or replace function public.set_match_locked_at()
returns trigger
language plpgsql
as $$
begin
  new.locked_at = new.match_time - interval '30 minutes';
  return new;
end;
$$;

-- Backfill all future scheduled matches that haven't locked yet
update public.matches
set locked_at = match_time - interval '30 minutes'
where status = 'scheduled'
  and locked_at > now();
