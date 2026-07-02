-- ScoutLink v3.21 - Hiring content, benefits and compensation metadata

alter table public.job_posts
  add column if not exists benefits text,
  add column if not exists application_instructions text,
  add column if not exists compensation_type text not null default 'paid_role',
  add column if not exists compensation_notes text;

update public.job_posts
set
  compensation_type = coalesce(nullif(compensation_type, ''), 'paid_role'),
  interview_stage_count = greatest(coalesce(interview_stage_count, 1), 0);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_posts_compensation_type_check'
      and conrelid = 'public.job_posts'::regclass
  ) then
    alter table public.job_posts
      add constraint job_posts_compensation_type_check
      check (compensation_type in ('paid_role', 'unpaid_internship', 'paid_internship', 'commission_based'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_posts_interview_stage_count_nonnegative'
      and conrelid = 'public.job_posts'::regclass
  ) then
    alter table public.job_posts
      add constraint job_posts_interview_stage_count_nonnegative
      check (interview_stage_count >= 0);
  end if;
end $$;

notify pgrst, 'reload schema';
