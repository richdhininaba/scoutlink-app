-- ScoutLink v3.12: one scout-coach chat stream with shared item cards.

alter table public.chat_messages
  add column if not exists message_kind text not null default 'text',
  add column if not exists reference_type text,
  add column if not exists reference_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.chat_messages
  drop constraint if exists chat_messages_message_kind_check;

alter table public.chat_messages
  add constraint chat_messages_message_kind_check
  check (message_kind in ('text', 'share'));

create index if not exists idx_chat_messages_reference
  on public.chat_messages(reference_type, reference_id);

alter table public.chat_threads
  alter column player_id drop not null;

alter table public.chat_threads
  drop constraint if exists chat_threads_scout_id_coach_id_player_id_key;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by scout_id, coach_id
      order by coalesce(last_message_at, updated_at, created_at) desc, created_at desc
    ) as keep_id
  from public.chat_threads
),
moved as (
  update public.chat_messages m
  set thread_id = r.keep_id
  from ranked r
  where m.thread_id = r.id
    and r.id <> r.keep_id
  returning m.id
)
delete from public.chat_threads t
using ranked r
where t.id = r.id
  and r.id <> r.keep_id;

update public.chat_threads t
set
  last_message_at = coalesce((
    select max(m.created_at)
    from public.chat_messages m
    where m.thread_id = t.id
  ), t.last_message_at),
  updated_at = coalesce((
    select max(m.created_at)
    from public.chat_messages m
    where m.thread_id = t.id
  ), t.updated_at, now());

create unique index if not exists uq_chat_threads_scout_coach
  on public.chat_threads(scout_id, coach_id);
