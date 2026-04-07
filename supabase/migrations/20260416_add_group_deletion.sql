-- SECURITY DEFINER function to cascade-delete a group and all related data.
-- Caller must be the group admin (checked via auth.uid()).
CREATE OR REPLACE FUNCTION public.delete_group(p_group_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM groups WHERE id = p_group_id AND admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this group';
  END IF;

  DELETE FROM power_usage WHERE group_id = p_group_id;
  DELETE FROM sticker_album WHERE group_id = p_group_id;
  DELETE FROM predictions WHERE group_id = p_group_id;
  DELETE FROM pre_tournament_picks WHERE group_id = p_group_id;
  DELETE FROM leaderboard WHERE group_id = p_group_id;
  DELETE FROM group_members WHERE group_id = p_group_id;
  DELETE FROM groups WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
