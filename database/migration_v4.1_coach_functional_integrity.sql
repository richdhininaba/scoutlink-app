-- ScoutLink Coach functional integrity
-- 2026-08-21
--
-- Match Facts represents one Coach/team record per player for a fixture.
-- The API now upserts that pair; this index prevents a future regression from
-- silently double-counting appearances, goals, assists or cards.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.match_facts
    WHERE fixture_id IS NOT NULL
    GROUP BY fixture_id, player_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add match_facts fixture/player uniqueness: duplicate fixture_id + player_id rows already exist.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS match_facts_fixture_player_unique
  ON public.match_facts (fixture_id, player_id)
  WHERE fixture_id IS NOT NULL;
