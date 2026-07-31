-- ScoutLink scoring engine V4 — canonical 1–10 position-aware migration.
-- Run after deploying backend code that can read both legacy scalar fields and
-- the new nested attribute_ratings field.
--
-- This migration is additive. It does not drop the legacy scalar attributes.
-- Use the later V4.1 cleanup migration only after production validation.

BEGIN;

-- ---------------------------------------------------------------------------
-- Canonical position group
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'position_group'
  ) AND EXISTS (
    SELECT 1
    FROM pg_enum enum_row
    JOIN pg_type type_row ON type_row.oid = enum_row.enumtypid
    WHERE type_row.typname = 'position_group'
      AND enum_row.enumlabel = 'Forward'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum enum_row
    JOIN pg_type type_row ON type_row.oid = enum_row.enumtypid
    WHERE type_row.typname = 'position_group'
      AND enum_row.enumlabel = 'Attacker'
  ) THEN
    ALTER TYPE position_group RENAME VALUE 'Forward' TO 'Attacker';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Players: assessment inputs and calculated V4 outputs
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS alternative_positions TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS attribute_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attribute_rating_scale TEXT NOT NULL DEFAULT 'ten',
  ADD COLUMN IF NOT EXISTS attribute_assessment_version TEXT,
  ADD COLUMN IF NOT EXISTS attribute_assessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attribute_assessed_by UUID,
  ADD COLUMN IF NOT EXISTS evidence_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS overall_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS position_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prediction_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS value_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'v4.0.0',
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS players
  ALTER COLUMN attribute_rating_scale SET DEFAULT 'ten',
  ALTER COLUMN scoring_version SET DEFAULT 'v4.0.0';

UPDATE players
SET
  position_group = CASE
    WHEN position_group::text = 'Forward' THEN 'Attacker'::position_group
    ELSE position_group
  END,
  primary_position = CASE UPPER(COALESCE(primary_position, specific_position, ''))
    WHEN 'CDM' THEN 'DM'
    WHEN 'CAM' THEN 'AM'
    WHEN 'B2B' THEN 'CM'
    WHEN 'RCM' THEN 'CM'
    WHEN 'LCM' THEN 'CM'
    WHEN 'RDM' THEN 'DM'
    WHEN 'LDM' THEN 'DM'
    WHEN 'RAM' THEN 'AM'
    WHEN 'LAM' THEN 'AM'
    WHEN 'LS' THEN 'ST'
    WHEN 'RS' THEN 'ST'
    WHEN 'SS' THEN 'CF'
    WHEN 'BPD' THEN 'CB'
    WHEN 'RCB' THEN 'CB'
    WHEN 'LCB' THEN 'CB'
    WHEN 'SW' THEN 'CB'
    ELSE UPPER(COALESCE(primary_position, specific_position, ''))
  END,
  specific_position = CASE UPPER(COALESCE(specific_position, primary_position, ''))
    WHEN 'CDM' THEN 'DM'
    WHEN 'CAM' THEN 'AM'
    WHEN 'B2B' THEN 'CM'
    WHEN 'RCM' THEN 'CM'
    WHEN 'LCM' THEN 'CM'
    WHEN 'RDM' THEN 'DM'
    WHEN 'LDM' THEN 'DM'
    WHEN 'RAM' THEN 'AM'
    WHEN 'LAM' THEN 'AM'
    WHEN 'LS' THEN 'ST'
    WHEN 'RS' THEN 'ST'
    WHEN 'SS' THEN 'CF'
    WHEN 'BPD' THEN 'CB'
    WHEN 'RCB' THEN 'CB'
    WHEN 'LCB' THEN 'CB'
    WHEN 'SW' THEN 'CB'
    ELSE UPPER(COALESCE(specific_position, primary_position, ''))
  END,
  attribute_rating_scale = 'ten',
  scoring_version = COALESCE(NULLIF(scoring_version, ''), 'v4.0.0');

