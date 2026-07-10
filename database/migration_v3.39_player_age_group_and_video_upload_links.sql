-- ScoutLink v3.39 - player age group simplification and coach-generated video upload links

alter table players add column if not exists age_group_rollover_year integer;
alter table players add column if not exists archived_at timestamptz;
alter table players add column if not exists archived_reason text;

create table if not exists player_video_upload_links (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  coach_id uuid references coaches(id) on delete set null,
  team_id uuid,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  is_active boolean not null default true,
  created_by uuid,
  created_by_type account_type,
  created_at timestamptz not null default now()
);

create index if not exists idx_player_video_upload_links_player_id on player_video_upload_links(player_id);
create index if not exists idx_player_video_upload_links_token_hash on player_video_upload_links(token_hash);
create index if not exists idx_player_video_upload_links_active on player_video_upload_links(is_active, expires_at);

alter table player_video_upload_links enable row level security;

drop policy if exists service_role_all_player_video_upload_links on player_video_upload_links;
create policy service_role_all_player_video_upload_links
on player_video_upload_links
to service_role
using (true)
with check (true);

update storage.buckets
set public = false
where id = 'player-videos';

notify pgrst, 'reload schema';
