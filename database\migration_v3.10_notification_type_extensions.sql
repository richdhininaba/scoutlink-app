-- Notification enum values used by scout-coach chat and fixture attendance.
alter type public.notif_type add value if not exists 'chat_started';
alter type public.notif_type add value if not exists 'chat_message';
alter type public.notif_type add value if not exists 'fixture_attendance';
