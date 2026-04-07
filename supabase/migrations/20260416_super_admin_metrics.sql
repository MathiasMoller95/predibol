-- SECURITY DEFINER RPC returning platform-wide counts for the super admin dashboard.
-- Only callable by the hardcoded super admin UUID.
CREATE OR REPLACE FUNCTION public.super_admin_metrics(p_user_id uuid)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  IF p_user_id != '0fc45aae-652f-49db-963b-8784bae42fea' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM profiles),
    'total_groups', (SELECT count(*) FROM groups),
    'total_members', (SELECT count(*) FROM group_members),
    'total_predictions', (SELECT count(*) FROM predictions),
    'users_with_predictions', (SELECT count(DISTINCT user_id) FROM predictions),
    'total_powers', (SELECT count(*) FROM power_usage),
    'total_stickers', (SELECT count(*) FROM sticker_album),
    'matches_finished', (SELECT count(*) FROM matches WHERE status = 'finished'),
    'matches_scheduled', (SELECT count(*) FROM matches WHERE status = 'scheduled'),
    'matches_live', (SELECT count(*) FROM matches WHERE status = 'live')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
