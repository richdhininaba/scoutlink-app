-- ScoutLink Coach Desk / Coach Field exact-design runtime support
-- Adds only persistence required by the supplied design that the current schema lacks.
-- Coach usage / allowance limits are intentionally NOT added to the Coach experience.

begin;

-- ---------------------------------------------------------------------------
-- Video moderation and fixture linkage.
-- Existing videos pre-date the review queue, so they remain approved.
-- New uploads default to pending until a coach explicitly approves them.
-- ---------------------------------------------------------------------------
alter table public.player_videos
  add column if not exists moderation_status text,
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid,
  add column if not exists fixture_id uuid references public.fixtures(id) on delete set null;

update public.player_videos
set moderation_status = 'approved',
    moderated_at = coalesce(moderated_at, created_at)
where moderation_status is null;

alter table public.player_videos
  alter column moderation_status set default 'pending',
  alter column moderation_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'player_videos_moderation_status_check'
  ) then
    alter table public.player_videos
      add constraint player_videos_moderation_status_check
      check (moderation_status in ('pending','approved','rejected'));
  end if;
end $$;

create index if not exists idx_player_videos_team_moderation
  on public.player_videos(team_id, moderation_status, created_at desc);

create index if not exists idx_player_videos_fixture
  on public.player_videos(fixture_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Team settings shown in the supplied Settings > Team design.
-- There is no public.teams table in the current schema, so these values live
-- on each coach record and the API keeps coaches on the same team in sync.
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists availability text not null default 'Available';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'players_availability_check'
  ) then
    alter table public.players
      add constraint players_availability_check
      check (availability in ('Available','Injured','Unavailable'));
  end if;
end $$;

alter table public.coaches
  add column if not exists team_age_groups text[] not null default '{}'::text[],
  add column if not exists team_home_venue text,
  add column if not exists team_website text,
  add column if not exists team_contact_email text,
  add column if not exists notification_preferences jsonb;

-- Exact desktop design: per event, per channel. Safeguarding and mandatory
-- account notices are always on and cannot be disabled by the UI or API.
update public.coaches
set notification_preferences = jsonb_build_object(
  'scout_interest', jsonb_build_object('in_app', true, 'email', true, 'urgent_only', false),
  'scout_message', jsonb_build_object('in_app', true, 'email', true, 'urgent_only', false),
  'fixture_attendance', jsonb_build_object('in_app', true, 'email', true, 'urgent_only', false),
  'match_facts_reminder', jsonb_build_object('in_app', true, 'email', false, 'urgent_only', false),
  'video_upload', jsonb_build_object('in_app', true, 'email', true, 'urgent_only', false),
  'safeguarding', jsonb_build_object('in_app', true, 'email', true, 'always_on', true),
  'product_updates', jsonb_build_object('in_app', true, 'email', false, 'urgent_only', false),
  'account_system', jsonb_build_object('in_app', true, 'email', true, 'always_on', true)
)
where notification_preferences is null
   or jsonb_typeof(notification_preferences) <> 'object'
   or jsonb_typeof(notification_preferences -> 'scout_interest') is distinct from 'object';

alter table public.coaches
  alter column notification_preferences
  set default '{
    "scout_interest":{"in_app":true,"email":true,"urgent_only":false},
    "scout_message":{"in_app":true,"email":true,"urgent_only":false},
    "fixture_attendance":{"in_app":true,"email":true,"urgent_only":false},
    "match_facts_reminder":{"in_app":true,"email":false,"urgent_only":false},
    "video_upload":{"in_app":true,"email":true,"urgent_only":false},
    "safeguarding":{"in_app":true,"email":true,"always_on":true},
    "product_updates":{"in_app":true,"email":false,"urgent_only":false},
    "account_system":{"in_app":true,"email":true,"always_on":true}
  }'::jsonb,
  alter column notification_preferences set not null;

commit;
