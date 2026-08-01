-- ScoutLink V4 safe rollout 3/4: match evidence, Scout setup and saved outputs.
BEGIN;
ALTER TABLE IF EXISTS match_facts
  ADD COLUMN IF NOT EXISTS position_played TEXT,
  ADD COLUMN IF NOT EXISTS side_played TEXT,
  ADD COLUMN IF NOT EXISTS role_played TEXT,
  ADD COLUMN IF NOT EXISTS match_format TEXT,
  ADD COLUMN IF NOT EXISTS formation_played TEXT,
  ADD COLUMN IF NOT EXISTS competition_level TEXT,
  ADD COLUMN IF NOT EXISTS opposition_level TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS evidence_source TEXT,
  ADD COLUMN IF NOT EXISTS rubric_version TEXT,
  ADD COLUMN IF NOT EXISTS assessment_version TEXT,
  ADD COLUMN IF NOT EXISTS rating_scale TEXT NOT NULL DEFAULT 'ten',
  ADD COLUMN IF NOT EXISTS attribute_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS role_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS benchmark_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'v4.0.0',
  ADD COLUMN IF NOT EXISTS passes_attempted INTEGER,
  ADD COLUMN IF NOT EXISTS passes_completed INTEGER,
  ADD COLUMN IF NOT EXISTS progressive_passes INTEGER,
  ADD COLUMN IF NOT EXISTS line_breaking_passes INTEGER,
  ADD COLUMN IF NOT EXISTS progressive_carries INTEGER,
  ADD COLUMN IF NOT EXISTS chances_created INTEGER,
  ADD COLUMN IF NOT EXISTS take_ons_attempted INTEGER,
  ADD COLUMN IF NOT EXISTS take_ons_completed INTEGER,
  ADD COLUMN IF NOT EXISTS duels_attempted INTEGER,
  ADD COLUMN IF NOT EXISTS duels_won INTEGER,
  ADD COLUMN IF NOT EXISTS aerial_duels_attempted INTEGER,
  ADD COLUMN IF NOT EXISTS aerial_duels_won INTEGER,
  ADD COLUMN IF NOT EXISTS pressures INTEGER,
  ADD COLUMN IF NOT EXISTS successful_pressures INTEGER,
  ADD COLUMN IF NOT EXISTS recoveries INTEGER,
  ADD COLUMN IF NOT EXISTS blocks INTEGER,
  ADD COLUMN IF NOT EXISTS clearances INTEGER,
  ADD COLUMN IF NOT EXISTS errors_leading_to_shot INTEGER,
  ADD COLUMN IF NOT EXISTS box_entries INTEGER,
  ADD COLUMN IF NOT EXISTS box_touches INTEGER;

UPDATE match_facts SET
  position_played=scoutlink_v4_normalise_position(position_played),
  rating_scale='ten',
  scoring_version=COALESCE(NULLIF(scoring_version,''),'v4.0.0');

ALTER TABLE IF EXISTS scout_teams
  ADD COLUMN IF NOT EXISTS scoring_setup JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_setup_version TEXT NOT NULL DEFAULT 'v4.0.0';

ALTER TABLE IF EXISTS compatibility_scores
  ADD COLUMN IF NOT EXISTS conservative_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS estimated_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS likely_range JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS position_status TEXT,
  ADD COLUMN IF NOT EXISTS score_ceiling NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS evidence_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculation_setup JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS input_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'v4.0.0';

ALTER TABLE IF EXISTS predictions_log
  ADD COLUMN IF NOT EXISTS input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scout_setup_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS player_scoring_version TEXT,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'v4.0.0';
COMMIT;
