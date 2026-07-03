-- ScoutLink v3.26 - safety, legal and trust readiness foundations

create extension if not exists pgcrypto;

alter table public.registration_requests
  add column if not exists declaration_version text,
  add column if not exists activity_notice_version text,
  add column if not exists declarations jsonb not null default '{}'::jsonb;

create table if not exists public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid,
  email text,
  policy_name text not null,
  policy_version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists policy_ack_subject_idx
  on public.policy_acknowledgements(subject_type, subject_id, accepted_at desc);

create table if not exists public.safeguarding_concerns (
  id uuid primary key default gen_random_uuid(),
  concern_type text not null,
  person_or_account text,
  player_or_team text,
  description text not null,
  urgency text not null default 'standard',
  contact_name text,
  contact_email text not null,
  contact_phone text,
  source text not null default 'public_form',
  status text not null default 'new' check (status in ('new','reviewing','resolved','closed')),
  assigned_to uuid references public.stratex(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists safeguarding_concerns_status_idx
  on public.safeguarding_concerns(status, created_at desc);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  first_name text,
  last_name text,
  email text not null,
  relationship_to_data text,
  details text not null,
  source text not null default 'public_form',
  status text not null default 'new' check (status in ('new','reviewing','completed','closed')),
  assigned_to uuid references public.stratex(id) on delete set null,
  response_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_status_idx
  on public.privacy_requests(status, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text not null,
  affected_table text,
  affected_record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_action_idx
  on public.audit_logs(action, created_at desc);

alter table public.policy_acknowledgements enable row level security;
alter table public.safeguarding_concerns enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists service_role_all_policy_acknowledgements on public.policy_acknowledgements;
create policy service_role_all_policy_acknowledgements
on public.policy_acknowledgements
to service_role
using (true)
with check (true);

drop policy if exists service_role_all_safeguarding_concerns on public.safeguarding_concerns;
create policy service_role_all_safeguarding_concerns
on public.safeguarding_concerns
to service_role
using (true)
with check (true);

drop policy if exists service_role_all_privacy_requests on public.privacy_requests;
create policy service_role_all_privacy_requests
on public.privacy_requests
to service_role
using (true)
with check (true);

drop policy if exists service_role_all_audit_logs on public.audit_logs;
create policy service_role_all_audit_logs
on public.audit_logs
to service_role
using (true)
with check (true);

grant select, insert, update, delete on table public.policy_acknowledgements to service_role;
grant select, insert, update, delete on table public.safeguarding_concerns to service_role;
grant select, insert, update, delete on table public.privacy_requests to service_role;
grant select, insert, update, delete on table public.audit_logs to service_role;

notify pgrst, 'reload schema';
