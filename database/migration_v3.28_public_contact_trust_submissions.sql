-- ScoutLink v3.28 - public contact and concern audit trail

create extension if not exists pgcrypto;

create table if not exists public.trust_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null,
  priority text not null default 'standard' check (priority in ('standard','urgent','high')),
  concern_category text,
  name text,
  email text not null,
  phone text,
  role text,
  organisation text,
  player_or_team_mentioned text,
  message text not null,
  safeguarding_flag boolean not null default false,
  source_page text,
  submitted_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','triaged','in_review','awaiting_response','resolved','closed')),
  assigned_to uuid references public.stratex(id) on delete set null,
  email_alert_sent boolean not null default false,
  email_alert_sent_at timestamptz,
  email_alert_error_safe text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trust_submissions_status_idx
  on public.trust_submissions(status, submitted_at desc);

create index if not exists trust_submissions_type_idx
  on public.trust_submissions(submission_type, submitted_at desc);

alter table public.trust_submissions enable row level security;

drop policy if exists service_role_all_trust_submissions on public.trust_submissions;
create policy service_role_all_trust_submissions
on public.trust_submissions
to service_role
using (true)
with check (true);

revoke all on table public.trust_submissions from anon, authenticated;
grant select, insert, update, delete on table public.trust_submissions to service_role;

notify pgrst, 'reload schema';
