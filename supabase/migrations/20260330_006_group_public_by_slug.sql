-- Allow the join page to fetch basic group info by slug
-- without requiring authentication (RLS-safe via security definer RPC).

create or replace function public.get_group_public_by_slug(_slug text)
returns table (
  id uuid,
  name text,
  slug text,
  primary_color text,
  secondary_color text,
  admin_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.slug,
    g.primary_color,
    g.secondary_color,
    g.admin_id,
    g.created_at
  from public.groups g
  where g.slug = _slug
  limit 1;
$$;

revoke all on function public.get_group_public_by_slug(text) from public;
grant execute on function public.get_group_public_by_slug(text) to anon;
grant execute on function public.get_group_public_by_slug(text) to authenticated;

