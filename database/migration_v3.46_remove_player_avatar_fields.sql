-- ScoutLink migration v3.46
-- Remove the obsolete generated player-avatar data model.
-- Deploy the avatar-safe backend bridge before running this migration.

BEGIN;

ALTER TABLE public.players
  DROP COLUMN IF EXISTS avatar_config,
  DROP COLUMN IF EXISTS avatar_url,
  DROP COLUMN IF EXISTS avatar_seed,
  DROP COLUMN IF EXISTS avatar_style;

COMMENT ON TABLE public.players IS
  'ScoutLink football player records. Player identity is represented in the product by initials; generated avatar data is not stored.';

NOTIFY pgrst, 'reload schema';

COMMIT;
