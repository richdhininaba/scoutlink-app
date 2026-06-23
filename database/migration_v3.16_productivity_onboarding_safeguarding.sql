-- ScoutLink v3.16 - productivity, onboarding, safeguarding and test-data foundations

create extension if not exists pgcrypto;

create table if not exists public.league_options (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Youth Football',
  country text not null default 'England',
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists league_options_name_lower_idx on public.league_options (lower(name));

insert into public.league_options (name) values
('Camden & Islington Youth Football League'),
('Camden Youth League'),
('Central Youth League'),
('East London & Essex Junior League'),
('Hackney Marshes Saturday Youth Football League'),
('London County Saturday Youth Football League'),
('Maccabi Junior Youth Football League'),
('Regents Park Youth League'),
('South East London & Kent Youth League'),
('Tandridge Youth Football League'),
('North London Youth Football League'),
('London Youth League'),
('Girls Super League'),
('London Inclusion Football League'),
('Next Generation Super League'),
('Community Football League'),
('Harrow Youth Football League'),
('Harrow Soccer Combination'),
('Middlesex Youth Football League'),
('Capital Girls League'),
('Greater London Women''s Football League'),
('Watford Friendly League'),
('Hertfordshire Girls Football Partnership League'),
('Herts Youth League'),
('West Herts Youth League'),
('Manchester Youth Super League'),
('East Manchester Junior Football League'),
('North Bury Junior Football League'),
('Bolton Bury & District Football League'),
('Timperley and District Junior Football League'),
('Stockport Metropolitan Junior Football League'),
('South Manchester Girls League'),
('Salford and Districts Football League'),
('North Manchester Girls Football League'),
('Manchester Youth & Mini Soccer League'),
('Wigan & District Junior Football League'),
('Oldham Youth Football League'),
('Rochdale & District Junior Football League'),
('Tameside Junior Football League'),
('Leigh & District Junior Football League')
on conflict ((lower(name))) do update set is_active = true, updated_at = now();

alter table public.registration_requests
  add column if not exists safeguarding_review jsonb not null default '{}'::jsonb,
  add column if not exists safeguarding_documents jsonb not null default '[]'::jsonb;

create table if not exists public.scout_verification_reviews (
  id uuid primary key default gen_random_uuid(),
  registration_request_id uuid references public.registration_requests(id) on delete cascade,
  scout_id uuid references public.scouts(id) on delete set null,
  reviewed_by uuid references public.stratex(id) on delete set null,
  checklist jsonb not null default '{}'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  dbs_certificate_number text,
  dbs_issue_date date,
  dbs_level text,
  status text not null default 'held',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scout_verification_reviews_request_idx on public.scout_verification_reviews(registration_request_id);
create index if not exists scout_verification_reviews_scout_idx on public.scout_verification_reviews(scout_id);

alter table public.stratex
  add column if not exists job_title text,
  add column if not exists admin_role text,
  add column if not exists manager_id uuid references public.stratex(id) on delete set null,
  add column if not exists permissions text[] not null default '{}'::text[],
  add column if not exists annual_leave_days numeric not null default 25,
  add column if not exists contract_data jsonb not null default '{}'::jsonb;

create table if not exists public.stratex_time_off (
  id uuid primary key default gen_random_uuid(),
  stratex_id uuid not null references public.stratex(id) on delete cascade,
  leave_type text not null check (leave_type in ('annual_leave','sick_leave','other')),
  start_date date not null,
  end_date date not null,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.stratex_meetings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.stratex(id) on delete set null,
  title text not null,
  meeting_date timestamptz not null,
  location text,
  attendees uuid[] not null default '{}'::uuid[],
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  account_type text not null,
  user_id uuid not null,
  setup_wizard_completed boolean not null default false,
  product_tour_completed boolean not null default false,
  wizard_data jsonb not null default '{}'::jsonb,
  tour_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_type, user_id)
);

create table if not exists public.test_teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  team_type text not null default 'Non Pro Academy',
  city text not null default 'London',
  league text,
  created_at timestamptz not null default now()
);
create unique index if not exists test_teams_name_lower_idx on public.test_teams (lower(team_name));

