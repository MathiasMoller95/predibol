-- RUN THIS IN SUPABASE SQL EDITOR

CREATE TABLE IF NOT EXISTS public.sticker_album (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id),
  group_id uuid NOT NULL REFERENCES groups(id),
  team text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  earned_from_match_id uuid REFERENCES matches(id),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, group_id, team)
);

ALTER TABLE public.sticker_album ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read stickers in their groups"
  ON public.sticker_album FOR SELECT
  USING (
    group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid())
  );
