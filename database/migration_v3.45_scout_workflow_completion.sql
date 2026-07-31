-- ScoutLink migration v3.45
-- Completes the Scout interest, notes, decisions and collaboration workflow.
-- Run once in Supabase SQL Editor before deploying the backend route.

BEGIN;

ALTER TABLE recruitment_pipeline
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_scout_id UUID REFERENCES scouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interest_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_registered_by UUID REFERENCES scouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_status TEXT,
  ADD COLUMN IF NOT EXISTS decision_summary TEXT,
  ADD COLUMN IF NOT EXISTS decision_updated_at TIMESTAMPTZ;

UPDATE recruitment_pipeline
SET
  is_active = COALESCE(is_active, TRUE),
  interest_registered_at = COALESCE(interest_registered_at, created_at),
  interest_registered_by = COALESCE(interest_registered_by, scout_id)
WHERE
  interest_registered_at IS NULL
  OR interest_registered_by IS NULL;

CREATE TABLE IF NOT EXISTS scout_player_workflow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
  scout_team_id UUID REFERENCES scout_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES recruitment_pipeline(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('note', 'decision')),
  content TEXT NOT NULL CHECK (char_length(btrim(content)) > 0),
  decision_value TEXT,
  shared_with UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scout_workflow_player
  ON scout_player_workflow_entries(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scout_workflow_pipeline
  ON scout_player_workflow_entries(pipeline_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scout_workflow_scout
  ON scout_player_workflow_entries(scout_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scout_workflow_team
  ON scout_player_workflow_entries(scout_team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scout_workflow_shared_with
  ON scout_player_workflow_entries USING GIN(shared_with);

-- Preserve existing free-text pipeline notes in the new shared workflow history.
INSERT INTO scout_player_workflow_entries (
  scout_id,
  scout_team_id,
  player_id,
  pipeline_id,
  entry_type,
  content,
  metadata,
  created_by,
  created_at,
  updated_at
)
SELECT
  rp.scout_id,
  rp.scout_team_id,
  rp.player_id,
  rp.id,
  'note',
  btrim(rp.notes),
  jsonb_build_object(
    'legacySource', 'recruitment_pipeline',
    'legacyId', rp.id
  ),
  rp.scout_id,
  COALESCE(rp.created_at, NOW()),
  COALESCE(rp.updated_at, rp.created_at, NOW())
FROM recruitment_pipeline rp
WHERE
  NULLIF(btrim(rp.notes), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM scout_player_workflow_entries existing
    WHERE existing.metadata ->> 'legacySource' = 'recruitment_pipeline'
      AND existing.metadata ->> 'legacyId' = rp.id::TEXT
  );

-- Preserve decisions already recorded through the existing Scout intelligence route.
INSERT INTO scout_player_workflow_entries (
  scout_id,
  scout_team_id,
  player_id,
  pipeline_id,
  entry_type,
  content,
  decision_value,
  metadata,
  created_by,
  created_at,
  updated_at
)
SELECT
  sd.scout_id,
  sd.scout_team_id,
  sd.player_id,
  sd.pipeline_id,
  'decision',
  COALESCE(
    NULLIF(btrim(sd.rationale), ''),
    NULLIF(btrim(sd.decision), ''),
    'Decision recorded'
  ),
  NULLIF(btrim(sd.decision), ''),
  jsonb_build_object(
    'legacySource', 'scout_decisions',
    'legacyId', sd.id,
    'reasonCode', sd.reason_code,
    'nextAction', sd.next_action,
    'dueAt', sd.due_at
  ),
  sd.scout_id,
  COALESCE(sd.created_at, NOW()),
  COALESCE(sd.created_at, NOW())
FROM scout_decisions sd
WHERE NOT EXISTS (
  SELECT 1
  FROM scout_player_workflow_entries existing
  WHERE existing.metadata ->> 'legacySource' = 'scout_decisions'
    AND existing.metadata ->> 'legacyId' = sd.id::TEXT
);

CREATE INDEX IF NOT EXISTS idx_pipeline_active_usage
  ON recruitment_pipeline(scout_team_id, scout_id, is_active);

DROP TRIGGER IF EXISTS trg_scout_player_workflow_entries
  ON scout_player_workflow_entries;

CREATE TRIGGER trg_scout_player_workflow_entries
BEFORE UPDATE ON scout_player_workflow_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

ALTER TABLE scout_player_workflow_entries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON scout_player_workflow_entries FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON scout_player_workflow_entries
  TO service_role;

DROP POLICY IF EXISTS service_role_all_scout_player_workflow_entries
  ON scout_player_workflow_entries;

CREATE POLICY service_role_all_scout_player_workflow_entries
  ON scout_player_workflow_entries
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ScoutLink writes through the server-side Supabase service role.
-- Direct anonymous and authenticated browser writes remain blocked.

COMMIT;
