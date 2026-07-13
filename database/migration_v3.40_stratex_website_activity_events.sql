create table if not exists public.stratex_website_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'page_view',
  page_path text not null,
  page_title text,
  canonical_url text,
  referrer text,
  visitor_hash text,
  session_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stratex_website_activity_created
  on public.stratex_website_activity_events (created_at desc);
create index if not exists idx_stratex_website_activity_page_created
  on public.stratex_website_activity_events (page_path, created_at desc);
create index if not exists idx_stratex_website_activity_visitor_created
  on public.stratex_website_activity_events (visitor_hash, created_at desc);
create index if not exists idx_stratex_website_activity_session_created
  on public.stratex_website_activity_events (session_hash, created_at desc);
create index if not exists idx_stratex_website_activity_type_created
  on public.stratex_website_activity_events (event_type, created_at desc);

alter table public.stratex_website_activity_events enable row level security;

drop policy if exists "service role manages stratex website activity"
  on public.stratex_website_activity_events;
create policy "service role manages stratex website activity"
on public.stratex_website_activity_events
for all
to service_role
using (true)
with check (true);

revoke all on public.stratex_website_activity_events from anon, authenticated;
grant all on public.stratex_website_activity_events to service_role;