UPDATE players
SET position_group = CASE
  WHEN primary_position = 'GK' THEN 'Goalkeeper'::position_group
  WHEN primary_position IN ('RB','CB','LB','RWB','LWB') THEN 'Defender'::position_group
  WHEN primary_position IN ('DM','CM','AM','RM','LM') THEN 'Midfielder'::position_group
  WHEN primary_position IN ('RW','LW','CF','ST') THEN 'Attacker'::position_group
  ELSE position_group
END;

UPDATE players
SET
  positions = ARRAY(
    SELECT DISTINCT mapped
    FROM unnest(
      COALESCE(positions, '{}'::text[]) ||
      ARRAY[primary_position]
    ) source(position)
    CROSS JOIN LATERAL (
      SELECT CASE UPPER(position)
        WHEN 'CDM' THEN 'DM'
        WHEN 'CAM' THEN 'AM'
        WHEN 'B2B' THEN 'CM'
        WHEN 'RCM' THEN 'CM'
        WHEN 'LCM' THEN 'CM'
        WHEN 'RDM' THEN 'DM'
        WHEN 'LDM' THEN 'DM'
        WHEN 'RAM' THEN 'AM'
        WHEN 'LAM' THEN 'AM'
        WHEN 'LS' THEN 'ST'
        WHEN 'RS' THEN 'ST'
        WHEN 'SS' THEN 'CF'
        WHEN 'BPD' THEN 'CB'
        WHEN 'RCB' THEN 'CB'
        WHEN 'LCB' THEN 'CB'
        WHEN 'SW' THEN 'CB'
        ELSE UPPER(position)
      END AS mapped
    ) normalised
    WHERE mapped IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
  ),
  alternative_positions = ARRAY(
    SELECT DISTINCT mapped
    FROM unnest(COALESCE(positions, '{}'::text[])) source(position)
    CROSS JOIN LATERAL (
      SELECT CASE UPPER(position)
        WHEN 'CDM' THEN 'DM'
        WHEN 'CAM' THEN 'AM'
        WHEN 'B2B' THEN 'CM'
        WHEN 'RCM' THEN 'CM'
        WHEN 'LCM' THEN 'CM'
        WHEN 'RDM' THEN 'DM'
        WHEN 'LDM' THEN 'DM'
        WHEN 'RAM' THEN 'AM'
        WHEN 'LAM' THEN 'AM'
        WHEN 'LS' THEN 'ST'
        WHEN 'RS' THEN 'ST'
        WHEN 'SS' THEN 'CF'
        WHEN 'BPD' THEN 'CB'
        WHEN 'RCB' THEN 'CB'
        WHEN 'LCB' THEN 'CB'
        WHEN 'SW' THEN 'CB'
        ELSE UPPER(position)
      END AS mapped
    ) normalised
    WHERE mapped IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
      AND mapped IS DISTINCT FROM primary_position
  );

