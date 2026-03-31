drop policy if exists matches_update_admin_only on public.matches;
create policy matches_update_admin_only
on public.matches
for update
to authenticated
using (
  exists (
    select 1
    from public.groups g
    where g.admin_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.groups g
    where g.admin_id = auth.uid()
  )
);
