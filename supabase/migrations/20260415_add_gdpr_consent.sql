-- GDPR: auditable consent timestamp on profiles.
-- New signups pass gdpr_consent_at in auth user metadata; trigger copies it into profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  consent_iso text;
BEGIN
  consent_iso := NEW.raw_user_meta_data->>'gdpr_consent_at';
  INSERT INTO public.profiles (id, display_name, gdpr_consent_at)
  VALUES (
    NEW.id,
    '',
    CASE
      WHEN consent_iso IS NOT NULL AND btrim(consent_iso) <> '' THEN consent_iso::timestamptz
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill: users who joined before this column existed
UPDATE public.profiles
SET gdpr_consent_at = created_at
WHERE gdpr_consent_at IS NULL;
