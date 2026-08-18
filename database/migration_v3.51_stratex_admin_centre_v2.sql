-- Stratex Admin Centre V2 team archive support.
-- Adds only lifecycle fields required by the supplied Admin Centre design.
-- Existing teams remain active.

begin;

alter table public.school_academy_teams
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_reason text;

create index if not exists school_academy_teams_active_index
  on public.school_academy_teams (is_active, team_name);

commit;
