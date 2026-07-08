-- ScoutLink v3.37 - Scout verification, payment and activation flow
-- Keeps scout requests pending until documents are uploaded, reviewed and payment
-- is confirmed. Sensitive verification documents are stored in a private bucket.

alter table public.registration_requests
  add column if not exists verification_status text not null default 'not_required',
  add column if not exists verification_token_hash text,
  add column if not exists verification_token_expires_at timestamptz,
  add column if not exists verification_link_sent_at timestamptz,
  add column if not exists verification_uploaded_at timestamptz,
  add column if not exists payment_plan text,
  add column if not exists payment_link text,
  add column if not exists payment_email_sent_at timestamptz,
  add column if not exists payment_received_at timestamptz,
  add column if not exists activated_at timestamptz;

create unique index if not exists registration_requests_verification_token_hash_uidx
  on public.registration_requests(verification_token_hash)
  where verification_token_hash is not null;

create index if not exists registration_requests_verification_status_idx
  on public.registration_requests(verification_status);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scout-verification-documents',
  'scout-verification-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists scout_verification_documents_service_role_insert on storage.objects;
create policy scout_verification_documents_service_role_insert
on storage.objects
for insert
to service_role
with check (bucket_id = 'scout-verification-documents');

drop policy if exists scout_verification_documents_service_role_select on storage.objects;
create policy scout_verification_documents_service_role_select
on storage.objects
for select
to service_role
using (bucket_id = 'scout-verification-documents');

drop policy if exists scout_verification_documents_service_role_update on storage.objects;
create policy scout_verification_documents_service_role_update
on storage.objects
for update
to service_role
using (bucket_id = 'scout-verification-documents')
with check (bucket_id = 'scout-verification-documents');

drop policy if exists scout_verification_documents_service_role_delete on storage.objects;
create policy scout_verification_documents_service_role_delete
on storage.objects
for delete
to service_role
using (bucket_id = 'scout-verification-documents');

notify pgrst, 'reload schema';
