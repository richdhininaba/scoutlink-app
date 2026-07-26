-- ScoutLink v3.21
-- Usage-request workflow and a clean, isolated U7-U16 demo dataset.

create extension if not exists pgcrypto;

create table if not exists public.usage_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  requester_account_type text not null check (requester_account_type in ('Scout','Coach')),
  requester_id uuid not null,
  scout_id uuid references public.scouts(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete cascade,
  scout_team_id uuid references public.scout_teams(id) on delete cascade,
  organisation_name text,
  allowance_type text not null check (allowance_type in ('interests','predictions','exports')),
  quantity_requested integer not null check (quantity_requested > 0),
  quantity_approved integer check (quantity_approved is null or quantity_approved > 0),
  current_used integer not null default 0 check (current_used >= 0),
  current_limit integer not null default 0 check (current_limit >= 0),
  urgency text not null default 'Needed this week',
  reason text not null,
  status text not null default 'pending' check (
    status in ('pending','approved_free','payment_link_sent','paid_and_applied','declined')
  ),
  amount_pence integer not null default 0 check (amount_pence >= 0),
  payment_url text,
  admin_note text,
  actioned_by uuid,
  actioned_by_name text,
  actioned_at timestamptz,
  allowance_applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.usage_requests(id) on delete cascade,
  event_type text not null,
  status text,
  title text not null,
  body text,
  actor_type text,
  actor_id uuid,
  actor_name text,
  quantity integer,
  amount_pence integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_requests_requester
  on public.usage_requests(requester_account_type, requester_id, created_at desc);
create index if not exists idx_usage_requests_status
  on public.usage_requests(status, created_at desc);
create index if not exists idx_usage_requests_team
  on public.usage_requests(scout_team_id, created_at desc);
create index if not exists idx_usage_request_events_request
  on public.usage_request_events(request_id, created_at asc);

alter table public.usage_requests enable row level security;
alter table public.usage_request_events enable row level security;

-- The API uses the server-side Supabase service role. No direct browser policy is added.

-- Remove the three non-demo test player records. Every player foreign key is ON DELETE CASCADE.
delete from public.players where coalesce(is_demo,false) = false;

-- Remove the placeholder demo record before balancing the demonstration dataset.
delete from public.players
where is_demo = true
  and lower(coalesce(first_name,'')) = 'player'
  and lower(coalesce(last_name,'')) = 'test';

-- Give every fictional team a genuine London or Manchester venue address.
update public.school_academy_teams
set city = case team_name
    when 'Northgate United (Demo)' then 'London'
    when 'Southvale Juniors (Demo)' then 'London'
    when 'ScoutLink Demo Non Pro Academy' then 'London'
    else 'Manchester'
  end,
  county = case
    when team_name in ('Northgate United (Demo)','Southvale Juniors (Demo)','ScoutLink Demo Non Pro Academy')
      then 'Greater London'
    else 'Greater Manchester'
  end,
  country = 'England',
  address_line = case team_name
    when 'Northgate United (Demo)' then 'The Hive London, Camrose Avenue'
    when 'Southvale Juniors (Demo)' then 'Crystal Palace National Sports Centre, Ledrington Road'
    when 'ScoutLink Demo Non Pro Academy' then 'The Hive London, Camrose Avenue'
    when 'Eastbrook Athletic (Demo)' then 'Manchester Regional Arena, Gate 13 Rowsley Street, Etihad Campus'
    when 'Meadow Park Rovers (Demo)' then 'Platt Lane Sports Complex, Yew Tree Road, Fallowfield'
    when 'Harbour City Academy (Demo)' then 'Wythenshawe Park, Wythenshawe Road'
    else address_line
  end,
  postcode = case team_name
    when 'Northgate United (Demo)' then 'HA8 6AG'
    when 'Southvale Juniors (Demo)' then 'SE19 2BB'
    when 'ScoutLink Demo Non Pro Academy' then 'HA8 6AG'
    when 'Eastbrook Athletic (Demo)' then 'M11 3FF'
    when 'Meadow Park Rovers (Demo)' then 'M14 7UU'
    when 'Harbour City Academy (Demo)' then 'M23 0AB'
    else postcode
  end
where is_demo = true;

-- Exactly 52 fictional players remain. Balance them 13 per position group,
-- keep them within U7-U16 and use differentiated 1-10 ratings.
with ordered as (
  select p.id,
         row_number() over (order by p.created_at, p.id) as rn
  from public.players p
  where p.is_demo = true
), shaped as (
  select id, rn,
         ((rn - 1) % 10) + 7 as youth_age,
         case
           when rn <= 13 then 'Goalkeeper'::public.position_group
           when rn <= 26 then 'Defender'::public.position_group
           when rn <= 39 then 'Midfielder'::public.position_group
           else 'Forward'::public.position_group
         end as new_group,
         round((5.00 + ((rn - 1) * 4.70 / 51.0))::numeric, 2) as base_rating
  from ordered
), role_data as (
  select *,
         case new_group::text
           when 'Goalkeeper' then 'GK'
           when 'Defender' then (array['CB','RB','LB','RWB','LWB'])[1 + ((rn - 14) % 5)]
           when 'Midfielder' then (array['CDM','CM','CAM','LM','RM'])[1 + ((rn - 27) % 5)]
           else (array['LW','RW','CF','ST','SS'])[1 + ((rn - 40) % 5)]
         end as role,
         greatest(1.0, least(10.0, base_rating + (((rn * 7) % 9) - 4) * 0.11)) as v1,
         greatest(1.0, least(10.0, base_rating + (((rn * 11) % 9) - 4) * 0.10)) as v2,
         greatest(1.0, least(10.0, base_rating + (((rn * 13) % 9) - 4) * 0.09)) as v3,
         greatest(1.0, least(10.0, base_rating + (((rn * 17) % 9) - 4) * 0.08)) as v4,
         greatest(1.0, least(10.0, base_rating + (((rn * 19) % 9) - 4) * 0.07)) as v5
  from shaped
)
update public.players p
set age = r.youth_age,
    age_group = 'U' || r.youth_age,
    date_of_birth = make_date((extract(year from current_date)::integer - r.youth_age::integer), 9, 1),
    position_group = r.new_group,
    specific_position = r.role,
    primary_position = r.role,
    positions = array[r.role],
    foot = case when r.rn % 5 = 0 then 'Left' when r.rn % 11 = 0 then 'Both' else 'Right' end,
    overall_rating = r.base_rating,
    appearances = case when r.youth_age <= 9 then 4 + (r.rn % 7) else 8 + (r.rn % 13) end,
    goals = case r.new_group::text
      when 'Forward' then 2 + (r.rn % 10)
      when 'Midfielder' then r.rn % 7
      when 'Defender' then r.rn % 3
      else 0 end,
    assists = case r.new_group::text
      when 'Forward' then r.rn % 7
      when 'Midfielder' then 1 + (r.rn % 8)
      when 'Defender' then r.rn % 4
      else 0 end,
    clean_sheets = case
      when r.new_group::text = 'Goalkeeper' then 1 + (r.rn % 7)
      when r.new_group::text = 'Defender' then r.rn % 6
      else 0 end,
    yellow_cards = case when r.youth_age >= 12 then r.rn % 4 else 0 end,
    red_cards = 0,
    pace = round((case r.new_group::text when 'Forward' then r.v1 + 0.35 when 'Defender' then r.v1 else r.v1 + 0.10 end)::numeric,2),
    agility = round((case r.new_group::text when 'Forward' then r.v2 + 0.25 when 'Goalkeeper' then r.v2 - 0.15 else r.v2 end)::numeric,2),
    strength = round((case r.new_group::text when 'Defender' then r.v3 + 0.35 when 'Goalkeeper' then r.v3 + 0.20 else r.v3 end)::numeric,2),
    stamina = round(r.v4::numeric,2),
    jumping = round((case when r.new_group::text in ('Goalkeeper','Defender') then r.v5 + 0.25 else r.v5 end)::numeric,2),
    composure = round(r.v3::numeric,2),
    shooting = round((case r.new_group::text when 'Forward' then r.v4 + 0.35 when 'Midfielder' then r.v4 else greatest(1.0,r.v4 - 1.2) end)::numeric,2),
    passing = round((case r.new_group::text when 'Midfielder' then r.v1 + 0.35 when 'Goalkeeper' then r.v1 - 0.25 else r.v1 end)::numeric,2),
    dribbling = round((case r.new_group::text when 'Forward' then r.v2 + 0.30 when 'Midfielder' then r.v2 + 0.20 else greatest(1.0,r.v2 - 0.7) end)::numeric,2),
    defending = round((case r.new_group::text when 'Defender' then r.v4 + 0.40 when 'Midfielder' then r.v4 - 0.10 else greatest(1.0,r.v4 - 1.3) end)::numeric,2),
    crossing = round((case when r.role in ('RB','LB','RWB','LWB','LW','RW','LM','RM') then r.v5 + 0.30 else r.v5 - 0.25 end)::numeric,2),
    vision = round((case r.new_group::text when 'Midfielder' then r.v3 + 0.35 when 'Forward' then r.v3 else r.v3 - 0.25 end)::numeric,2),
    positioning = round((case when r.new_group::text in ('Goalkeeper','Defender','Forward') then r.v2 + 0.20 else r.v2 end)::numeric,2),
    heading = round((case when r.new_group::text in ('Defender','Forward') then r.v1 + 0.15 else r.v1 - 0.35 end)::numeric,2),
    tackling = round((case r.new_group::text when 'Defender' then r.v5 + 0.40 when 'Midfielder' then r.v5 else greatest(1.0,r.v5 - 1.2) end)::numeric,2),
    gk_diving = case when r.new_group::text='Goalkeeper' then round((r.v1 + 0.25)::numeric,2) else null end,
    gk_handling = case when r.new_group::text='Goalkeeper' then round(r.v2::numeric,2) else null end,
    gk_kicking = case when r.new_group::text='Goalkeeper' then round(r.v3::numeric,2) else null end,
    gk_reflexes = case when r.new_group::text='Goalkeeper' then round((r.v4 + 0.25)::numeric,2) else null end,
    gk_positioning = case when r.new_group::text='Goalkeeper' then round(r.v5::numeric,2) else null end,
    gk_distribution = case when r.new_group::text='Goalkeeper' then round(r.v3::numeric,2) else null end,
    gk_communication = case when r.new_group::text='Goalkeeper' then round(r.v2::numeric,2) else null end,
    gk_sweeping = case when r.new_group::text='Goalkeeper' then round(r.v1::numeric,2) else null end,
    transfer_value = round((2500 + (r.base_rating - 5) * 16500 + r.youth_age * 1250)::numeric,0),
    predicted_salary_weekly = round((25 + (r.base_rating - 5) * 42)::numeric,0),
    height_category = (array['very_short','short','average','tall','very_tall']::public.height_category[])[1 + ((r.rn - 1) % 5)],
    build_category = (array['very_slight','slight','lean','athletic','stocky','powerful']::public.build_category[])[1 + ((r.rn - 1) % 6)],
    work_rate = (array['Medium','High','High/Medium','Medium/High'])[1 + ((r.rn - 1) % 4)],
    email = null,
    phone = null,
    parent_email = null,
    password_hash = null,
    login_code = null,
    login_code_expires = null,
    updated_at = now()
from role_data r
where p.id = r.id;

-- Keep demo team and scout preferences inside the U7-U16 product scope.
update public.scout_teams
set age_groups = array['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'],
    scout_region = case when id::text < '80000000-0000-0000-0000-000000000000' then 'London' else 'Manchester' end,
    subscription_plan = 'Elite',
    limit_overrides = jsonb_build_object('predictions',900,'exports',300,'interests',300),
    updated_at = now()
where is_demo = true;

update public.scouts
set subscription_plan = 'Elite',
    scout_preferences = coalesce(scout_preferences,'{}'::jsonb)
      || jsonb_build_object(
        'ageGroups', jsonb_build_array('U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'),
        'scoutRegion', case when (abs(hashtext(id::text)) % 2)=0 then 'London' else 'Manchester' end,
        'country','England'
      ),
    predictions_remaining = 900,
    exports_remaining = 300,
    interests_remaining = 300,
    updated_at = now()
where is_demo = true;


-- Clamp every football attribute to the documented 1-10 scale.
update public.players set
 pace=least(10,greatest(1,pace)), agility=least(10,greatest(1,agility)),
 strength=least(10,greatest(1,strength)), stamina=least(10,greatest(1,stamina)),
 jumping=least(10,greatest(1,jumping)), composure=least(10,greatest(1,composure)),
 shooting=least(10,greatest(1,shooting)), passing=least(10,greatest(1,passing)),
 dribbling=least(10,greatest(1,dribbling)), defending=least(10,greatest(1,defending)),
 crossing=least(10,greatest(1,crossing)), vision=least(10,greatest(1,vision)),
 positioning=least(10,greatest(1,positioning)), heading=least(10,greatest(1,heading)),
 tackling=least(10,greatest(1,tackling)),
 gk_diving=case when gk_diving is null then null else least(10,greatest(1,gk_diving)) end,
 gk_handling=case when gk_handling is null then null else least(10,greatest(1,gk_handling)) end,
 gk_kicking=case when gk_kicking is null then null else least(10,greatest(1,gk_kicking)) end,
 gk_reflexes=case when gk_reflexes is null then null else least(10,greatest(1,gk_reflexes)) end,
 gk_positioning=case when gk_positioning is null then null else least(10,greatest(1,gk_positioning)) end,
 gk_distribution=case when gk_distribution is null then null else least(10,greatest(1,gk_distribution)) end,
 gk_communication=case when gk_communication is null then null else least(10,greatest(1,gk_communication)) end,
 gk_sweeping=case when gk_sweeping is null then null else least(10,greatest(1,gk_sweeping)) end
where is_demo=true;
