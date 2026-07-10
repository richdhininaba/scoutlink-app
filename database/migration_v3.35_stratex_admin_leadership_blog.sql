-- ScoutLink / Stratex migration v3.35
-- Stratex leadership images and privacy-conscious Learning Centre engagement dedupe.

alter table public.stratex_leadership_members
  add column if not exists image_url text;

alter table public.stratex_leadership_members
  add column if not exists linkedin_url text,
  add column if not exists focus_chip text,
  add column if not exists summary text,
  add column if not exists focus_areas text[] not null default '{}'::text[];

create table if not exists public.stratex_blog_engagement_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.stratex_learning_posts(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'like')),
  visitor_hash text not null,
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_stx_blog_unique_daily_view
  on public.stratex_blog_engagement_events (post_id, event_type, visitor_hash, event_date)
  where event_type = 'view';

create unique index if not exists idx_stx_blog_unique_like
  on public.stratex_blog_engagement_events (post_id, event_type, visitor_hash)
  where event_type = 'like';

create index if not exists idx_stx_blog_engagement_post_created
  on public.stratex_blog_engagement_events (post_id, created_at desc);

alter table public.stratex_blog_engagement_events enable row level security;

drop policy if exists "service role manages stratex blog engagement" on public.stratex_blog_engagement_events;
create policy "service role manages stratex blog engagement"
on public.stratex_blog_engagement_events
for all
to service_role
using (true)
with check (true);

revoke all on public.stratex_blog_engagement_events from anon, authenticated;

update public.stratex_leadership_members
set
  full_name = 'Richdhin Inaba',
  first_name = 'Richdhin',
  last_name = 'Inaba',
  email = 'richdhin@stratexanalytics.co.uk',
  job_title = 'Founder & CEO',
  permission_role = 'Founder / CEO',
  focus_chip = 'Founder / CEO',
  summary = 'Sets the vision, strategy and direction for Stratex Analytics and ScoutLink.',
  bio = 'Richdhin sets the vision, strategy and direction for Stratex Analytics and ScoutLink. He leads the company executive decisions, product direction and long-term growth.',
  focus_areas = array['Company vision','Executive decisions','Product direction','Long-term growth'],
  linkedin_url = 'https://www.linkedin.com/in/richdhin-i-470a15109/',
  image_url = '/images/leadership/richdhin-inaba.svg',
  display_order = 10,
  is_active = true,
  updated_at = now()
where lower(full_name) = 'richdhin inaba'
   or lower(email) = 'richdhin@stratexanalytics.co.uk';

insert into public.stratex_leadership_members (
  full_name, first_name, last_name, email, job_title, permission_role, bio,
  linkedin_url, image_url, focus_chip, summary, focus_areas, display_order, is_active
)
select
  'Richdhin Inaba', 'Richdhin', 'Inaba', 'richdhin@stratexanalytics.co.uk',
  'Founder & CEO', 'Founder / CEO',
  'Richdhin sets the vision, strategy and direction for Stratex Analytics and ScoutLink. He leads the company executive decisions, product direction and long-term growth.',
  'https://www.linkedin.com/in/richdhin-i-470a15109/', '/images/leadership/richdhin-inaba.svg',
  'Founder / CEO', 'Sets the vision, strategy and direction for Stratex Analytics and ScoutLink.',
  array['Company vision','Executive decisions','Product direction','Long-term growth'], 10, true
where not exists (
  select 1 from public.stratex_leadership_members
  where lower(full_name) = 'richdhin inaba'
     or lower(email) = 'richdhin@stratexanalytics.co.uk'
);

