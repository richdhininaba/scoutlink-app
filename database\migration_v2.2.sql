-- ============================================================
-- ScoutLink Migration v2.2: Create missing tables
-- Run in Supabase SQL Editor
-- ============================================================

-- Create scout_predictions table (stores prediction runs)
CREATE TABLE IF NOT EXISTS scout_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  training_plan TEXT,
  yr1_rating NUMERIC,
  yr2_rating NUMERIC,
  yr3_rating NUMERIC,
  yr1_breakdown JSONB,
  yr2_breakdown JSONB,
  yr3_breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast scout lookups
CREATE INDEX IF NOT EXISTS idx_scout_predictions_scout_id ON scout_predictions(scout_id);
CREATE INDEX IF NOT EXISTS idx_scout_predictions_player_id ON scout_predictions(player_id);

-- Create scout_exports table (stores export log)
CREATE TABLE IF NOT EXISTS scout_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  export_type TEXT DEFAULT 'PDF',
  file_url TEXT,
  exported_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast scout lookups
CREATE INDEX IF NOT EXISTS idx_scout_exports_scout_id ON scout_exports(scout_id);
CREATE INDEX IF NOT EXISTS idx_scout_exports_player_id ON scout_exports(player_id);

-- Enable RLS
ALTER TABLE scout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_exports ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DROP POLICY IF EXISTS "service_role_all" ON scout_predictions;
CREATE POLICY "service_role_all" ON scout_predictions TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all" ON scout_exports;
CREATE POLICY "service_role_all" ON scout_exports TO service_role USING (true) WITH CHECK (true);

-- Add jumping column to players if missing (needed for 15-attribute system)
ALTER TABLE players ADD COLUMN IF NOT EXISTS jumping NUMERIC DEFAULT 5;
ALTER TABLE players ADD COLUMN IF NOT EXISTS vision NUMERIC DEFAULT 5;
ALTER TABLE players ADD COLUMN IF NOT EXISTS positioning NUMERIC DEFAULT 5;
ALTER TABLE players ADD COLUMN IF NOT EXISTS heading NUMERIC DEFAULT 5;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tackling NUMERIC DEFAULT 5;
ALTER TABLE players ADD COLUMN IF NOT EXISTS crossing NUMERIC DEFAULT 5;

-- Add overall_rating and transfer_value columns if missing
ALTER TABLE players ADD COLUMN IF NOT EXISTS overall_rating NUMERIC;
ALTER TABLE players ADD COLUMN IF NOT EXISTS transfer_value NUMERIC;

-- Ensure is_active has a default
ALTER TABLE players ALTER COLUMN is_active SET DEFAULT true;
