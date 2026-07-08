-- ScoutLink / Stratex migration v3.34
-- Learning Centre engagement counters and private Stratex contract storage.

alter table public.stratex_learning_posts
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0,
  add column if not exists last_viewed_at timestamptz;

create index if not exists idx_stratex_learning_posts_engagement
  on public.stratex_learning_posts (status, view_count desc, like_count desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stratex-contracts',
  'stratex-contracts',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists stratex_contracts_service_role_insert on storage.objects;
create policy stratex_contracts_service_role_insert
on storage.objects
for insert
to service_role
with check (bucket_id = 'stratex-contracts');

drop policy if exists stratex_contracts_service_role_select on storage.objects;
create policy stratex_contracts_service_role_select
on storage.objects
for select
to service_role
using (bucket_id = 'stratex-contracts');

drop policy if exists stratex_contracts_service_role_update on storage.objects;
create policy stratex_contracts_service_role_update
on storage.objects
for update
to service_role
using (bucket_id = 'stratex-contracts')
with check (bucket_id = 'stratex-contracts');

drop policy if exists stratex_contracts_service_role_delete on storage.objects;
create policy stratex_contracts_service_role_delete
on storage.objects
for delete
to service_role
using (bucket_id = 'stratex-contracts');

notify pgrst, 'reload schema';
