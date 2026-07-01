-- ScoutLink demo experience isolation

alter table public.players add column if not exists is_demo boolean not null default false;
alter table public.coaches add column if not exists is_demo boolean not null default false;
alter table public.scouts add column if not exists is_demo boolean not null default false;
alter table public.stratex add column if not exists is_demo boolean not null default false;
alter table public.school_academy_teams add column if not exists is_demo boolean not null default false;
alter table public.scout_teams add column if not exists is_demo boolean not null default false;

create index if not exists idx_players_is_demo_active on public.players(is_demo, is_active);
create index if not exists idx_coaches_is_demo_active on public.coaches(is_demo, is_active);
create index if not exists idx_scouts_is_demo_active on public.scouts(is_demo, is_active);
create index if not exists idx_school_academy_teams_is_demo on public.school_academy_teams(is_demo);
create index if not exists idx_scout_teams_is_demo on public.scout_teams(is_demo);

update public.players
set is_demo = true
where lower(email) = 'player@test.scoutlink.com';

update public.coaches
set is_demo = true
where lower(email) = 'coach@test.scoutlink.com';

update public.scouts
set is_demo = true
where lower(email) = 'scout@test.scoutlink.com';

update public.school_academy_teams
set is_demo = true
where lower(team_name) = 'scoutlink demo non pro academy';

update public.scout_teams
set is_demo = true
where lower(team_name) = 'scoutlink demo scout team';
