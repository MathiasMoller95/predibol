-- Pricing tiers, coupons, Stripe columns, RLS tightening, join RPC, discover filter, pending cleanup helper.

-- ---------------------------------------------------------------------------
-- groups: tier + payment + Stripe
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'pichanga'
    CHECK (tier IN ('pichanga', 'partido', 'partidazo', 'corpo'));

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS member_limit integer NOT NULL DEFAULT 7;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'free'
    CHECK (payment_status IN ('free', 'beta', 'pending', 'paid', 'coupon'));

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer;

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS coupon_code text;

CREATE INDEX IF NOT EXISTS idx_groups_stripe_session
  ON public.groups (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Grandfather existing groups as beta (free tier limits)
UPDATE public.groups
SET
  payment_status = 'beta',
  tier = 'pichanga',
  member_limit = 7
WHERE payment_status = 'free';

-- ---------------------------------------------------------------------------
-- coupons + coupon_usage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('percent', 'fixed', 'free')),
  value integer NOT NULL DEFAULT 0,
  max_uses integer,
  times_used integer NOT NULL DEFAULT 0,
  applicable_tiers text[] NOT NULL DEFAULT ARRAY['partido', 'partidazo', 'corpo']::text[],
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons (id),
  group_id uuid REFERENCES public.groups (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id),
  discount_cents integer NOT NULL,
  final_price_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can validate coupons" ON public.coupons;
CREATE POLICY "Anyone can validate coupons"
  ON public.coupons
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can see their own coupon usage" ON public.coupon_usage;
CREATE POLICY "Users can see their own coupon usage"
  ON public.coupon_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Webhook uses service role only; keep table without RLS for simpler inserts.
ALTER TABLE public.stripe_events DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS: tighten groups read (pending not visible except admin / member)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS groups_select_authenticated_for_join ON public.groups;
CREATE POLICY groups_select_authenticated_for_join
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.group_members gm
      WHERE gm.group_id = groups.id
        AND gm.user_id = auth.uid()
    )
    OR payment_status IN ('free', 'beta', 'paid', 'coupon')
  );

DROP POLICY IF EXISTS groups_read_public ON public.groups;
CREATE POLICY groups_read_public
  ON public.groups
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    AND payment_status IN ('free', 'beta', 'paid', 'coupon')
  );

-- ---------------------------------------------------------------------------
-- Discover RPC: exclude pending / non-joinable payment states
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_groups_with_counts();

CREATE FUNCTION public.get_public_groups_with_counts()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  primary_color text,
  colors jsonb,
  logo_url text,
  admin_id uuid,
  access_mode text,
  member_count bigint
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
    g.description,
    g.primary_color,
    g.colors,
    g.logo_url,
    g.admin_id,
    g.access_mode,
    (SELECT count(*)::bigint FROM public.group_members gm WHERE gm.group_id = g.id) AS member_count
  FROM public.groups g
  WHERE g.is_public = true
    AND g.payment_status IN ('free', 'beta', 'paid', 'coupon')
  ORDER BY member_count DESC, g.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_groups_with_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_groups_with_counts() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_groups_with_counts() TO authenticated;

-- ---------------------------------------------------------------------------
-- Join with member limit (server-enforced via RPC)
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

  SELECT count(*)::int INTO v_cnt FROM public.group_members WHERE group_id = p_group_id;

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
-- Seed coupons (idempotent upsert by code)
-- ---------------------------------------------------------------------------
INSERT INTO public.coupons (code, type, value, max_uses, times_used, applicable_tiers, expires_at, active)
VALUES
  (
    'MCKINSEY100',
    'free',
    0,
    null,
    0,
    ARRAY['partido', 'partidazo', 'corpo']::text[],
    null,
    true
  ),
  (
    'EARLYBIRD',
    'percent',
    30,
    50,
    0,
    ARRAY['partido', 'partidazo', 'corpo']::text[],
    '2026-06-10 23:59:59+00'::timestamptz,
    true
  ),
  (
    'BETA100',
    'free',
    0,
    20,
    0,
    ARRAY['partido', 'partidazo', 'corpo']::text[],
    null,
    true
  )
ON CONFLICT (code) DO NOTHING;

-- Only free/beta groups may be inserted by end users; paid/pending/coupon rows come from service role (API).
DROP POLICY IF EXISTS groups_insert_self_admin ON public.groups;
CREATE POLICY groups_insert_self_admin
  ON public.groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND payment_status IN ('free', 'beta')
  );
