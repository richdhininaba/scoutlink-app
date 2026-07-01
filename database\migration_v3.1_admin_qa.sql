-- ScoutLink v3.1 admin QA fixes
-- Adds missing production columns used by the Stratex admin flows and seed data.

ALTER TABLE award_nominations
  ADD COLUMN IF NOT EXISTS year INTEGER;

UPDATE award_nominations
SET year = EXTRACT(YEAR FROM COALESCE(nominated_at, now()))::INTEGER
WHERE year IS NULL;

ALTER TABLE recruitment_pipeline
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

UPDATE recruitment_pipeline
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE match_facts
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES school_academy_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS home_score INTEGER,
  ADD COLUMN IF NOT EXISTS away_score INTEGER,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS format TEXT,
  ADD COLUMN IF NOT EXISTS formation TEXT,
  ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS player_positions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ratings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pace NUMERIC,
  ADD COLUMN IF NOT EXISTS agility NUMERIC,
  ADD COLUMN IF NOT EXISTS strength NUMERIC,
  ADD COLUMN IF NOT EXISTS stamina NUMERIC,
  ADD COLUMN IF NOT EXISTS jumping NUMERIC,
  ADD COLUMN IF NOT EXISTS composure NUMERIC,
  ADD COLUMN IF NOT EXISTS shooting NUMERIC,
  ADD COLUMN IF NOT EXISTS passing NUMERIC,
  ADD COLUMN IF NOT EXISTS dribbling NUMERIC,
  ADD COLUMN IF NOT EXISTS defending NUMERIC,
  ADD COLUMN IF NOT EXISTS crossing NUMERIC,
  ADD COLUMN IF NOT EXISTS vision NUMERIC,
  ADD COLUMN IF NOT EXISTS positioning NUMERIC,
  ADD COLUMN IF NOT EXISTS heading NUMERIC,
  ADD COLUMN IF NOT EXISTS tackling NUMERIC;

CREATE INDEX IF NOT EXISTS idx_award_nominations_year ON award_nominations(year);
CREATE INDEX IF NOT EXISTS idx_match_facts_team_id ON match_facts(team_id);
CREATE INDEX IF NOT EXISTS idx_match_facts_coach_id ON match_facts(coach_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_pipeline_is_active ON recruitment_pipeline(is_active);

NOTIFY pgrst, 'reload schema';
