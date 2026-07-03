-- ScoutLink careers application workflow: stage emails and interview availability.

alter table if exists public.job_applications
  add column if not exists stage_one_email_sent_at timestamptz,
  add column if not exists decline_email_sent_at timestamptz,
  add column if not exists availability_submitted_at timestamptz;

create table if not exists public.job_interview_availability_tokens (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  token_hash text not null unique,
  token_hint text,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.stratex(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.job_interview_availability_slots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  token_id uuid not null references public.job_interview_availability_tokens(id) on delete cascade,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_interview_tokens_application
  on public.job_interview_availability_tokens(application_id);

create index if not exists idx_job_interview_tokens_hash
  on public.job_interview_availability_tokens(token_hash);

create index if not exists idx_job_interview_slots_application
  on public.job_interview_availability_slots(application_id);

create index if not exists idx_job_interview_slots_token
  on public.job_interview_availability_slots(token_id);

alter table public.job_interview_availability_tokens enable row level security;
alter table public.job_interview_availability_slots enable row level security;

revoke all on public.job_interview_availability_tokens from anon, authenticated;
revoke all on public.job_interview_availability_slots from anon, authenticated;
grant all on public.job_interview_availability_tokens to service_role;
grant all on public.job_interview_availability_slots to service_role;

drop policy if exists job_interview_tokens_service_role_all on public.job_interview_availability_tokens;
create policy job_interview_tokens_service_role_all
  on public.job_interview_availability_tokens
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists job_interview_slots_service_role_all on public.job_interview_availability_slots;
create policy job_interview_slots_service_role_all
  on public.job_interview_availability_slots
  for all
  to service_role
  using (true)
  with check (true);
