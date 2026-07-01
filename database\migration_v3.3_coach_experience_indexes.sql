-- ScoutLink v3.3 coach experience indexes
-- Covers foreign keys used by coach player assignment, fixtures, and video reels.

CREATE INDEX IF NOT EXISTS idx_players_assigned_coach_id ON players(assigned_coach_id);
CREATE INDEX IF NOT EXISTS idx_coaches_team_id ON coaches(team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_team_id ON fixtures(team_id);
CREATE INDEX IF NOT EXISTS idx_player_videos_player_id ON player_videos(player_id);

