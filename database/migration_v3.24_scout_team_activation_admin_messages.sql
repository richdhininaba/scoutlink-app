-- Scout team subscription lifecycle, audited limit overrides, and controlled internal admin messaging.

alter table public.scout_teams
  add column if not exists status text not null default 'draft',
  add column if not exists subscription_plan text not null default 'Core',
  add column if not exists subscription_start_at timestamptz,
  add column if not exists subscription_renewal_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists activated_by uuid,
  add column if not exists plan_limits jsonb not null default '{}'::jsonb,
  add column if not exists limit_overrides jsonb not null default '{}'::jsonb,
  add column if not exists override_reason text,
  add column if not exists current_year_started_at timestamptz,
  add column if not exists current_year_ends_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.scout_teams
set status = coalesce(nullif(status, ''), 'draft'),
    subscription_plan = coalesce(nullif(subscription_plan, ''), 'Core'),
    plan_limits = case
      when coalesce(plan_limits, '{}'::jsonb) = '{}'::jsonb then
        case coalesce(nullif(subscription_plan, ''), 'Core')
          when 'Plus' then '{"seats":5,"exports":100,"predictions":300,"interests":120}'::jsonb
          when 'Elite' then '{"seats":10,"exports":300,"predictions":900,"interests":300}'::jsonb
          when 'Enterprise' then '{"seats":999999999,"exports":999999999,"predictions":999999999,"interests":999999999}'::jsonb
          else '{"seats":1,"exports":20,"predictions":60,"interests":30}'::jsonb
        end
      else plan_limits
    end;

create table if not exists public.scout_team_audit_logs (
  id uuid primary key default gen_random_uuid(),
  scout_team_id uuid references public.scout_teams(id) on delete cascade,
  admin_id uuid references public.stratex(id) on delete set null,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists scout_team_audit_logs_team_idx
  on public.scout_team_audit_logs(scout_team_id, created_at desc);

create table if not exists public.admin_message_threads (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by uuid not null,
  created_by_type text not null check (created_by_type in ('Stratex','Coach','Scout')),
  status text not null default 'open' check (status in ('open','archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_message_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.admin_message_threads(id) on delete cascade,
  participant_id uuid not null,
  participant_type text not null check (participant_type in ('Stratex','Coach','Scout')),
  archived_at timestamptz,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique(thread_id, participant_id, participant_type)
);

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.admin_message_threads(id) on delete cascade,
  sender_id uuid not null,
  sender_type text not null check (sender_type in ('Stratex','Coach','Scout')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_message_audit_logs (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.admin_message_threads(id) on delete set null,
  message_id uuid references public.admin_messages(id) on delete set null,
  actor_id uuid,
  actor_type text check (actor_type in ('Stratex','Coach','Scout')),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_message_participants_lookup_idx
  on public.admin_message_participants(participant_type, participant_id, archived_at);
create index if not exists admin_messages_thread_idx
  on public.admin_messages(thread_id, created_at);

alter table public.scout_team_audit_logs enable row level security;
alter table public.admin_message_threads enable row level security;
alter table public.admin_message_participants enable row level security;
alter table public.admin_messages enable row level security;
alter table public.admin_message_audit_logs enable row level security;

revoke insert, update, delete, truncate on public.scout_team_audit_logs from anon, authenticated;
revoke all on public.admin_message_threads from anon, authenticated;
revoke all on public.admin_message_participants from anon, authenticated;
revoke all on public.admin_messages from anon, authenticated;
revoke all on public.admin_message_audit_logs from anon, authenticated;

grant select, insert, update, delete on public.scout_team_audit_logs to service_role;
grant select, insert, update, delete on public.admin_message_threads to service_role;
grant select, insert, update, delete on public.admin_message_participants to service_role;
grant select, insert, update, delete on public.admin_messages to service_role;
grant select, insert, update, delete on public.admin_message_audit_logs to service_role;

drop policy if exists service_role_all_scout_team_audit_logs on public.scout_team_audit_logs;
create policy service_role_all_scout_team_audit_logs on public.scout_team_audit_logs
  to service_role using (true) with check (true);

drop policy if exists service_role_all_admin_message_threads on public.admin_message_threads;
create policy service_role_all_admin_message_threads on public.admin_message_threads
  to service_role using (true) with check (true);

drop policy if exists service_role_all_admin_message_participants on public.admin_message_participants;
create policy service_role_all_admin_message_participants on public.admin_message_participants
  to service_role using (true) with check (true);

drop policy if exists service_role_all_admin_messages on public.admin_messages;
create policy service_role_all_admin_messages on public.admin_messages
  to service_role using (true) with check (true);

drop policy if exists service_role_all_admin_message_audit_logs on public.admin_message_audit_logs;
create policy service_role_all_admin_message_audit_logs on public.admin_message_audit_logs
  to service_role using (true) with check (true);
