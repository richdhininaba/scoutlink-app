-- The Express API uses ScoutLink JWT auth and connects to Supabase with the anon role.
-- Match the rest of the app tables: enforce access in API routes, and allow the API role
-- to read/write these operational tables.
alter table public.chat_threads disable row level security;
alter table public.chat_messages disable row level security;
alter table public.fixture_attendance disable row level security;

grant select, insert, update, delete on table public.chat_threads to anon, authenticated;
grant select, insert, update, delete on table public.chat_messages to anon, authenticated;
grant select, insert, update, delete on table public.fixture_attendance to anon, authenticated;