create table if not exists public.test_players (
  id uuid primary key default gen_random_uuid(),
  test_team_id uuid references public.test_teams(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  age integer,
  age_group text,
  position text,
  foot text,
  overall_rating numeric,
  player_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.test_teams (team_name, city, league) values
('Northgate Demo Academy', 'London', 'London Youth League'),
('Camden Demo Colts', 'London', 'Camden Youth League'),
('Hackney Demo United', 'London', 'Hackney Marshes Saturday Youth Football League'),
('Harrow Demo Athletic', 'London', 'Harrow Youth Football League'),
('Southbank Demo Lions', 'London', 'South East London & Kent Youth League')
on conflict ((lower(team_name))) do update set city = excluded.city, league = excluded.league;

with teams as (
  select id, row_number() over (order by team_name) rn from public.test_teams
),
names as (
  select * from (values
    (1,'Ethan','Cole','ST'),(2,'Noah','Reed','CAM'),(3,'Jordan','Blake','CM'),(4,'Mason','Clarke','CB'),(5,'Alfie','Carter','RB'),
    (6,'Samuel','Price','RW'),(7,'Leo','Morgan','GK'),(8,'Oscar','Hayes','LB'),(9,'Theo','Brooks','DM'),(10,'Isaac','Stone','LW'),
    (11,'Jayden','Fox','ST'),(12,'Archie','Wells','CB'),(13,'Finley','Grant','CM'),(14,'Riley','West','RW'),(15,'Tyler','King','GK'),
    (16,'Lucas','Hill','LB'),(17,'Harvey','Young','CAM'),(18,'Kai','Ward','DM'),(19,'Freddie','Scott','LW'),(20,'Jude','Ross','ST'),
    (21,'Owen','Bell','CB'),(22,'Elliot','Lane','RB'),(23,'Louis','Wood','CM'),(24,'Caleb','Gray','RW'),(25,'Adam','Foster','GK'),
    (26,'Max','Ellis','LB'),(27,'Ben','Parker','CAM'),(28,'Toby','Knight','DM'),(29,'Sonny','Mills','LW'),(30,'Zac','Turner','ST'),
    (31,'Dylan','Harris','CB'),(32,'Kian','Cooper','RB'),(33,'Alex','Bennett','CM'),(34,'Reuben','Kelly','RW'),(35,'Jenson','Bailey','GK'),
    (36,'Carter','Murphy','LB'),(37,'Logan','Cook','CAM'),(38,'Ronnie','James','DM'),(39,'Frankie','Watson','LW'),(40,'Bobby','Hughes','ST'),
    (41,'Aiden','Powell','CB'),(42,'Rowan','Russell','RB'),(43,'Ellis','Griffin','CM'),(44,'Kobe','Chapman','RW'),(45,'Luca','Fisher','GK'),
    (46,'Milo','Webb','LB'),(47,'Rory','Mason','CAM'),(48,'Ollie','Barker','DM'),(49,'Teddy','Porter','LW'),(50,'Jamie','Spencer','ST')
  ) as n(idx, first_name, last_name, position)
)
insert into public.test_players (test_team_id, first_name, last_name, age, age_group, position, foot, overall_rating, player_data)
select
  (select id from teams where rn = ((idx - 1) % 5) + 1),
  first_name,
  last_name,
  14 + ((idx - 1) % 5),
  'U' || (15 + ((idx - 1) % 5))::text,
  position,
  case when idx % 4 = 0 then 'Left' else 'Right' end,
  62 + (idx % 27),
  jsonb_build_object('source','test_table','appearances',3 + (idx % 18),'goals',case when position in ('ST','LW','RW','CAM') then idx % 12 else idx % 4 end,'assists',idx % 8,'dataConfidence','Demo')
from names
where not exists (
  select 1 from public.test_players tp where lower(tp.first_name) = lower(names.first_name) and lower(tp.last_name) = lower(names.last_name)
);

-- Maintain the requested Stratex org chart seed without changing passwords.
update public.stratex
set job_title = 'Founder',
    admin_role = coalesce(admin_role, 'Management'),
    permissions = array['management','acquisition','safeguarding','nominations','operations','product_demo'],
    annual_leave_days = coalesce(annual_leave_days, 25)
where lower(email) = 'richdhin@stratexanalytics.co.uk';

update public.stratex
set job_title = 'Head of Operations and Client Success',
    admin_role = coalesce(admin_role, 'Management'),
    manager_id = (select id from public.stratex where lower(email) = 'richdhin@stratexanalytics.co.uk' limit 1),
    permissions = array['management','operations','safeguarding','nominations']
where lower(email) = 'lucy.ali@stratexanalytics.co.uk';

update public.stratex
set first_name = 'RJ',
    last_name = 'Inaba',
    role = coalesce(role, 'Acquisition'),
    admin_role = coalesce(admin_role, 'Acquisition'),
    job_title = 'Head of Growth',
    manager_id = (select id from public.stratex where lower(email) = 'richdhin@stratexanalytics.co.uk' limit 1),
    permissions = array['acquisition','product_demo'],
    is_active = true
where lower(email) = 'rodhinjunior.inaba@stratexanalytics.co.uk';

insert into public.stratex (stratex_id, first_name, last_name, email, role, admin_role, job_title, manager_id, permissions, is_active, registration_complete)
select 'STX-RJINABA', 'RJ', 'Inaba', 'rodhinjunior.inaba@stratexanalytics.co.uk', 'growth', 'Acquisition', 'Head of Growth',
  (select id from public.stratex where lower(email) = 'richdhin@stratexanalytics.co.uk' limit 1),
  array['acquisition','product_demo'], true, false
where not exists (select 1 from public.stratex where lower(email) = 'rodhinjunior.inaba@stratexanalytics.co.uk');
