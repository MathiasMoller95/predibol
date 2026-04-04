-- RUN THIS IN SUPABASE SQL EDITOR
-- This migration must be run manually in the Supabase SQL Editor (not via CLI).

-- Add access code column to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'open'
    CHECK (access_mode IN ('open', 'protected')),
  ADD COLUMN IF NOT EXISTS access_code text;

ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS access_code_format;

ALTER TABLE public.groups
  ADD CONSTRAINT access_code_format
    CHECK (
      (access_mode = 'open' AND access_code IS NULL)
      OR (access_mode = 'protected' AND access_code ~ '^\d{6}$')
    );

-- Non-admins must not read access_code via PostgREST; verification uses RPC below.
REVOKE SELECT (access_code) ON public.groups FROM authenticated;

CREATE OR REPLACE FUNCTION public.verify_group_access_code(
  group_slug text,
  entered_code text
) RETURNS boolean AS $$
DECLARE
  stored_code text;
  stored_mode text;
BEGIN
  SELECT g.access_code, g.access_mode
  INTO stored_code, stored_mode
  FROM public.groups g
  WHERE g.slug = group_slug;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF stored_mode = 'open' THEN
    RETURN true;
  END IF;

  RETURN stored_code = entered_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.verify_group_access_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_group_access_code(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_group_access(p_group_id uuid)
RETURNS TABLE (access_mode text, access_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT g.access_mode, g.access_code
  FROM public.groups g
  WHERE g.id = p_group_id
    AND g.admin_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_group_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_group_access(uuid) TO authenticated;
