-- Virtual P&L (fantasy trader) aggregates — updated when matches are scored.

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS virtual_pnl decimal(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS virtual_bets_won integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS virtual_bets_lost integer DEFAULT 0;
