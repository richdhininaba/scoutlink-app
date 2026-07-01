-- ScoutLink v3.19 - Stratex careers, job applications and private CV storage

create extension if not exists pgcrypto;

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  job_title text not null,
  department text,
  location text,
  working_type text not null default 'Remote' check (working_type in ('Remote','Hybrid','On-site')),
  employment_type text,
  contract_type text,
  salary_min numeric,
  salary_max numeric,
  salary_unit text not null default 'annually' check (salary_unit in ('hourly','daily','monthly','annually')),
  currency text not null default 'GBP',
  release_at timestamptz,
  closing_at timestamptz,
  about_company text,
  role_overview text,
  responsibilities text,
  must_haves text,
  nice_to_haves text,
  interview_stage_count integer not null default 1,
  interview_process text,
  status text not null default 'draft' check (status in ('draft','scheduled','live','closed','archived')),
  created_by uuid references public.stratex(id) on delete set null,
  updated_by uuid references public.stratex(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_posts_status_release_idx on public.job_posts(status, release_at, closing_at);
create index if not exists job_posts_slug_idx on public.job_posts(slug);

create table if not exists public.job_post_notification_recipients (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  stratex_id uuid references public.stratex(id) on delete set null,
  email text not null,
  created_at timestamptz not null default now(),
  unique(job_post_id, email)
);

create index if not exists job_post_notification_recipients_job_idx on public.job_post_notification_recipients(job_post_id);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  application_ref text not null unique,
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  status text not null default 'submitted' check (status in ('submitted','reviewing','shortlisted','rejected','hired','withdrawn')),
  submitted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists job_applications_job_idx on public.job_applications(job_post_id, submitted_at desc);
create index if not exists job_applications_email_idx on public.job_applications(lower(email));

create table if not exists public.job_application_files (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  bucket text not null default 'job-cvs',
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  uploaded_at timestamptz not null default now(),
  unique(application_id, file_path)
);

create index if not exists job_application_files_application_idx on public.job_application_files(application_id);

alter table public.job_posts enable row level security;
alter table public.job_post_notification_recipients enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_application_files enable row level security;

drop policy if exists service_role_all_job_posts on public.job_posts;
drop policy if exists service_role_all_job_post_recipients on public.job_post_notification_recipients;
drop policy if exists service_role_all_job_applications on public.job_applications;
drop policy if exists service_role_all_job_application_files on public.job_application_files;

create policy service_role_all_job_posts on public.job_posts to service_role using (true) with check (true);
create policy service_role_all_job_post_recipients on public.job_post_notification_recipients to service_role using (true) with check (true);
create policy service_role_all_job_applications on public.job_applications to service_role using (true) with check (true);
create policy service_role_all_job_application_files on public.job_application_files to service_role using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-cvs',
  'job-cvs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