update public.stratex_leadership_members
set
  full_name = 'Lucy Ali',
  first_name = 'Lucy',
  last_name = 'Ali',
  email = 'lucy.ali@stratexanalytics.co.uk',
  job_title = 'Director of Operations',
  permission_role = 'Operations',
  focus_chip = 'Operations',
  summary = 'Leads day-to-day operations, outreach delivery and customer management.',
  bio = 'Lucy leads the day-to-day operations of ScoutLink, including internal processes, outreach delivery, coach and scout relationships, customer management and event operations. She ensures the business runs smoothly as ScoutLink grows.',
  focus_areas = array['Internal processes','Outreach delivery','Customer management','Event operations'],
  linkedin_url = 'https://www.linkedin.com/in/lucy-ali-654b79160/',
  image_url = '/images/leadership/lucy-ali.svg',
  display_order = 20,
  is_active = true,
  updated_at = now()
where lower(full_name) = 'lucy ali'
   or lower(email) = 'lucy.ali@stratexanalytics.co.uk';

insert into public.stratex_leadership_members (
  full_name, first_name, last_name, email, job_title, permission_role, bio,
  linkedin_url, image_url, focus_chip, summary, focus_areas, display_order, is_active
)
select
  'Lucy Ali', 'Lucy', 'Ali', 'lucy.ali@stratexanalytics.co.uk',
  'Director of Operations', 'Operations',
  'Lucy leads the day-to-day operations of ScoutLink, including internal processes, outreach delivery, coach and scout relationships, customer management and event operations. She ensures the business runs smoothly as ScoutLink grows.',
  'https://www.linkedin.com/in/lucy-ali-654b79160/', '/images/leadership/lucy-ali.svg',
  'Operations / Customer Success', 'Leads day-to-day operations, outreach delivery and customer management.',
  array['Internal processes','Outreach delivery','Customer management','Event operations'], 20, true
where not exists (
  select 1 from public.stratex_leadership_members
  where lower(full_name) = 'lucy ali'
     or lower(email) = 'lucy.ali@stratexanalytics.co.uk'
);

update public.stratex_leadership_members
set is_active = false, updated_at = now()
where lower(full_name) = 'rj inaba'
   or lower(email) = 'rodhinjunior.inaba@stratexanalytics.co.uk';

update public.stratex_leadership_members
set
  full_name = 'Alexandro Ilioaie',
  first_name = 'Alexandro',
  last_name = 'Ilioaie',
  email = 'alexandro.ilioaie@stratexanalytics.co.uk',
  job_title = 'Director of Football Strategy & Growth',
  permission_role = 'Football Strategy / Growth',
  focus_chip = 'Football Strategy / Growth',
  summary = 'Leads football strategy, growth initiatives and sporting direction.',
  bio = 'Alexandro leads ScoutLink football strategy, growth initiatives and sporting direction. He shapes showcase events, awards, partnerships and community ideas that help ScoutLink grow credibly within the football world.',
  focus_areas = array['Football strategy','Showcase events','Awards','Partnerships'],
  linkedin_url = 'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/',
  image_url = '/images/leadership/alexandro-ilioaie.svg',
  display_order = 30,
  is_active = true,
  updated_at = now()
where lower(full_name) = 'alexandro ilioaie'
   or lower(email) = 'alexandro.ilioaie@stratexanalytics.co.uk';

insert into public.stratex_leadership_members (
  full_name, first_name, last_name, email, job_title, permission_role, bio,
  linkedin_url, image_url, focus_chip, summary, focus_areas, display_order, is_active
)
select
  'Alexandro Ilioaie', 'Alexandro', 'Ilioaie', 'alexandro.ilioaie@stratexanalytics.co.uk',
  'Director of Football Strategy & Growth', 'Football Strategy / Growth',
  'Alexandro leads ScoutLink football strategy, growth initiatives and sporting direction. He shapes showcase events, awards, partnerships and community ideas that help ScoutLink grow credibly within the football world.',
  'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/', '/images/leadership/alexandro-ilioaie.svg',
  'Football Strategy / Growth', 'Leads football strategy, growth initiatives and sporting direction.',
  array['Football strategy','Showcase events','Awards','Partnerships'], 30, true
where not exists (
  select 1 from public.stratex_leadership_members
  where lower(full_name) = 'alexandro ilioaie'
     or lower(email) = 'alexandro.ilioaie@stratexanalytics.co.uk'
);

notify pgrst, 'reload schema';
