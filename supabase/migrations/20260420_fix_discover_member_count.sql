-- Member counts for public groups on Discover without exposing group_members rows.
-- RLS blocks non-members from counting via PostgREST embed; this runs with definer rights.

DROP FUNCTION IF EXISTS public.get_public_groups_with_counts();

CREATE FUNCTION public.get_public_groups_with_counts()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  primary_color text,
  colors jsonb,
  logo_url text,
  admin_id uuid,
  access_mode text,
  member_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id,
    g.name,
    g.slug,
    g.description,
    g.primary_color,
    g.colors,
    g.logo_url,
    g.admin_id,
    g.access_mode,
    (SELECT count(*)::bigint FROM public.group_members gm WHERE gm.group_id = g.id) AS member_count
  FROM public.groups g
  WHERE g.is_public = true
  ORDER BY member_count DESC, g.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_groups_with_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_groups_with_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_groups_with_counts() TO authenticated;
