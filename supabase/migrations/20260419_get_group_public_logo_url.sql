-- Expose logo_url for OG images / public join metadata (anon-safe RPC).
-- Must DROP first: Postgres does not allow changing the return row type via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.get_group_public_by_slug(text);

CREATE FUNCTION public.get_group_public_by_slug(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  primary_color text,
  secondary_color text,
  logo_url text,
  admin_id uuid,
  created_at timestamptz
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
    g.primary_color,
    g.secondary_color,
    g.logo_url,
    g.admin_id,
    g.created_at
  FROM public.groups g
  WHERE g.slug = _slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_group_public_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_group_public_by_slug(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_public_by_slug(text) TO authenticated;
