-- ScoutLink V4 safe rollout 4/4: non-blocking validation and indexes.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.players'::regclass AND conname='players_v4_position_check') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_v4_position_check CHECK (
      primary_position IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
      AND specific_position IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
    ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.players'::regclass AND conname='players_v4_rating_scale_check') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_v4_rating_scale_check CHECK (attribute_rating_scale='ten') NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_players_v4_position ON players(position_group,primary_position);
CREATE INDEX IF NOT EXISTS idx_players_v4_attributes ON players USING GIN(attribute_ratings);
CREATE INDEX IF NOT EXISTS idx_players_v4_scoring_version ON players(scoring_version);
CREATE INDEX IF NOT EXISTS idx_match_facts_v4_position_date ON match_facts(player_id,position_played,match_date DESC);
CREATE INDEX IF NOT EXISTS idx_match_facts_v4_attributes ON match_facts USING GIN(attribute_ratings);
CREATE INDEX IF NOT EXISTS idx_compatibility_scores_v4_version ON compatibility_scores(scoring_version);
COMMIT;
