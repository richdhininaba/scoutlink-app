-- Stratex Admin V5 public publishing control plane
-- Run once in the ScoutLink Supabase project after committing this file.

begin;

create extension if not exists pgcrypto;

alter table public.showcase_events
  add column if not exists slug text,
  add column if not exists summary text,
  add column if not exists hero_image_url text,
  add column if not exists public_visible boolean not null default false,
  add column if not exists featured boolean not null default false,
  add column if not exists registration_deadline timestamptz,
  add column if not exists player_arrival_time time not null default '12:00:00',
  add column if not exists professional_arrival_time time not null default '12:30:00',
  add column if not exists player_min_age integer not null default 12,
  add column if not exists player_max_age integer not null default 16,
  add column if not exists professional_capacity integer not null default 30,
  add column if not exists player_registration_open boolean not null default true,
  add column if not exists professional_registration_open boolean not null default true,
  add column if not exists created_by uuid,
  add column if not exists updated_at timestamptz not null default now();

update public.showcase_events
set
  slug = coalesce(nullif(slug, ''), trim(both '-' from regexp_replace(lower(event_name), '[^a-z0-9]+', '-', 'g'))),
  professional_capacity = coalesce(professional_capacity, max_scouts, 30),
  max_scouts = coalesce(max_scouts, professional_capacity, 30),
  updated_at = coalesce(updated_at, created_at, now())
where slug is null
   or slug = ''
   or professional_capacity is null
   or max_scouts is null;

alter table public.showcase_registration_events
  add column if not exists source_showcase_event_id uuid;

alter table public.award_ceremonies
  add column if not exists slug text,
  add column if not exists hero_image_url text,
  add column if not exists public_visible boolean not null default false;

update public.award_ceremonies
set slug = coalesce(
  nullif(slug, ''),
  trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
)
where slug is null or slug = '';

create table if not exists public.stratex_public_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  fields jsonb not null default '{}'::jsonb,
  toggles jsonb not null default '{}'::jsonb,
  values jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.stratex_public_settings (
  setting_key,
  fields,
  toggles,
  values
)
values (
  'public_site',
  jsonb_build_object(
    'companyName', 'Stratex Analytics Limited',
    'primaryEmail', 'info@stratexanalytics.co.uk',
    'country', 'United Kingdom',
    'website', 'https://www.stratexanalytics.co.uk'
  ),
  jsonb_build_object(
    'publicWebsiteEnabled', true,
    'automaticSitemap', true,
    'globalFavicon', true,
    'requireArticleImage', true,
    'canonicalUrls', true,
    'noindexDrafts', true,
    'showShowcaseEvents', true,
    'showAwardCeremonies', true,
    'singleFeaturedEvent', true,
    'separateAuth', true,
    'loginCodes', true,
    'richdhinOnly', true,
    'privateApplicants', true,
    'privateConcerns', true,
    'auditActions', true
  ),
  '{}'::jsonb
)
on conflict (setting_key) do nothing;

-- Preserve the existing live registration event while creating its parent
-- Showcase record. Registration rows remain attached to their existing event ID.
insert into public.showcase_events (
  event_name,
  slug,
  event_date,
  venue_name,
  venue_address,
  description,
  summary,
  max_scouts,
  professional_capacity,
  status,
  confirmed,
  public_visible,
  featured,
  player_arrival_time,
  professional_arrival_time,
  player_min_age,
  player_max_age,
  player_registration_open,
  professional_registration_open,
  created_at,
  updated_at
)
select
  registration.event_name,
  trim(both '-' from regexp_replace(lower(registration.event_name || '-' || registration.event_date::text), '[^a-z0-9]+', '-', 'g')),
  registration.event_date::timestamptz,
  registration.venue_name,
  registration.venue_address,
  'ScoutLink Showcase event managed through the Stratex Admin Centre.',
  'A ScoutLink football showcase connecting grassroots players with verified coaches and scouts.',
  registration.professional_capacity,
  registration.professional_capacity,
  'published',
  true,
  true,
  true,
  registration.player_arrival_time,
  registration.professional_arrival_time,
  registration.player_min_age,
  registration.player_max_age,
  registration.player_registration_open,
  registration.professional_registration_open,
  registration.created_at,
  registration.updated_at
