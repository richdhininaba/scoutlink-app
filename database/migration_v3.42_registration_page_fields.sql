-- ScoutLink Registration and Verification V3
-- Migration version v3.42

BEGIN;

ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS registration_version text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS team_type text,
  ADD COLUMN IF NOT EXISTS primary_age_group text,
  ADD COLUMN IF NOT EXISTS average_club_size text,
  ADD COLUMN IF NOT EXISTS team_website text,
  ADD COLUMN IF NOT EXISTS number_of_teams text,
  ADD COLUMN IF NOT EXISTS organisation_type text,
  ADD COLUMN IF NOT EXISTS scouting_team_name text,
  ADD COLUMN IF NOT EXISTS primary_scouting_region text,
  ADD COLUMN IF NOT EXISTS organisation_website text,
  ADD COLUMN IF NOT EXISTS expected_scout_users text,
  ADD COLUMN IF NOT EXISTS preferred_scout_plan text,
  ADD COLUMN IF NOT EXISTS expected_search_activity text,
  ADD COLUMN IF NOT EXISTS current_scouting_role text;

CREATE INDEX IF NOT EXISTS
  idx_registration_requests_preferred_plan
ON public.registration_requests (
  account_type,
  preferred_scout_plan,
  status
);

CREATE INDEX IF NOT EXISTS
  idx_registration_requests_registration_version
ON public.registration_requests (
  registration_version,
  created_at DESC
);

COMMIT;
