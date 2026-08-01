-- ScoutLink V4 safe rollout 1/4: player schema and canonical positions.
BEGIN;
ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS alternative_positions TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS attribute_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attribute_rating_scale TEXT NOT NULL DEFAULT 'ten',
  ADD COLUMN IF NOT EXISTS attribute_assessment_version TEXT,
  ADD COLUMN IF NOT EXISTS attribute_assessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attribute_assessed_by UUID,
  ADD COLUMN IF NOT EXISTS evidence_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS prediction_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS overall_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS position_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS value_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring_version TEXT NOT NULL DEFAULT 'v4.0.0';

ALTER TABLE IF EXISTS players
  ALTER COLUMN attribute_rating_scale SET DEFAULT 'ten',
  ALTER COLUMN scoring_version SET DEFAULT 'v4.0.0';

CREATE OR REPLACE FUNCTION scoutlink_v4_normalise_position(raw_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE UPPER(BTRIM(COALESCE(raw_value,'')))
    WHEN 'CDM' THEN 'DM' WHEN 'CAM' THEN 'AM' WHEN 'B2B' THEN 'CM'
    WHEN 'RCM' THEN 'CM' WHEN 'LCM' THEN 'CM' WHEN 'RDM' THEN 'DM'
    WHEN 'LDM' THEN 'DM' WHEN 'RAM' THEN 'AM' WHEN 'LAM' THEN 'AM'
    WHEN 'LS' THEN 'ST' WHEN 'RS' THEN 'ST' WHEN 'SS' THEN 'CF'
    WHEN 'BPD' THEN 'CB' WHEN 'RCB' THEN 'CB' WHEN 'LCB' THEN 'CB'
    WHEN 'SW' THEN 'CB'
    ELSE NULLIF(UPPER(BTRIM(COALESCE(raw_value,''))), '')
  END;
$$;

UPDATE players
SET
  primary_position = scoutlink_v4_normalise_position(COALESCE(primary_position,specific_position)),
  specific_position = scoutlink_v4_normalise_position(COALESCE(specific_position,primary_position)),
  attribute_rating_scale = 'ten',
  scoring_version = CASE WHEN scoring_version IS NULL OR BTRIM(scoring_version) = '' THEN 'v4.0.0' ELSE scoring_version END;

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
    SELECT DISTINCT canonical
    FROM UNNEST(COALESCE(positions,'{}'::text[]) || ARRAY[primary_position]) item(raw_position)
    CROSS JOIN LATERAL (SELECT scoutlink_v4_normalise_position(raw_position) AS canonical) normalised
    WHERE canonical IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
  ),
  alternative_positions = ARRAY(
    SELECT DISTINCT canonical
    FROM UNNEST(COALESCE(positions,'{}'::text[])) item(raw_position)
    CROSS JOIN LATERAL (SELECT scoutlink_v4_normalise_position(raw_position) AS canonical) normalised
    WHERE canonical IN ('GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST')
      AND canonical IS DISTINCT FROM primary_position
  );

CREATE OR REPLACE FUNCTION scoutlink_v4_to_ten(value NUMERIC)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN value IS NULL OR value <= 0 THEN NULL
    WHEN value <= 10 THEN GREATEST(1,LEAST(10,ROUND(value)::integer))
    ELSE GREATEST(1,LEAST(10,ROUND(value / 10.0)::integer))
  END;
$$;
COMMIT;