from public.showcase_registration_events registration
where registration.event_key = coalesce(
  nullif(current_setting('app.settings.showcase_registration_event_key', true), ''),
  'bluewater-2026-09-12'
)
  and registration.source_showcase_event_id is null
  and not exists (
    select 1
    from public.showcase_events event
    where event.event_date::date = registration.event_date
      and lower(event.event_name) = lower(registration.event_name)
  );

update public.showcase_registration_events registration
set source_showcase_event_id = event.id,
    updated_at = now()
from public.showcase_events event
where registration.source_showcase_event_id is null
  and event.event_date::date = registration.event_date
  and lower(event.event_name) = lower(registration.event_name);

-- Keep one featured Showcase record. The backend changes the active registration
-- event by safely archiving the former event_key and promoting the new event row.
with ranked as (
  select id,
         row_number() over (
           order by
             case when featured then 0 else 1 end,
             case when public_visible then 0 else 1 end,
             event_date asc nulls last,
             created_at asc
         ) as position
  from public.showcase_events
  where featured = true
)
update public.showcase_events event
set featured = false,
    updated_at = now()
from ranked
where event.id = ranked.id
  and ranked.position > 1;

create unique index if not exists showcase_events_slug_unique
  on public.showcase_events (slug)
  where slug is not null and slug <> '';

create unique index if not exists showcase_registration_events_source_unique
  on public.showcase_registration_events (source_showcase_event_id)
  where source_showcase_event_id is not null;

create unique index if not exists award_ceremonies_slug_unique
  on public.award_ceremonies (slug)
  where slug is not null and slug <> '';

create index if not exists showcase_events_public_index
  on public.showcase_events (public_visible, status, featured, event_date);

create index if not exists award_ceremonies_public_index
  on public.award_ceremonies (public_visible, status, event_date);

create index if not exists showcase_player_registrations_event_index
  on public.showcase_player_registrations (event_id, submitted_at desc);

create index if not exists showcase_professional_registrations_event_index
  on public.showcase_professional_registrations (event_id, submitted_at desc);

create index if not exists showcase_professional_waitlist_event_index
  on public.showcase_professional_waitlist (event_id, submitted_at desc);

-- Add the foreign key only after existing records are linked.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'showcase_registration_events_source_event_fk'
  ) then
    alter table public.showcase_registration_events
      add constraint showcase_registration_events_source_event_fk
      foreign key (source_showcase_event_id)
      references public.showcase_events(id)
      on delete set null;
  end if;
end $$;

-- Guard common event values at database level.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'showcase_events_age_range_check'
  ) then
    alter table public.showcase_events
      add constraint showcase_events_age_range_check
      check (
        player_min_age between 5 and 21
        and player_max_age between 5 and 21
        and player_min_age <= player_max_age
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'showcase_events_capacity_check'
  ) then
    alter table public.showcase_events
      add constraint showcase_events_capacity_check
      check (professional_capacity > 0 and max_scouts > 0);
  end if;
end $$;

create or replace function public.stratex_admin_v5_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists showcase_events_set_updated_at on public.showcase_events;
create trigger showcase_events_set_updated_at
before update on public.showcase_events
for each row execute function public.stratex_admin_v5_set_updated_at();

drop trigger if exists award_ceremonies_set_updated_at on public.award_ceremonies;
create trigger award_ceremonies_set_updated_at
before update on public.award_ceremonies
for each row execute function public.stratex_admin_v5_set_updated_at();

drop trigger if exists stratex_public_settings_set_updated_at on public.stratex_public_settings;
create trigger stratex_public_settings_set_updated_at
before update on public.stratex_public_settings
for each row execute function public.stratex_admin_v5_set_updated_at();

-- The server uses the service-role client. Explicitly deny anonymous writes.
alter table public.stratex_public_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'stratex_public_settings'
      and policyname = 'No direct public settings access'
  ) then
    create policy "No direct public settings access"
      on public.stratex_public_settings
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

commit;