-- ---------------------------------------------------------------------------
-- Rating validation helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION scoutlink_v4_rating_leaves_valid(document JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item RECORD;
  numeric_value NUMERIC;
BEGIN
  IF document IS NULL THEN
    RETURN TRUE;
  END IF;

  IF JSONB_TYPEOF(document) = 'null' THEN
    RETURN TRUE;
  END IF;

  IF JSONB_TYPEOF(document) = 'number' THEN
    numeric_value := (document #>> '{}')::numeric;
    RETURN numeric_value = TRUNC(numeric_value)
      AND numeric_value BETWEEN 1 AND 10;
  END IF;

  IF JSONB_TYPEOF(document) <> 'object' THEN
    RETURN FALSE;
  END IF;

  FOR item IN SELECT * FROM JSONB_EACH(document)
  LOOP
    IF NOT scoutlink_v4_rating_leaves_valid(item.value) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION scoutlink_v4_keys_allowed(
  document JSONB,
  allowed_keys TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    BOOL_AND(key = ANY(allowed_keys)),
    TRUE
  )
  FROM JSONB_OBJECT_KEYS(COALESCE(document, '{}'::jsonb)) AS key;
$$;

CREATE OR REPLACE FUNCTION scoutlink_v4_player_ratings_valid(
  group_name TEXT,
  document JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  general_keys CONSTANT TEXT[] := ARRAY[
    'first_touch','passing','dribbling','weak_foot','awareness',
    'decision_making','pace','agility_balance','strength','stamina',
    'composure','coachability','response_to_mistakes'
  ];
  goalkeeper_keys CONSTANT TEXT[] := ARRAY[
    'gk_positioning','gk_shot_stopping','gk_reflexes','gk_handling',
    'gk_one_v_one','gk_aerial_command','gk_sweeping','gk_distribution',
    'gk_communication','gk_decision_making','gk_composure',
    'gk_agility_explosiveness'
  ];
  defender_keys CONSTANT TEXT[] := ARRAY[
    'one_v_one_defending','tackling','defensive_positioning',
    'marking_covering','anticipation_interceptions','aerial_defending',
    'recovery_defending','pressing_defensive_transition',
    'communication_organisation','progression_from_defence',
    'crossing_attacking_support'
  ];
  midfielder_keys CONSTANT TEXT[] := ARRAY[
    'receiving_under_pressure','ball_retention','progressive_passing',
    'long_passing_switching','tempo_control','chance_creation',
    'anticipation_interceptions','defensive_positioning_covering',
    'pressing_counter_pressing','off_ball_movement_box_arrivals'
  ];
  attacker_keys CONSTANT TEXT[] := ARRAY[
    'finishing','shooting','attacking_movement','one_v_one_attacking',
    'runs_in_behind','chance_creation','crossing','link_up_play',
    'hold_up_play','aerial_ability','pressing_from_front'
  ];
BEGIN
  IF document IS NULL OR document = '{}'::jsonb THEN
    RETURN TRUE;
  END IF;

  IF JSONB_TYPEOF(document) <> 'object'
     OR NOT scoutlink_v4_rating_leaves_valid(document) THEN
    RETURN FALSE;
  END IF;

  IF group_name = 'Goalkeeper' THEN
    RETURN scoutlink_v4_keys_allowed(document, ARRAY['goalkeeper'])
      AND scoutlink_v4_keys_allowed(document->'goalkeeper', goalkeeper_keys);
  END IF;

  IF group_name = 'Defender' THEN
    RETURN scoutlink_v4_keys_allowed(document, ARRAY['general','defender'])
      AND scoutlink_v4_keys_allowed(document->'general', general_keys)
      AND scoutlink_v4_keys_allowed(document->'defender', defender_keys);
  END IF;

  IF group_name = 'Midfielder' THEN
    RETURN scoutlink_v4_keys_allowed(document, ARRAY['general','midfielder'])
      AND scoutlink_v4_keys_allowed(document->'general', general_keys)
      AND scoutlink_v4_keys_allowed(document->'midfielder', midfielder_keys);
  END IF;

  IF group_name = 'Attacker' THEN
    RETURN scoutlink_v4_keys_allowed(document, ARRAY['general','attacker'])
      AND scoutlink_v4_keys_allowed(document->'general', general_keys)
      AND scoutlink_v4_keys_allowed(document->'attacker', attacker_keys);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION scoutlink_v4_to_ten(value NUMERIC)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN value IS NULL OR value <= 0 THEN NULL
    WHEN value <= 10 THEN GREATEST(1, LEAST(10, ROUND(value)::integer))
    ELSE GREATEST(1, LEAST(10, ROUND(value / 10.0)::integer))
  END;
$$;

-- ---------------------------------------------------------------------------
-- Conservative legacy backfill
-- Missing new evidence remains missing. Values are not invented.
-- ---------------------------------------------------------------------------

UPDATE players
SET attribute_ratings =
  CASE
    WHEN position_group::text = 'Goalkeeper' THEN
      JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
        'goalkeeper', JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
          'gk_positioning', scoutlink_v4_to_ten(gk_positioning),
          'gk_shot_stopping', scoutlink_v4_to_ten(
            CASE
              WHEN gk_diving IS NULL THEN gk_reflexes
              WHEN gk_reflexes IS NULL THEN gk_diving
              ELSE (gk_diving + gk_reflexes) / 2
            END
          ),
          'gk_reflexes', scoutlink_v4_to_ten(gk_reflexes),
          'gk_handling', scoutlink_v4_to_ten(gk_handling),
          'gk_one_v_one', scoutlink_v4_to_ten(
            CASE
              WHEN gk_reflexes IS NULL THEN gk_positioning
              WHEN gk_positioning IS NULL THEN gk_reflexes
              ELSE (gk_reflexes + gk_positioning) / 2
            END
          ),
          'gk_aerial_command', scoutlink_v4_to_ten(
            CASE
              WHEN gk_handling IS NULL THEN gk_communication
              WHEN gk_communication IS NULL THEN gk_handling
              ELSE (gk_handling + gk_communication) / 2
            END
          ),
          'gk_sweeping', scoutlink_v4_to_ten(gk_sweeping),
          'gk_distribution', scoutlink_v4_to_ten(
            CASE
              WHEN gk_distribution IS NULL THEN gk_kicking
              WHEN gk_kicking IS NULL THEN gk_distribution
              ELSE (gk_distribution + gk_kicking) / 2
            END
          ),
          'gk_communication', scoutlink_v4_to_ten(gk_communication),
          'gk_decision_making', scoutlink_v4_to_ten(gk_positioning),
          'gk_composure', scoutlink_v4_to_ten(composure),
          'gk_agility_explosiveness', scoutlink_v4_to_ten(
            CASE
              WHEN agility IS NULL THEN gk_reflexes
              WHEN gk_reflexes IS NULL THEN agility
              ELSE (agility + gk_reflexes) / 2
            END
          )
        ))
      ))
    ELSE
      JSONB_STRIP_NULLS(
        JSONB_BUILD_OBJECT(
          'general', JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
            'first_touch', scoutlink_v4_to_ten(
              CASE
                WHEN dribbling IS NULL THEN composure
                WHEN composure IS NULL THEN dribbling
                ELSE dribbling * 0.7 + composure * 0.3
              END
            ),
            'passing', scoutlink_v4_to_ten(passing),
            'dribbling', scoutlink_v4_to_ten(dribbling),
            'awareness', scoutlink_v4_to_ten(
              CASE
                WHEN vision IS NULL THEN positioning
                WHEN positioning IS NULL THEN vision
                ELSE vision * 0.65 + positioning * 0.35
              END
            ),
            'pace', scoutlink_v4_to_ten(pace),
            'agility_balance', scoutlink_v4_to_ten(agility),
            'strength', scoutlink_v4_to_ten(strength),
            'stamina', scoutlink_v4_to_ten(stamina),
            'composure', scoutlink_v4_to_ten(composure)
          )),
          LOWER(position_group::text), CASE
            WHEN position_group::text = 'Defender' THEN
              JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
                'one_v_one_defending', scoutlink_v4_to_ten(
                  CASE
                    WHEN defending IS NULL THEN tackling
                    WHEN tackling IS NULL THEN defending
                    ELSE defending * 0.55 + tackling * 0.45
                  END
                ),
                'tackling', scoutlink_v4_to_ten(tackling),
                'defensive_positioning', scoutlink_v4_to_ten(positioning),
                'marking_covering', scoutlink_v4_to_ten(
                  CASE
                    WHEN defending IS NULL THEN positioning
                    WHEN positioning IS NULL THEN defending
                    ELSE defending * 0.55 + positioning * 0.45
                  END
                ),
                'anticipation_interceptions', scoutlink_v4_to_ten(vision),
                'aerial_defending', scoutlink_v4_to_ten(
                  CASE
                    WHEN heading IS NULL THEN jumping
                    WHEN jumping IS NULL THEN heading
                    ELSE heading * 0.6 + jumping * 0.4
                  END
                ),
                'recovery_defending', scoutlink_v4_to_ten(
                  CASE
                    WHEN pace IS NULL THEN positioning
                    WHEN positioning IS NULL THEN pace
                    ELSE pace * 0.55 + positioning * 0.45
                  END
                ),
                'pressing_defensive_transition', scoutlink_v4_to_ten(
                  CASE
                    WHEN stamina IS NULL THEN defending
                    WHEN defending IS NULL THEN stamina
                    ELSE stamina * 0.55 + defending * 0.45
                  END
                ),
                'progression_from_defence', scoutlink_v4_to_ten(
                  CASE
                    WHEN passing IS NULL THEN dribbling
                    WHEN dribbling IS NULL THEN passing
                    ELSE passing * 0.6 + dribbling * 0.4
                  END
                ),
                'crossing_attacking_support', scoutlink_v4_to_ten(crossing)
              ))
            WHEN position_group::text = 'Midfielder' THEN
              JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
                'receiving_under_pressure', scoutlink_v4_to_ten(
                  (COALESCE(composure, 0) + COALESCE(dribbling, 0) + COALESCE(passing, 0))
                  / NULLIF((composure IS NOT NULL)::int + (dribbling IS NOT NULL)::int + (passing IS NOT NULL)::int, 0)
                ),
                'ball_retention', scoutlink_v4_to_ten(
                  (COALESCE(composure, 0) + COALESCE(passing, 0) + COALESCE(dribbling, 0))
                  / NULLIF((composure IS NOT NULL)::int + (passing IS NOT NULL)::int + (dribbling IS NOT NULL)::int, 0)
                ),
                'progressive_passing', scoutlink_v4_to_ten(
                  CASE
                    WHEN passing IS NULL THEN vision
                    WHEN vision IS NULL THEN passing
                    ELSE passing * 0.65 + vision * 0.35
                  END
                ),
                'long_passing_switching', scoutlink_v4_to_ten(
                  CASE
                    WHEN passing IS NULL THEN vision
                    WHEN vision IS NULL THEN passing
                    ELSE passing * 0.6 + vision * 0.4
                  END
                ),
                'tempo_control', scoutlink_v4_to_ten(
                  (COALESCE(composure, 0) + COALESCE(vision, 0) + COALESCE(passing, 0))
                  / NULLIF((composure IS NOT NULL)::int + (vision IS NOT NULL)::int + (passing IS NOT NULL)::int, 0)
                ),
                'chance_creation', scoutlink_v4_to_ten(
                  CASE
                    WHEN vision IS NULL THEN passing
                    WHEN passing IS NULL THEN vision
                    ELSE vision * 0.55 + passing * 0.45
                  END
                ),
                'anticipation_interceptions', scoutlink_v4_to_ten(vision),
                'defensive_positioning_covering', scoutlink_v4_to_ten(
                  CASE
                    WHEN positioning IS NULL THEN defending
                    WHEN defending IS NULL THEN positioning
                    ELSE positioning * 0.55 + defending * 0.45
                  END
                ),
                'pressing_counter_pressing', scoutlink_v4_to_ten(
                  CASE
                    WHEN stamina IS NULL THEN positioning
                    WHEN positioning IS NULL THEN stamina
                    ELSE stamina * 0.55 + positioning * 0.45
                  END
                ),
                'off_ball_movement_box_arrivals', scoutlink_v4_to_ten(
                  CASE
                    WHEN positioning IS NULL THEN stamina
                    WHEN stamina IS NULL THEN positioning
                    ELSE positioning * 0.6 + stamina * 0.4
                  END
                )
              ))
            ELSE
              JSONB_STRIP_NULLS(JSONB_BUILD_OBJECT(
                'finishing', scoutlink_v4_to_ten(
                  CASE
                    WHEN shooting IS NULL THEN composure
                    WHEN composure IS NULL THEN shooting
                    ELSE shooting * 0.7 + composure * 0.3
                  END
                ),
                'shooting', scoutlink_v4_to_ten(shooting),
                'attacking_movement', scoutlink_v4_to_ten(
                  CASE
                    WHEN positioning IS NULL THEN vision
                    WHEN vision IS NULL THEN positioning
                    ELSE positioning * 0.7 + vision * 0.3
                  END
                ),
                'one_v_one_attacking', scoutlink_v4_to_ten(
                  (COALESCE(dribbling, 0) + COALESCE(agility, 0) + COALESCE(pace, 0))
                  / NULLIF((dribbling IS NOT NULL)::int + (agility IS NOT NULL)::int + (pace IS NOT NULL)::int, 0)
                ),
                'runs_in_behind', scoutlink_v4_to_ten(
                  CASE
                    WHEN pace IS NULL THEN positioning
                    WHEN positioning IS NULL THEN pace
                    ELSE pace * 0.55 + positioning * 0.45
                  END
                ),
                'chance_creation', scoutlink_v4_to_ten(
                  CASE
                    WHEN vision IS NULL THEN passing
                    WHEN passing IS NULL THEN vision
                    ELSE vision * 0.55 + passing * 0.45
                  END
                ),
                'crossing', scoutlink_v4_to_ten(crossing),
                'link_up_play', scoutlink_v4_to_ten(
                  (COALESCE(passing, 0) + COALESCE(composure, 0) + COALESCE(vision, 0))
                  / NULLIF((passing IS NOT NULL)::int + (composure IS NOT NULL)::int + (vision IS NOT NULL)::int, 0)
                ),
                'hold_up_play', scoutlink_v4_to_ten(
                  CASE
                    WHEN strength IS NULL THEN composure
                    WHEN composure IS NULL THEN strength
                    ELSE strength * 0.55 + composure * 0.45
                  END
                ),
                'aerial_ability', scoutlink_v4_to_ten(
                  (COALESCE(heading, 0) + COALESCE(jumping, 0) + COALESCE(strength, 0))
                  / NULLIF((heading IS NOT NULL)::int + (jumping IS NOT NULL)::int + (strength IS NOT NULL)::int, 0)
                ),
                'pressing_from_front', scoutlink_v4_to_ten(
                  (COALESCE(stamina, 0) + COALESCE(pace, 0) + COALESCE(positioning, 0))
                  / NULLIF((stamina IS NOT NULL)::int + (pace IS NOT NULL)::int + (positioning IS NOT NULL)::int, 0)
                )
              ))
          END
        )
      )
  END,
  attribute_rating_scale = 'ten',
  attribute_assessment_version = COALESCE(attribute_assessment_version, 'legacy-v3-backfill'),
  attribute_assessed_at = COALESCE(attribute_assessed_at, updated_at, created_at)
