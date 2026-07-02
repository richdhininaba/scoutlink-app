-- ScoutLink v3.22 - Hiring reporting line, open positions and commission pay frequency

alter table public.job_posts
  add column if not exists reporting_to_id uuid references public.stratex(id) on delete set null,
  add column if not exists reporting_to_name text,
  add column if not exists positions_available integer not null default 1;

update public.job_posts
set positions_available = greatest(coalesce(positions_available, 1), 1);

alter table public.job_posts
  drop constraint if exists job_posts_salary_unit_check;

alter table public.job_posts
  add constraint job_posts_salary_unit_check
  check (salary_unit in ('hourly','daily','monthly','annually','commission'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_posts_positions_available_positive'
      and conrelid = 'public.job_posts'::regclass
  ) then
    alter table public.job_posts
      add constraint job_posts_positions_available_positive
      check (positions_available >= 1);
  end if;
end $$;

create index if not exists job_posts_reporting_to_idx
  on public.job_posts(reporting_to_id, status);

notify pgrst, 'reload schema';
