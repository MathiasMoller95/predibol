-- Theme JSON (primary / secondary / background_tint) — nullable; logo_url already exists on groups.
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS colors jsonb;

COMMENT ON COLUMN public.groups.colors IS
  'Optional theme: { "primary": "#hex", "secondary": "#hex", "background_tint": "#hex" }. Falls back to primary_color/secondary_color.';

-- Public bucket for group logos (read by anyone; write restricted below).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'group-logos',
  'group-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path: {group_id}/logo.ext — first path segment must be group id and caller must be group admin.
DROP POLICY IF EXISTS "group_logos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "group_logos_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "group_logos_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "group_logos_delete_admin" ON storage.objects;

CREATE POLICY "group_logos_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'group-logos');

CREATE POLICY "group_logos_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-logos'
  AND split_part(name, '/', 1)::uuid IN (SELECT id FROM public.groups WHERE admin_id = auth.uid())
);

CREATE POLICY "group_logos_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'group-logos'
  AND split_part(name, '/', 1)::uuid IN (SELECT id FROM public.groups WHERE admin_id = auth.uid())
)
WITH CHECK (
  bucket_id = 'group-logos'
  AND split_part(name, '/', 1)::uuid IN (SELECT id FROM public.groups WHERE admin_id = auth.uid())
);

CREATE POLICY "group_logos_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-logos'
  AND split_part(name, '/', 1)::uuid IN (SELECT id FROM public.groups WHERE admin_id = auth.uid())
);
