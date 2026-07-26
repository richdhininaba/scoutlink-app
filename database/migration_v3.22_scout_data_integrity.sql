-- ScoutLink V6.6 data integrity and player-specific chat

begin;

-- The demo experience must expose the complete 52-player Supabase dataset.
update public.players
set is_active = true,
    updated_at = now()
where is_demo = true;

-- Scouts, not Coaches, request extra prediction, export or interest allowances.
alter table public.usage_requests
  drop constraint if exists usage_requests_requester_account_type_check;

alter table public.usage_requests
  add constraint usage_requests_requester_account_type_check
  check (requester_account_type = 'Scout');

-- One conversation is uniquely identified by Scout + Coach + Player.
create unique index if not exists uq_chat_threads_scout_coach_player
  on public.chat_threads (scout_id, coach_id, player_id)
  where player_id is not null;

commit;
