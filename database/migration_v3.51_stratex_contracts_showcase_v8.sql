-- Stratex Analytics - secure employment contracts + Showcase V8 fields
-- Whole migration. Safe to apply once; statements are intentionally idempotent.

create extension if not exists pgcrypto;

create table if not exists public.stratex_contract_documents (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.stratex(id) on delete set null,
  employee_id uuid references public.stratex(id) on delete set null,
  contract_reference text not null unique,
  document_title text not null default 'Contract of Employment',
  document_version text not null default '1.0',
  status text not null default 'draft' check (status in ('draft','ready','sent','viewed','signed','expired','revoked')),
  recipient_name text,
  recipient_email text,
  source_file_name text not null,
  source_storage_path text not null,
  source_sha256 text not null,
  source_text text not null default '',
  source_sections jsonb not null default '[]'::jsonb,
  detected_fields jsonb not null default '[]'::jsonb,
  field_values jsonb not null default '{}'::jsonb,
  secure_token_hash text unique,
  token_expires_at timestamptz,
  generated_pdf_path text,
  generated_pdf_sha256 text,
  generated_at timestamptz,
  first_viewed_at timestamptz,
  acceptance_text text,
  signature_method text check (signature_method is null or signature_method in ('typed','drawn')),
  signature_name text,
  signature_data text,
  signature_ip inet,
  signature_user_agent text,
  signed_pdf_path text,
  receipt_pdf_path text,
  signature_receipt_reference text unique,
  signed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stratex_contract_documents_created_by
  on public.stratex_contract_documents(created_by, created_at desc);
create index if not exists idx_stratex_contract_documents_employee
  on public.stratex_contract_documents(employee_id, created_at desc);
create index if not exists idx_stratex_contract_documents_status
  on public.stratex_contract_documents(status, created_at desc);
create index if not exists idx_stratex_contract_documents_recipient_email
  on public.stratex_contract_documents(lower(recipient_email));

create table if not exists public.stratex_contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.stratex_contract_documents(id) on delete cascade,
  event_type text not null,
  actor_stratex_id uuid references public.stratex(id) on delete set null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_stratex_contract_events_contract
  on public.stratex_contract_events(contract_id, created_at asc);

alter table public.stratex_contract_documents enable row level security;
alter table public.stratex_contract_events enable row level security;

revoke all on public.stratex_contract_documents from anon, authenticated;
revoke all on public.stratex_contract_events from anon, authenticated;
grant all on public.stratex_contract_documents to service_role;
grant all on public.stratex_contract_events to service_role;

-- The bucket already exists in production, but keep this migration portable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stratex-contracts',
  'stratex-contracts',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- V8 player registration fields shown in the supplied transactional design.
alter table public.showcase_player_registrations
  add column if not exists guardian_name text,
  add column if not exists guardian_relationship text,
  add column if not exists current_age_group text,
  add column if not exists current_level text,
  add column if not exists shirt_number integer,
  add column if not exists information_confirmed boolean not null default false,
  add column if not exists application_acknowledged boolean not null default false;

-- V8 asks for the current team/club but deliberately does not ask the applicant
-- for the legacy team_type or coach_name fields. Keep the integrity rule aligned
-- with the V8 source of truth: a player marked as being with a team needs a team
-- name, while legacy rows remain valid.
alter table public.showcase_player_registrations
  drop constraint if exists showcase_player_team_details;

alter table public.showcase_player_registrations
  drop constraint if exists showcase_player_team_details_v8;

alter table public.showcase_player_registrations
  add constraint showcase_player_team_details_v8
  check ((currently_plays_for_team = false) or (team_name is not null));

-- V8 professional registration fields shown in the supplied transactional design.
alter table public.showcase_professional_registrations
  add column if not exists job_title text,
  add column if not exists conduct_confirmed boolean not null default false;

alter table public.showcase_professional_waitlist
  add column if not exists job_title text;

-- Keep shirt numbers sane without changing any existing rows.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'showcase_player_registrations_shirt_number_check'
  ) then
    alter table public.showcase_player_registrations
      add constraint showcase_player_registrations_shirt_number_check
      check (shirt_number is null or (shirt_number between 1 and 99));
  end if;
end $$;

-- Keep contract updated_at accurate even when status changes after signing.
create or replace function public.set_stratex_contract_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stratex_contract_documents_updated_at
  on public.stratex_contract_documents;
create trigger trg_stratex_contract_documents_updated_at
before update on public.stratex_contract_documents
for each row execute function public.set_stratex_contract_updated_at();
