-- Supporting indexes for chat and fixture attendance lookups.
create index if not exists idx_chat_threads_player on public.chat_threads(player_id);
create index if not exists idx_chat_threads_pipeline on public.chat_threads(pipeline_id);
create index if not exists idx_fixture_attendance_coach on public.fixture_attendance(coach_id);
