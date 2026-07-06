-- Public trust submissions: user confirmations and Stratex concerns inbox

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
  status text not null default 'new',
  assigned_to uuid references public.stratex(id) on delete set null,
  email_alert_sent boolean not null default false,
  email_alert_sent_at timestamptz,
  email_alert_error_safe text,
  user_confirmation_sent boolean not null default false,
  user_confirmation_sent_at timestamptz,
  user_confirmation_error_safe text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.trust_submissions
  add column if not exists user_confirmation_sent boolean not null default false,
  add column if not exists user_confirmation_sent_at timestamptz,
  add column if not exists user_confirmation_error_safe text,
  add column if not exists internal_notes text;

update public.trust_submissions
set status = case
  when status in ('triaged', 'in_review') then 'investigating'
  when status = 'awaiting_response' then 'awaiting_more_information'
  else status
end
where status in ('triaged', 'in_review', 'awaiting_response');

alter table if exists public.trust_submissions
  drop constraint if exists trust_submissions_status_check;

alter table if exists public.trust_submissions
  add constraint trust_submissions_status_check
  check (status in (
    'new',
    'investigating',
    'awaiting_more_information',
    'outcome_being_prepared',
    'outcome_sent',
    'resolved',
    'closed'
  ));

create index if not exists trust_submissions_safeguarding_idx
  on public.trust_submissions(safeguarding_flag, submitted_at desc);

create index if not exists trust_submissions_priority_idx
  on public.trust_submissions(priority, submitted_at desc);

alter table public.trust_submissions enable row level security;

drop policy if exists service_role_all_trust_submissions on public.trust_submissions;
create policy service_role_all_trust_submissions
on public.trust_submissions
for all
to service_role
using (true)
with check (true);

revoke all on table public.trust_submissions from anon, authenticated;
grant select, insert, update, delete on table public.trust_submissions to service_role;

notify pgrst, 'reload schema';
