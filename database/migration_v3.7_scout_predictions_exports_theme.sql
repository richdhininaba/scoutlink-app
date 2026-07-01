-- Scout experience: team location, saved prediction/export history, and theme support.

alter table public.school_academy_teams
  add column if not exists city text,
  add column if not exists country text default 'England',
  add column if not exists address_line text,
  add column if not exists postcode text;

alter table public.fixtures
  add column if not exists city text,
  add column if not exists country text default 'England',
  add column if not exists venue_address text,
  add column if not exists venue_postcode text;

create table if not exists public.predictions_log (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid references public.scouts(id) on delete set null,
  scout_team_id uuid references public.scout_teams(id) on delete set null,
  player_id uuid references public.players(id) on delete cascade,
  prediction_type text not null,
  input_params jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_predictions_log_scout on public.predictions_log(scout_id, run_at desc);
create index if not exists idx_predictions_log_team on public.predictions_log(scout_team_id, run_at desc);
create index if not exists idx_predictions_log_player on public.predictions_log(player_id);

create table if not exists public.scout_exports (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid references public.scouts(id) on delete set null,
  scout_team_id uuid references public.scout_teams(id) on delete set null,
  player_id uuid references public.players(id) on delete cascade,
  prediction_log_id uuid references public.predictions_log(id) on delete set null,
  export_type text not null default 'PDF',
  source text not null default 'profile',
  file_name text,
  file_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_scout_exports_scout on public.scout_exports(scout_id, created_at desc);
create index if not exists idx_scout_exports_team on public.scout_exports(scout_team_id, created_at desc);
create index if not exists idx_scout_exports_player on public.scout_exports(player_id);

update public.school_academy_teams
set city = coalesce(city, 'London'),
    country = coalesce(country, 'England')
where team_name ilike '%Northgate%';

update public.fixtures
set city = coalesce(city, 'London'),
    country = coalesce(country, 'England')
where team_id in (
  select id from public.school_academy_teams where team_name ilike '%Northgate%'
);

update public.coaches
set is_super_user = true
where lower(email) = 'coach@test.scoutlink.com';
