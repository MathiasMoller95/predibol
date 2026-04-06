-- RUN THIS IN SUPABASE SQL EDITOR

-- System profile for the AI benchmark player (no auth.users entry needed).
-- The score-match Edge Function auto-inserts predictions + leaderboard rows
-- using the service role, which bypasses RLS.
INSERT INTO profiles (id, display_name, timezone, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🤖 Predibol IA',
  'UTC',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