WHERE attribute_ratings = '{}'::jsonb OR attribute_ratings IS NULL;

DO $$
BEGIN
  IF TO_REGCLASS('public.players') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.players'::regclass
         AND conname = 'players_v4_position_check'
     ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_v4_position_check
      CHECK (
        primary_position IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
        AND specific_position IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
      ) NOT VALID;
  END IF;

  IF TO_REGCLASS('public.players') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.players'::regclass
         AND conname = 'players_v4_rating_scale_check'
     ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_v4_rating_scale_check
      CHECK (attribute_rating_scale = 'ten') NOT VALID;
  END IF;

  IF TO_REGCLASS('public.players') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.players'::regclass
         AND conname = 'players_v4_attribute_ratings_check'
     ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_v4_attribute_ratings_check
      CHECK (
        scoutlink_v4_player_ratings_valid(position_group::text, attribute_ratings)
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_players_v4_position
  ON players (position_group, primary_position);

CREATE INDEX IF NOT EXISTS idx_players_v4_attribute_ratings
  ON players USING GIN (attribute_ratings);

CREATE INDEX IF NOT EXISTS idx_players_v4_scoring_version
  ON players (scoring_version);

COMMENT ON COLUMN players.attribute_ratings IS
  'Nested V4 Coach assessment. Observed values are whole integers 1-10. JSON null or a missing key means Not observed.';
COMMENT ON COLUMN players.attribute_rating_scale IS
  'The active ScoutLink V4 input scale. Must be ten.';
COMMENT ON COLUMN players.evidence_confidence IS
  'Completeness, match sample, recency, source agreement and provisional status. Confidence does not add ability points.';

-- ---------------------------------------------------------------------------
-- Match facts: historical position-aware evidence snapshot
-- ---------------------------------------------------------------------------

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

UPDATE match_facts
SET
  rating_scale = 'ten',
  scoring_version = COALESCE(NULLIF(scoring_version, ''), 'v4.0.0'),
  position_played = CASE UPPER(COALESCE(position_played, ''))
    WHEN 'CDM' THEN 'DM'
    WHEN 'CAM' THEN 'AM'
    WHEN 'B2B' THEN 'CM'
    WHEN 'RCM' THEN 'CM'
    WHEN 'LCM' THEN 'CM'
    WHEN 'RDM' THEN 'DM'
    WHEN 'LDM' THEN 'DM'
    WHEN 'RAM' THEN 'AM'
    WHEN 'LAM' THEN 'AM'
    WHEN 'LS' THEN 'ST'
    WHEN 'RS' THEN 'ST'
    WHEN 'SS' THEN 'CF'
    WHEN 'BPD' THEN 'CB'
    WHEN 'RCB' THEN 'CB'
    WHEN 'LCB' THEN 'CB'
    WHEN 'SW' THEN 'CB'
    ELSE NULLIF(UPPER(COALESCE(position_played, '')), '')
  END;

DO $$
BEGIN
  IF TO_REGCLASS('public.match_facts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.match_facts'::regclass
         AND conname = 'match_facts_v4_position_check'
     ) THEN
    ALTER TABLE public.match_facts
      ADD CONSTRAINT match_facts_v4_position_check
      CHECK (
        position_played IS NULL OR
        position_played IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
      ) NOT VALID;
  END IF;

  IF TO_REGCLASS('public.match_facts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.match_facts'::regclass
         AND conname = 'match_facts_v4_rating_check'
     ) THEN
    ALTER TABLE public.match_facts
      ADD CONSTRAINT match_facts_v4_rating_check
      CHECK (
        rating_scale = 'ten'
        AND scoutlink_v4_rating_leaves_valid(attribute_ratings)
      ) NOT VALID;
  END IF;

  IF TO_REGCLASS('public.match_facts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.match_facts'::regclass
         AND conname = 'match_facts_v4_format_check'
     ) THEN
    ALTER TABLE public.match_facts
      ADD CONSTRAINT match_facts_v4_format_check
      CHECK (
        match_format IS NULL OR
        match_format IN ('3v3','5v5','7v7','9v9','11v11')
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_facts_v4_position_date
  ON match_facts (player_id, position_played, match_date DESC);

CREATE INDEX IF NOT EXISTS idx_match_facts_v4_attribute_ratings
  ON match_facts USING GIN (attribute_ratings);

-- ---------------------------------------------------------------------------
-- Scout setup and compatibility output
-- ---------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_compatibility_scores_v4_version
  ON compatibility_scores (scoring_version);

CREATE INDEX IF NOT EXISTS idx_compatibility_scores_v4_fingerprint
  ON compatibility_scores (input_fingerprint);

-- ---------------------------------------------------------------------------
-- Prediction audit fields
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS predictions_log
  ADD COLUMN IF NOT EXISTS input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scout_setup_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS player_scoring_version TEXT,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'v4.0.0';

-- Validate rows after the canonical backfill.
DO $$
BEGIN
  IF TO_REGCLASS('public.players') IS NOT NULL THEN
    ALTER TABLE public.players VALIDATE CONSTRAINT players_v4_position_check;
    ALTER TABLE public.players VALIDATE CONSTRAINT players_v4_rating_scale_check;
    ALTER TABLE public.players VALIDATE CONSTRAINT players_v4_attribute_ratings_check;
  END IF;

  IF TO_REGCLASS('public.match_facts') IS NOT NULL THEN
    ALTER TABLE public.match_facts VALIDATE CONSTRAINT match_facts_v4_position_check;
    ALTER TABLE public.match_facts VALIDATE CONSTRAINT match_facts_v4_rating_check;
    ALTER TABLE public.match_facts VALIDATE CONSTRAINT match_facts_v4_format_check;
  END IF;
END $$;

COMMIT;

-- Deliberate safety choices:
-- 1. Legacy scalar attribute columns are retained for rollback and transitional reads.
-- 2. Missing new attributes remain Not observed; the migration does not invent evidence.
-- 3. Complete fictional demo attributes are applied by backend/scripts/recalculatePlayersV4.js.
-- 4. Currency value and salary remain null without verified market anchors.
