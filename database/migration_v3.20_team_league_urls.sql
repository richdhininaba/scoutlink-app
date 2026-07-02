-- Add editable league and team URL metadata for ScoutLink teams.
alter table public.league_options add column if not exists fulltime_url text;
alter table public.league_options add column if not exists url_status text;
alter table public.league_options add column if not exists admin_editable boolean default true;
alter table public.league_options add column if not exists team_website_url text;
alter table public.league_options add column if not exists team_website_admin_editable boolean default true;
alter table public.league_options add column if not exists notes text;

alter table public.school_academy_teams add column if not exists league_name text;
alter table public.school_academy_teams add column if not exists league_fulltime_url text;
alter table public.school_academy_teams add column if not exists team_website_url text;

alter table public.scout_teams add column if not exists league_name text;
alter table public.scout_teams add column if not exists league_fulltime_url text;
alter table public.scout_teams add column if not exists team_website_url text;

with source(name, fulltime_url, url_status, admin_editable, team_website_url, team_website_admin_editable, notes) as (
values
  ('Camden & Islington Youth Football League', 'https://fulltime.thefa.com/index.html?league=331847893', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Camden Youth League', 'https://fulltime.thefa.com/index.html?league=163194129', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Central Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('East London & Essex Junior League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Hackney Marshes Saturday Youth Football League', 'https://fulltime.thefa.com/index.html?league=152519117', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('London County Saturday Youth Football League', 'https://fulltime.thefa.com/index.html?league=1428060', 'unverified_existing_candidate', true, NULL, true, 'Candidate from prior lookup. Admin must be able to edit.'),
  ('Maccabi Junior Youth Football League', 'https://fulltime.thefa.com/index.html?league=310704552', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Maccabi GB Junior (Youth) Football League.'),
  ('Regents Park Youth League', 'https://fulltime.thefa.com/index.html?league=843990453', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('South East London & Kent Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Tandridge Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'Standalone official site exists, but no Full-Time URL confirmed here.'),
  ('North London Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('London Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Girls Super League', 'https://fulltime.thefa.com/index.html?league=512367957', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Girls Super League LDN.'),
  ('London Inclusion Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Next Generation Super League', 'https://fulltime.thefa.com/index.html?league=1524517', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Community Football League', NULL, 'needs_admin_entry', true, NULL, true, 'Name too generic to safely map without admin check.'),
  ('Harrow Youth Football League', 'https://fulltime.thefa.com/index.html?league=1144601', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Harrow Soccer Combination', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Middlesex Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Capital Girls League', 'https://fulltime.thefa.com/index.html?league=5730235', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Greater London Women''s Football League', 'https://fulltime.thefa.com/index.html?league=652739866', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Watford Friendly League', 'https://fulltime.thefa.com/index.html?league=861969338', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Hertfordshire Girls Football Partnership League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Herts Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('West Herts Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Manchester Youth Super League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('East Manchester Junior Football League', 'https://fulltime.thefa.com/index.html?league=8335132', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: East Manchester Junior Football League (Charter Standard League).'),
  ('North Bury Junior Football League', 'https://fulltime.thefa.com/index.html?league=2323685', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Bolton Bury & District Football League', 'https://fulltime.thefa.com/index.html?league=760017', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Bolton, Bury and District Football League.'),
  ('Timperley and District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Stockport Metropolitan Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('South Manchester Girls League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Salford and Districts Football League', 'https://fulltime.thefa.com/index.html?league=8880379', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: SDFL - Salford & Districts Football League.'),
  ('North Manchester Girls Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Manchester Youth & Mini Soccer League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Wigan & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Oldham Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Rochdale & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Tameside Junior Football League', 'https://fulltime.thefa.com/index.html?league=9327683', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: TAMESIDE FOOTBALL LEAGUE.'),
  ('Leigh & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.')
), inserted as (
  insert into public.league_options (name, fulltime_url, url_status, admin_editable, team_website_url, team_website_admin_editable, notes)
  select s.name, s.fulltime_url, s.url_status, s.admin_editable, s.team_website_url, s.team_website_admin_editable, s.notes
  from source s
  where not exists (
    select 1 from public.league_options lo where lower(lo.name) = lower(s.name)
  )
  returning name
)
update public.league_options lo
set fulltime_url = coalesce(lo.fulltime_url, s.fulltime_url),
    url_status = coalesce(lo.url_status, s.url_status),
    admin_editable = coalesce(lo.admin_editable, true),
    team_website_admin_editable = coalesce(lo.team_website_admin_editable, true),
    notes = coalesce(lo.notes, s.notes)
from source s
where lower(lo.name) = lower(s.name);

update public.school_academy_teams
set league_name = coalesce(nullif(league_name, ''), nullif(league, ''));

update public.scout_teams
set league_name = coalesce(nullif(league_name, ''), nullif(league, ''));

with source(name, fulltime_url, url_status, admin_editable, team_website_url, team_website_admin_editable, notes) as (
values
  ('Camden & Islington Youth Football League', 'https://fulltime.thefa.com/index.html?league=331847893', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Camden Youth League', 'https://fulltime.thefa.com/index.html?league=163194129', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Central Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('East London & Essex Junior League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Hackney Marshes Saturday Youth Football League', 'https://fulltime.thefa.com/index.html?league=152519117', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('London County Saturday Youth Football League', 'https://fulltime.thefa.com/index.html?league=1428060', 'unverified_existing_candidate', true, NULL, true, 'Candidate from prior lookup. Admin must be able to edit.'),
  ('Maccabi Junior Youth Football League', 'https://fulltime.thefa.com/index.html?league=310704552', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Maccabi GB Junior (Youth) Football League.'),
  ('Regents Park Youth League', 'https://fulltime.thefa.com/index.html?league=843990453', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('South East London & Kent Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Tandridge Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'Standalone official site exists, but no Full-Time URL confirmed here.'),
  ('North London Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('London Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Girls Super League', 'https://fulltime.thefa.com/index.html?league=512367957', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Girls Super League LDN.'),
  ('London Inclusion Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Next Generation Super League', 'https://fulltime.thefa.com/index.html?league=1524517', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Community Football League', NULL, 'needs_admin_entry', true, NULL, true, 'Name too generic to safely map without admin check.'),
  ('Harrow Youth Football League', 'https://fulltime.thefa.com/index.html?league=1144601', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Harrow Soccer Combination', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Middlesex Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Capital Girls League', 'https://fulltime.thefa.com/index.html?league=5730235', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Greater London Women''s Football League', 'https://fulltime.thefa.com/index.html?league=652739866', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Watford Friendly League', 'https://fulltime.thefa.com/index.html?league=861969338', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Hertfordshire Girls Football Partnership League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Herts Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('West Herts Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Manchester Youth Super League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('East Manchester Junior Football League', 'https://fulltime.thefa.com/index.html?league=8335132', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: East Manchester Junior Football League (Charter Standard League).'),
  ('North Bury Junior Football League', 'https://fulltime.thefa.com/index.html?league=2323685', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Bolton Bury & District Football League', 'https://fulltime.thefa.com/index.html?league=760017', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Bolton, Bury and District Football League.'),
  ('Timperley and District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Stockport Metropolitan Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('South Manchester Girls League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Salford and Districts Football League', 'https://fulltime.thefa.com/index.html?league=8880379', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: SDFL - Salford & Districts Football League.'),
  ('North Manchester Girls Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Manchester Youth & Mini Soccer League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Wigan & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Oldham Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Rochdale & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Tameside Junior Football League', 'https://fulltime.thefa.com/index.html?league=9327683', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: TAMESIDE FOOTBALL LEAGUE.'),
  ('Leigh & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.')
)
update public.school_academy_teams t
set league_fulltime_url = s.fulltime_url
from source s
where t.league_fulltime_url is null
  and s.fulltime_url is not null
  and lower(coalesce(t.league_name, t.league, '')) = lower(s.name);

with source(name, fulltime_url, url_status, admin_editable, team_website_url, team_website_admin_editable, notes) as (
values
  ('Camden & Islington Youth Football League', 'https://fulltime.thefa.com/index.html?league=331847893', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Camden Youth League', 'https://fulltime.thefa.com/index.html?league=163194129', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Central Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('East London & Essex Junior League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Hackney Marshes Saturday Youth Football League', 'https://fulltime.thefa.com/index.html?league=152519117', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('London County Saturday Youth Football League', 'https://fulltime.thefa.com/index.html?league=1428060', 'unverified_existing_candidate', true, NULL, true, 'Candidate from prior lookup. Admin must be able to edit.'),
  ('Maccabi Junior Youth Football League', 'https://fulltime.thefa.com/index.html?league=310704552', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Maccabi GB Junior (Youth) Football League.'),
  ('Regents Park Youth League', 'https://fulltime.thefa.com/index.html?league=843990453', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('South East London & Kent Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Tandridge Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'Standalone official site exists, but no Full-Time URL confirmed here.'),
  ('North London Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('London Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Girls Super League', 'https://fulltime.thefa.com/index.html?league=512367957', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Girls Super League LDN.'),
  ('London Inclusion Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Next Generation Super League', 'https://fulltime.thefa.com/index.html?league=1524517', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Community Football League', NULL, 'needs_admin_entry', true, NULL, true, 'Name too generic to safely map without admin check.'),
  ('Harrow Youth Football League', 'https://fulltime.thefa.com/index.html?league=1144601', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Harrow Soccer Combination', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Middlesex Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Capital Girls League', 'https://fulltime.thefa.com/index.html?league=5730235', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Greater London Women''s Football League', 'https://fulltime.thefa.com/index.html?league=652739866', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Watford Friendly League', 'https://fulltime.thefa.com/index.html?league=861969338', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Hertfordshire Girls Football Partnership League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Herts Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('West Herts Youth League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Manchester Youth Super League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('East Manchester Junior Football League', 'https://fulltime.thefa.com/index.html?league=8335132', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: East Manchester Junior Football League (Charter Standard League).'),
  ('North Bury Junior Football League', 'https://fulltime.thefa.com/index.html?league=2323685', 'verified_fulltime', true, NULL, true, 'Exact Full-Time page verified.'),
  ('Bolton Bury & District Football League', 'https://fulltime.thefa.com/index.html?league=760017', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: Bolton, Bury and District Football League.'),
  ('Timperley and District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Stockport Metropolitan Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('South Manchester Girls League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Salford and Districts Football League', 'https://fulltime.thefa.com/index.html?league=8880379', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: SDFL - Salford & Districts Football League.'),
  ('North Manchester Girls Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Manchester Youth & Mini Soccer League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Wigan & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Oldham Youth Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Rochdale & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.'),
  ('Tameside Junior Football League', 'https://fulltime.thefa.com/index.html?league=9327683', 'verified_fulltime_name_variant', true, NULL, true, 'Full-Time listing name variant: TAMESIDE FOOTBALL LEAGUE.'),
  ('Leigh & District Junior Football League', NULL, 'needs_admin_entry', true, NULL, true, 'No Full-Time URL confirmed in this pass.')
)
update public.scout_teams t
set league_fulltime_url = s.fulltime_url
from source s
where t.league_fulltime_url is null
  and s.fulltime_url is not null
  and lower(coalesce(t.league_name, t.league, '')) = lower(s.name);
