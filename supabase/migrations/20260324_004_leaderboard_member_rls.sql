-- Allow all members of a group to read leaderboard rows and peer display names.
-- Tighten pre_tournament_picks writes to require group membership (or admin).

drop policy if exists leaderboard_select_own_or_admin on public.leaderboard;
create policy leaderboard_select_group_member
on public.leaderboard
for select
to authenticated
using (
  public.is_group_admin(group_id)
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = leaderboard.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists group_members_select_own_or_admin on public.group_members;
create policy group_members_select_group_member
on public.group_members
for select
to authenticated
using (
  public.is_group_admin(group_id)
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
  )
);

drop policy if exists pre_tournament_picks_insert_own on public.pre_tournament_picks;
create policy pre_tournament_picks_insert_own
on public.pre_tournament_picks
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_group_admin(group_id)
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = pre_tournament_picks.group_id
        and gm.user_id = auth.uid()
    )
  )
);

drop policy if exists pre_tournament_picks_update_own on public.pre_tournament_picks;
create policy pre_tournament_picks_update_own
on public.pre_tournament_picks
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    public.is_group_admin(group_id)
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = pre_tournament_picks.group_id
        and gm.user_id = auth.uid()
    )
  )
);
