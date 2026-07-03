-- ScoutLink v3.24 - Private CV storage service access
-- Allows the backend service role to manage private career CV files without exposing
-- the job-cvs bucket to public users.

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

drop policy if exists job_cvs_service_role_insert on storage.objects;
create policy job_cvs_service_role_insert
on storage.objects
for insert
to service_role
with check (bucket_id = 'job-cvs');

drop policy if exists job_cvs_service_role_select on storage.objects;
create policy job_cvs_service_role_select
on storage.objects
for select
to service_role
using (bucket_id = 'job-cvs');

drop policy if exists job_cvs_service_role_update on storage.objects;
create policy job_cvs_service_role_update
on storage.objects
for update
to service_role
using (bucket_id = 'job-cvs')
with check (bucket_id = 'job-cvs');

drop policy if exists job_cvs_service_role_delete on storage.objects;
create policy job_cvs_service_role_delete
on storage.objects
for delete
to service_role
using (bucket_id = 'job-cvs');

notify pgrst, 'reload schema';
