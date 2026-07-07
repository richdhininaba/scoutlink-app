-- ScoutLink / Stratex migration v3.32
-- Stratex Analytics parent-company website, CRM, learning centre and leadership data.

create table if not exists public.stratex_website_leads (
  id uuid primary key default gen_random_uuid(),
  lead_type text not null check (lead_type in ('contact','demo_request','newsletter','concern','general')),
  first_name text,
  last_name text,
  full_name text,
  email text not null,
  phone text,
  organisation text,
  role text,
  reason text,
  message text,
  source_page text,
  status text not null default 'new' check (status in ('new','reviewing','contacted','converted','closed','archived')),
  internal_notes text,
  safe_metadata jsonb not null default '{}'::jsonb,
  consent_contact boolean not null default false,
  consent_marketing boolean not null default false,
  consent_text text,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stratex_website_leads_type_created on public.stratex_website_leads (lead_type, created_at desc);
create index if not exists idx_stratex_website_leads_email on public.stratex_website_leads (lower(email));

create table if not exists public.stratex_newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  last_name text,
  source_page text,
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed','bounced','archived')),
  consent_text text,
  consent_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stratex_learning_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  category text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  author_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stratex_learning_posts_status_published on public.stratex_learning_posts (status, published_at desc);

create table if not exists public.stratex_leadership_members (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  full_name text not null,
  email text,
  job_title text,
  permission_role text,
  bio text,
  display_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stratex_leadership_active_order on public.stratex_leadership_members (is_active, display_order, full_name);

create table if not exists public.stratex_crm_export_logs (
  id uuid primary key default gen_random_uuid(),
  exported_by uuid,
  row_count integer not null default 0,
  export_type text not null default 'csv',
  created_at timestamptz not null default now()
);

alter table public.stratex_website_leads enable row level security;
alter table public.stratex_newsletter_signups enable row level security;
alter table public.stratex_learning_posts enable row level security;
alter table public.stratex_leadership_members enable row level security;
alter table public.stratex_crm_export_logs enable row level security;

drop policy if exists "service role manages stratex website leads" on public.stratex_website_leads;
create policy "service role manages stratex website leads"
on public.stratex_website_leads
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages stratex newsletter signups" on public.stratex_newsletter_signups;
create policy "service role manages stratex newsletter signups"
on public.stratex_newsletter_signups
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages stratex learning posts" on public.stratex_learning_posts;
create policy "service role manages stratex learning posts"
on public.stratex_learning_posts
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages stratex leadership members" on public.stratex_leadership_members;
create policy "service role manages stratex leadership members"
on public.stratex_leadership_members
for all
to service_role
using (true)
with check (true);

drop policy if exists "service role manages stratex crm export logs" on public.stratex_crm_export_logs;
create policy "service role manages stratex crm export logs"
on public.stratex_crm_export_logs
for all
to service_role
using (true)
with check (true);

revoke all on public.stratex_website_leads from anon, authenticated;
revoke all on public.stratex_newsletter_signups from anon, authenticated;
revoke all on public.stratex_learning_posts from anon, authenticated;
revoke all on public.stratex_leadership_members from anon, authenticated;
revoke all on public.stratex_crm_export_logs from anon, authenticated;

insert into public.stratex_leadership_members (full_name, first_name, last_name, email, job_title, permission_role, display_order, is_active)
values
  ('Richdhin Inaba', 'Richdhin', 'Inaba', 'richdhin@stratexanalytics.co.uk', 'Founder', 'Management', 10, true),
  ('Lucy Ali', 'Lucy', 'Ali', 'lucy.ali@stratexanalytics.co.uk', 'Head of Operations and Client Success', 'Operations', 20, true),
  ('RJ Inaba', 'RJ', 'Inaba', 'rodhinjunior.inaba@stratexanalytics.co.uk', 'Head of Growth', 'Acquisition', 30, true)
on conflict do nothing;

insert into public.stratex_learning_posts (slug, title, excerpt, body, category, status, published_at)
values (
  'why-structured-player-evidence-matters',
  'Why structured player evidence matters',
  'Grassroots player information is often scattered. Structured evidence helps coaches, scouts and families understand context more clearly.',
  'Grassroots player information is often scattered across messages, clips, memory and spreadsheets. ScoutLink is designed to bring that information into a clearer record so football decisions can be made with better context and safer routes.',
  'Football intelligence',
  'published',
  now()
)
on conflict (slug) do nothing;
