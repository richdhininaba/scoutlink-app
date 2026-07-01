-- ScoutLink v3.8: scout-coach chat and scout fixture attendance

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  pipeline_id uuid references public.recruitment_pipeline(id) on delete set null,
  status text not null default 'open',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scout_id, coach_id, player_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null,
  sender_type text not null check (sender_type in ('Scout','Coach')),
  body text not null check (char_length(trim(body)) > 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.fixture_attendance (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  scout_id uuid not null references public.scouts(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  status text not null default 'attending' check (status in ('attending','not_attending','maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fixture_id, scout_id)
);

create index if not exists idx_chat_threads_scout on public.chat_threads(scout_id, updated_at desc);
create index if not exists idx_chat_threads_coach on public.chat_threads(coach_id, updated_at desc);
create index if not exists idx_chat_messages_thread on public.chat_messages(thread_id, created_at);
create index if not exists idx_fixture_attendance_fixture on public.fixture_attendance(fixture_id);
create index if not exists idx_fixture_attendance_scout on public.fixture_attendance(scout_id);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.fixture_attendance enable row level security;

revoke all on table public.chat_threads from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;
revoke all on table public.fixture_attendance from anon, authenticated;

grant select, insert, update, delete on table public.chat_threads to service_role;
grant select, insert, update, delete on table public.chat_messages to service_role;
grant select, insert, update, delete on table public.fixture_attendance to service_role;
