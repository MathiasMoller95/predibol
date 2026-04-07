-- RUN THIS IN SUPABASE SQL EDITOR

-- Table to track each player's power usage
CREATE TABLE IF NOT EXISTS public.power_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id),
  group_id uuid NOT NULL REFERENCES groups(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  power_type text NOT NULL CHECK (power_type IN ('double_down', 'spy', 'shield')),
  target_user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id, group_id, match_id, power_type)
);

-- Power limits per group (configurable per group)
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS powers_double_down integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS powers_spy integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS powers_shield integer NOT NULL DEFAULT 2;

-- RLS
ALTER TABLE public.power_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read power usage in their groups"
  ON public.power_usage FOR SELECT
  USING (
    group_id IN (SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own power usage"
  ON public.power_usage FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own power usage"
  ON public.power_usage FOR DELETE
  USING (user_id = auth.uid());

-- RPC for spying: SECURITY DEFINER bypasses RLS so the caller can read
-- another user's prediction while still checking for shield.
CREATE OR REPLACE FUNCTION public.spy_prediction(
  p_group_id uuid,
  p_match_id uuid,
  p_target_user_id uuid,
  p_spy_user_id uuid
) RETURNS TABLE(predicted_home integer, predicted_away integer, is_shielded boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pred.predicted_home,
    pred.predicted_away,
    EXISTS(
      SELECT 1 FROM power_usage pu
      WHERE pu.user_id = p_target_user_id
        AND pu.match_id = p_match_id
        AND pu.group_id = p_group_id
        AND pu.power_type = 'shield'
    ) AS is_shielded
  FROM predictions pred
  WHERE pred.user_id = p_target_user_id
    AND pred.match_id = p_match_id
    AND pred.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
