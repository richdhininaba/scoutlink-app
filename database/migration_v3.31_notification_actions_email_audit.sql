-- ScoutLink v3.31: notification actions, email audit fields and safe legacy redaction

alter type public.notif_type add value if not exists 'chat_started';
alter type public.notif_type add value if not exists 'chat_message';
alter type public.notif_type add value if not exists 'fixture_attendance';
alter type public.notif_type add value if not exists 'admin_message';
alter type public.notif_type add value if not exists 'showcase_event';

alter table public.notifications
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error_safe text,
  add column if not exists sendgrid_template_id text;

create index if not exists idx_notifications_type_created
  on public.notifications(notification_type, created_at desc);

create index if not exists idx_notifications_recipient_type_created
  on public.notifications(recipient_type, recipient_id, notification_type, created_at desc);

update public.notifications
set
  title = regexp_replace(coalesce(title, ''), '(login code|code)[[:space:]]*[:\-]?[[:space:]]*[A-Z0-9-]{4,16}', 'setup email', 'gi'),
  body = regexp_replace(coalesce(body, ''), '(login code|code)[[:space:]]*[:\-]?[[:space:]]*[A-Z0-9-]{4,16}', 'setup email', 'gi'),
  data = coalesce(data, '{}'::jsonb)
    - 'login_code'
    - 'loginCode'
    - 'password'
    - 'temporaryPassword'
    - 'tempPassword';
