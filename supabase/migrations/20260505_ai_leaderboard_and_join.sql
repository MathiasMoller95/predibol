-- AI player on leaderboard for every group; join capacity excludes AI from group_members count.

-- ---------------------------------------------------------------------------
-- Join: do not count AI toward member_limit (AI may exist in group_members after score-match)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_group_if_room(p_group_id uuid, p_display_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_lim int;
  v_pay text;
  v_cnt int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF length(trim(coalesce(p_display_name, ''))) < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_display_name');
  END IF;

  SELECT g.member_limit, g.payment_status
  INTO v_lim, v_pay
  FROM public.groups g
  WHERE g.id = p_group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'group_not_found');
  END IF;

  IF v_pay = 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'group_pending');
  END IF;

  IF v_pay NOT IN ('free', 'beta', 'paid', 'coupon') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'group_not_joinable');
  END IF;

  SELECT count(*)::int
  INTO v_cnt
  FROM public.group_members
  WHERE group_id = p_group_id
    AND user_id != '00000000-0000-0000-0000-000000000001'::uuid;

  IF v_cnt >= v_lim THEN
    RETURN jsonb_build_object('ok', false, 'error', 'group_full');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_members WHERE group_id = p_group_id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  INSERT INTO public.group_members (group_id, user_id, display_name)
  VALUES (p_group_id, v_uid, left(trim(p_display_name), 200));

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'already_member', true);
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_if_room(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_if_room(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Client-callable: group admin seeds AI leaderboard row (RLS blocks direct insert)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_ai_player_leaderboard(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.leaderboard (
    group_id,
    user_id,
    total_points,
    predictions_made,
    exact_scores,
    correct_results,
    rank,
    virtual_pnl,
    virtual_bets_won,
    virtual_bets_lost
  )
  VALUES (
    p_group_id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    0,
    0,
    0,
    0,
    NULL,
    0,
    0,
    0
  )
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_ai_player_leaderboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_ai_player_leaderboard(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Backfill AI leaderboard for existing groups
-- ---------------------------------------------------------------------------
INSERT INTO public.leaderboard (
  group_id,
  user_id,
  total_points,
  predictions_made,
  exact_scores,
  correct_results,
  rank,
  virtual_pnl,
  virtual_bets_won,
  virtual_bets_lost
)
SELECT
  g.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  0,
  0,
  0,
  0,
  NULL,
  0,
  0,
  0
FROM public.groups g
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leaderboard l
  WHERE l.group_id = g.id
    AND l.user_id = '00000000-0000-0000-0000-000000000001'::uuid
)
ON CONFLICT (group_id, user_id) DO NOTHING;
