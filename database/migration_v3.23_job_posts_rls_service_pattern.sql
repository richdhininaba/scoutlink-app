-- ScoutLink v3.23 - Keep Hiring writes backend-owned while allowing public live job reads

alter table public.job_posts enable row level security;
alter table public.job_post_notification_recipients enable row level security;

-- Public clients may read released/live job posts for the careers pages.
-- They must not create, update or delete roles directly.
revoke insert, update, delete, truncate on public.job_posts from anon, authenticated;
revoke insert, update, delete, truncate on public.job_post_notification_recipients from anon, authenticated;

grant select on public.job_posts to anon, authenticated;

drop policy if exists public_read_released_job_posts on public.job_posts;
create policy public_read_released_job_posts
on public.job_posts
for select
to anon, authenticated
using (
  (
    status = 'live'
    or (
      status = 'scheduled'
      and release_at is not null
      and release_at <= now()
    )
  )
  and (closing_at is null or closing_at > now())
);

-- Backend/API access stays service-role owned.
drop policy if exists service_role_all_job_posts on public.job_posts;
create policy service_role_all_job_posts
on public.job_posts
for all
to service_role
using (true)
with check (true);

drop policy if exists service_role_all_job_post_recipients on public.job_post_notification_recipients;
create policy service_role_all_job_post_recipients
on public.job_post_notification_recipients
for all
to service_role
using (true)
with check (true);

notify pgrst, 'reload schema';
