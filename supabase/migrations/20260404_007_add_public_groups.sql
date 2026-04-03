-- RUN THIS IN SUPABASE SQL EDITOR
-- This project does not apply migrations via CLI; run this file manually in Supabase.

-- Add is_public flag to groups (default false = private/invite-only)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add description column for public groups (shown in discovery)
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- Allow any authenticated user to read public groups (for the discovery page)
DROP POLICY IF EXISTS groups_read_public ON public.groups;
CREATE POLICY groups_read_public
ON public.groups
FOR SELECT
TO authenticated
USING (is_public = true);
