-- ScoutLink / Stratex migration v3.33
-- Stratex public launch polish: leadership profile metadata.

alter table if exists public.stratex_leadership_members
  add column if not exists linkedin_url text,
  add column if not exists focus_chip text,
  add column if not exists summary text,
  add column if not exists focus_areas text[] not null default '{}'::text[];

update public.stratex_leadership_members
set
  first_name = 'Richdhin',
  last_name = 'Inaba',
  email = 'richdhin@stratexanalytics.co.uk',
  job_title = 'Founder & CEO',
  permission_role = 'Founder / Product Strategy',
  focus_chip = 'Founder / Product Strategy',
  summary = 'Leads company vision, product direction and long-term strategy.',
  bio = 'Richdhin leads the vision, product direction and long-term strategy for Stratex Analytics. His focus is building a trusted football intelligence company that gives overlooked grassroots players a safer and more structured route to visibility and opportunity.',
  focus_areas = array['Company Vision','Product Direction','Long-Term Strategy','Football Intelligence Model'],
  linkedin_url = 'https://www.linkedin.com/in/richdhin-i-470a15109/',
  display_order = 10,
  is_active = true,
  updated_at = now()
where lower(full_name) = 'richdhin inaba';

insert into public.stratex_leadership_members (
  full_name, first_name, last_name, email, job_title, permission_role, bio,
  linkedin_url, focus_chip, summary, focus_areas, display_order, is_active
)
select
  'Richdhin Inaba', 'Richdhin', 'Inaba', 'richdhin@stratexanalytics.co.uk',
  'Founder & CEO', 'Founder / Product Strategy',
  'Richdhin leads the vision, product direction and long-term strategy for Stratex Analytics. His focus is building a trusted football intelligence company that gives overlooked grassroots players a safer and more structured route to visibility and opportunity.',
  'https://www.linkedin.com/in/richdhin-i-470a15109/', 'Founder / Product Strategy',
  'Leads company vision, product direction and long-term strategy.',
  array['Company Vision','Product Direction','Long-Term Strategy','Football Intelligence Model'],
  10, true
where not exists (
  select 1 from public.stratex_leadership_members where lower(full_name) = 'richdhin inaba'
);

update public.stratex_leadership_members
set
  first_name = 'Lucy',
  last_name = 'Ali',
  email = 'lucy.ali@stratexanalytics.co.uk',
  job_title = 'Director of Customer Operations',
  permission_role = 'Operations',
  focus_chip = 'Operations',
  summary = 'Leads onboarding, customer operations and user success.',
  bio = 'Lucy leads customer operations, onboarding and user success across the Stratex ecosystem. Her focus is making sure coaches, scouts and partners are supported properly, with clear processes and a reliable experience from first contact through to active platform use.',
  focus_areas = array['Customer Operations','Onboarding','User Success','Operational Process'],
  linkedin_url = 'https://www.linkedin.com/in/lucy-ali-654b79160/',
  display_order = 20,
  is_active = true,
  updated_at = now()
where lower(full_name) = 'lucy ali';

insert into public.stratex_leadership_members (
  full_name, first_name, last_name, email, job_title, permission_role, bio,
  linkedin_url, focus_chip, summary, focus_areas, display_order, is_active
)
select
  'Lucy Ali', 'Lucy', 'Ali', 'lucy.ali@stratexanalytics.co.uk',
  'Director of Customer Operations', 'Operations',
  'Lucy leads customer operations, onboarding and user success across the Stratex ecosystem. Her focus is making sure coaches, scouts and partners are supported properly, with clear processes and a reliable experience from first contact through to active platform use.',
  'https://www.linkedin.com/in/lucy-ali-654b79160/', 'Operations',
  'Leads onboarding, customer operations and user success.',
  array['Customer Operations','Onboarding','User Success','Operational Process'],
  20, true
where not exists (
  select 1 from public.stratex_leadership_members where lower(full_name) = 'lucy ali'
);

do $$
begin
  if exists (select 1 from public.stratex_leadership_members where lower(full_name) = 'alexandro ilioaie') then
    update public.stratex_leadership_members
    set is_active = false, updated_at = now()
    where lower(full_name) = 'rj inaba'
       or lower(email) = 'rodhinjunior.inaba@stratexanalytics.co.uk';
  else
    update public.stratex_leadership_members
    set
      full_name = 'Alexandro Ilioaie',
      first_name = 'Alexandro',
      last_name = 'Ilioaie',
      email = 'alexandro.ilioaie@stratexanalytics.co.uk',
      job_title = 'Director of Growth',
      permission_role = 'Growth / Partnerships',
      focus_chip = 'Growth / Partnerships',
      summary = 'Leads growth, partnerships and market visibility.',
      bio = 'Alexandro leads growth across partnerships, acquisition and market visibility. His focus is helping Stratex reach the right coaches, scouts, clubs and football organisations while building a credible brand around grassroots football intelligence.',
      focus_areas = array['Growth Strategy','Partnerships','Coach/Scout Acquisition','Market Visibility'],
      linkedin_url = 'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/',
      display_order = 30,
      is_active = true,
      updated_at = now()
    where lower(full_name) = 'rj inaba'
       or lower(email) = 'rodhinjunior.inaba@stratexanalytics.co.uk';
  end if;
end $$;

insert into public.stratex_leadership_members (
  full_name, first_name, last_name, email, job_title, permission_role, bio,
  linkedin_url, focus_chip, summary, focus_areas, display_order, is_active
)
select
  'Alexandro Ilioaie', 'Alexandro', 'Ilioaie', 'alexandro.ilioaie@stratexanalytics.co.uk',
  'Director of Growth', 'Growth / Partnerships',
  'Alexandro leads growth across partnerships, acquisition and market visibility. His focus is helping Stratex reach the right coaches, scouts, clubs and football organisations while building a credible brand around grassroots football intelligence.',
  'https://www.linkedin.com/in/alexandro-ilioaie-a0347025a/', 'Growth / Partnerships',
  'Leads growth, partnerships and market visibility.',
  array['Growth Strategy','Partnerships','Coach/Scout Acquisition','Market Visibility'],
  30, true
where not exists (
  select 1 from public.stratex_leadership_members where lower(full_name) = 'alexandro ilioaie'
);

notify pgrst, 'reload schema';
