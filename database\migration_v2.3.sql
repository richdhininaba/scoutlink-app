-- ============================================================
-- ScoutLink Migration v2.3
-- Match facts table, award nominations year, season archives
-- Run in Supabase SQL Editor
-- ============================================================

-- Add missing columns to match_facts table
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES school_academy_teams(id) ON DELETE SET NULL;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS coach_id UUID;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS home_score INTEGER;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS away_score INTEGER;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'post';
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS formation TEXT;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS events JSONB;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS player_positions JSONB;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS ratings JSONB;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT false;

-- Ensure all 15 attribute columns exist in match_facts
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS pace NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS agility NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS strength NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS stamina NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS jumping NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS composure NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS shooting NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS passing NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS dribbling NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS defending NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS crossing NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS vision NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS positioning NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS heading NUMERIC;
ALTER TABLE match_facts ADD COLUMN IF NOT EXISTS tackling NUMERIC;

-- Rename created_by to coach_id if it exists, otherwise add coach_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='match_facts' AND column_name='created_by') THEN
    UPDATE match_facts SET coach_id = created_by::uuid WHERE coach_id IS NULL;
  END IF;
END $$;

-- Add year column to award_nominations
ALTER TABLE award_nominations ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE award_nominations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE award_nominations ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false;
ALTER TABLE award_nominations ADD COLUMN IF NOT EXISTS nominated_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows with current year
UPDATE award_nominations SET year = EXTRACT(YEAR FROM COALESCE(nominated_at, now()))::INTEGER WHERE year IS NULL;

-- Create season_archives table (Task 16)
CREATE TABLE IF NOT EXISTS season_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  team_id UUID,
  season_label TEXT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now(),
  player_summaries JSONB,
  player_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_season_archives_coach_id ON season_archives(coach_id);

-- Create predictions_log table (Task 14)
CREATE TABLE IF NOT EXISTS predictions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL,
  input_params JSONB,
  result JSONB,
  run_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_predictions_log_scout_id ON predictions_log(scout_id);
CREATE INDEX IF NOT EXISTS idx_predictions_log_player_id ON predictions_log(player_id);

-- Enable RLS
ALTER TABLE season_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON season_archives;
CREATE POLICY "service_role_all" ON season_archives TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all" ON predictions_log;
CREATE POLICY "service_role_all" ON predictions_log TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_all" ON match_facts;
CREATE POLICY "service_role_all" ON match_facts TO service_role USING (true) WITH CHECK (true);
