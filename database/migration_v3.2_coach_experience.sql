-- ScoutLink v3.2 coach experience fixes
-- Adds season archives, fixture-linked match facts, and richer video reel metadata.

CREATE TABLE IF NOT EXISTS season_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  team_id UUID REFERENCES school_academy_teams(id) ON DELETE SET NULL,
  season_label TEXT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  player_summaries JSONB DEFAULT '[]'::jsonb,
  player_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_facts
  ADD COLUMN IF NOT EXISTS fixture_id UUID REFERENCES fixtures(id) ON DELETE SET NULL;

ALTER TABLE player_videos
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_season_archives_coach ON season_archives(coach_id, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_season_archives_team ON season_archives(team_id, archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_facts_fixture_id ON match_facts(fixture_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-videos',
  'player-videos',
  true,
  104857600,
  ARRAY['video/mp4','video/webm','video/quicktime','video/x-msvideo']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

NOTIFY pgrst, 'reload schema';
