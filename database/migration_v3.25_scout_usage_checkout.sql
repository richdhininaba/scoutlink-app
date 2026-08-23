-- ScoutLink Scout Experience V6: direct usage checkout + Radar usage ledger
-- Run this migration once in the ScoutLink Supabase project before deploying
-- the backend/frontend commits that depend on it.

begin;

alter table public.scouts
  add column if not exists limit_overrides jsonb not null default '{}'::jsonb;

create table if not exists public.scout_usage_purchases (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  scout_team_id uuid references public.scout_teams(id) on delete set null,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_price_id text not null,
  top_up_type text not null check (
    top_up_type in ('prediction','export','interest_request','ask_radar')
  ),
  quantity integer not null check (quantity > 0),
  base_limit integer not null default 0 check (base_limit >= 0),
  amount_total bigint,
  currency text,
  status text not null default 'paid' check (
    status in ('paid','refunded','disputed')
  ),
  stripe_event_id text,
  paid_at timestamptz not null default now(),
  reversed_at timestamptz,
  reversal_event_id text,
  reversal_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scout_usage_purchases_scout_idx
  on public.scout_usage_purchases (scout_id, paid_at desc);

create index if not exists scout_usage_purchases_team_idx
  on public.scout_usage_purchases (scout_team_id, paid_at desc);

create index if not exists scout_usage_purchases_payment_intent_idx
  on public.scout_usage_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.scout_usage_purchases enable row level security;

revoke all on table public.scout_usage_purchases from anon, authenticated;

-- The signed-in web client never writes this table directly. The API uses the
-- server-side service role after Stripe webhook verification.
grant all on table public.scout_usage_purchases to service_role;

-- Bring any historic standalone Scout accounts into the team-scoped model that
-- the current Scout experience expects. Existing usage/workflow rows are moved
-- to the new team scope before the Scout record is switched.
do $$
declare
  r record;
  new_team_id uuid;
  table_name text;
  scoped_tables text[] := array[
    'predictions_log',
    'recruitment_pipeline',
    'scout_activity_events',
    'scout_comments',
    'scout_comparisons',
    'scout_decision_votes',
    'scout_decisions',
    'scout_exports',
    'scout_fixture_plans',
    'scout_observations',
    'scout_player_watches',
    'scout_player_workflow_entries',
    'scout_reports',
    'scout_saved_searches',
    'scout_shortlists',
    'scout_tasks',
    'scout_usage_events',
    'usage_requests'
  ];
begin
  for r in
    select *
    from public.scouts
    where scout_team_id is null
      and coalesce(is_demo, false) = false
  loop
    insert into public.scout_teams (
      team_name,
      club_name,
      status,
      subscription_plan,
      subscription_start_at,
      subscription_renewal_at,
      activated_at,
      plan_limits,
      limit_overrides,
      updated_at
    )
    values (
      coalesce(
        nullif(trim(r.club_name), ''),
        nullif(trim(concat_ws(' ', r.first_name, r.last_name)), '') || ' Scout Workspace',
        'Scout Workspace'
      ),
      nullif(trim(r.club_name), ''),
      'active',
      coalesce(nullif(trim(r.subscription_plan), ''), 'Core'),
      r.plan_start,
      r.plan_end,
      now(),
      '{}'::jsonb,
      coalesce(r.limit_overrides, '{}'::jsonb),
      now()
    )
    returning id into new_team_id;

    foreach table_name in array scoped_tables
    loop
      if to_regclass('public.' || table_name) is not null then
        execute format(
          'update public.%I set scout_team_id = $1 where scout_id = $2 and scout_team_id is null',
          table_name
        )
        using new_team_id, r.id;
      end if;
    end loop;

    update public.scouts
    set scout_team_id = new_team_id,
        is_super_user = true,
        updated_at = now()
    where id = r.id;
  end loop;
end
$$;

create or replace function public.apply_scout_usage_top_up(
  p_scout_id uuid,
  p_scout_team_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_price_id text,
  p_top_up_type text,
  p_quantity integer,
  p_base_limit integer,
  p_amount_total bigint,
  p_currency text,
  p_stripe_event_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_id uuid;
  limit_key text;
  current_overrides jsonb;
  current_limit integer;
  target_team_id uuid;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Top-up quantity must be greater than zero';
  end if;

  if p_top_up_type = 'prediction' then
    limit_key := 'predictions';
  elsif p_top_up_type = 'export' then
    limit_key := 'exports';
  elsif p_top_up_type = 'interest_request' then
    limit_key := 'interests';
  elsif p_top_up_type = 'ask_radar' then
    limit_key := 'radar';
  else
    raise exception 'Unsupported top-up type: %', p_top_up_type;
  end if;

  select scout_team_id
  into target_team_id
  from public.scouts
  where id = p_scout_id
  for update;

  if not found then
    raise exception 'Scout not found';
  end if;

  if p_scout_team_id is not null and target_team_id is distinct from p_scout_team_id then
    raise exception 'Scout team does not match authenticated Scout';
  end if;

  insert into public.scout_usage_purchases (
    scout_id,
    scout_team_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_price_id,
    top_up_type,
    quantity,
    base_limit,
    amount_total,
    currency,
    status,
    stripe_event_id,
    metadata,
    paid_at,
    updated_at
  )
  values (
    p_scout_id,
    target_team_id,
    p_checkout_session_id,
    nullif(p_payment_intent_id, ''),
    p_price_id,
    p_top_up_type,
    p_quantity,
    greatest(coalesce(p_base_limit, 0), 0),
    p_amount_total,
    lower(nullif(p_currency, '')),
    'paid',
    p_stripe_event_id,
    coalesce(p_metadata, '{}'::jsonb),
    now(),
    now()
  )
  on conflict (stripe_checkout_session_id) do nothing
  returning id into purchase_id;

  if purchase_id is null then
    return false;
  end if;

  if target_team_id is not null then
    select coalesce(limit_overrides, '{}'::jsonb)
    into current_overrides
    from public.scout_teams
    where id = target_team_id
    for update;

    current_limit := coalesce(
      nullif(current_overrides ->> limit_key, '')::integer,
      greatest(coalesce(p_base_limit, 0), 0)
    );

    update public.scout_teams
    set limit_overrides = jsonb_set(
          coalesce(limit_overrides, '{}'::jsonb),
          array[limit_key],
          to_jsonb(greatest(current_limit, 0) + p_quantity),
          true
        ),
        override_reason = 'Stripe self-serve usage top-up',
        updated_at = now()
    where id = target_team_id;
  else
    select coalesce(limit_overrides, '{}'::jsonb)
    into current_overrides
    from public.scouts
    where id = p_scout_id
    for update;

    current_limit := coalesce(
      nullif(current_overrides ->> limit_key, '')::integer,
      greatest(coalesce(p_base_limit, 0), 0)
    );

    update public.scouts
    set limit_overrides = jsonb_set(
          coalesce(limit_overrides, '{}'::jsonb),
          array[limit_key],
          to_jsonb(greatest(current_limit, 0) + p_quantity),
          true
        ),
        updated_at = now()
    where id = p_scout_id;
  end if;

  insert into public.scout_usage_events (
    scout_id,
    scout_team_id,
    event_type,
    quantity,
    metadata,
    created_at
  )
  values (
    p_scout_id,
    target_team_id,
    'usage_top_up_purchase',
    p_quantity,
    jsonb_build_object(
      'checkout_session_id', p_checkout_session_id,
      'price_id', p_price_id,
      'top_up_type', p_top_up_type,
      'stripe_event_id', p_stripe_event_id
    ) || coalesce(p_metadata, '{}'::jsonb),
    now()
  );

  return true;
end;
$$;

revoke all on function public.apply_scout_usage_top_up(
  uuid, uuid, text, text, text, text, integer, integer, bigint, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_scout_usage_top_up(
  uuid, uuid, text, text, text, text, integer, integer, bigint, text, text, jsonb
) to service_role;

create or replace function public.reverse_scout_usage_top_up(
  p_checkout_session_id text,
  p_stripe_event_id text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase public.scout_usage_purchases%rowtype;
  limit_key text;
  current_overrides jsonb;
  current_limit integer;
  new_limit integer;
begin
  select *
  into purchase
  from public.scout_usage_purchases
  where stripe_checkout_session_id = p_checkout_session_id
  for update;

  if not found or purchase.status <> 'paid' then
    return false;
  end if;

  if purchase.top_up_type = 'prediction' then
    limit_key := 'predictions';
  elsif purchase.top_up_type = 'export' then
    limit_key := 'exports';
  elsif purchase.top_up_type = 'interest_request' then
    limit_key := 'interests';
  elsif purchase.top_up_type = 'ask_radar' then
    limit_key := 'radar';
  else
    return false;
  end if;

  if purchase.scout_team_id is not null then
    select coalesce(limit_overrides, '{}'::jsonb)
    into current_overrides
    from public.scout_teams
    where id = purchase.scout_team_id
    for update;

    current_limit := coalesce(
      nullif(current_overrides ->> limit_key, '')::integer,
      purchase.base_limit
    );
    new_limit := greatest(current_limit - purchase.quantity, purchase.base_limit);

    if new_limit <= purchase.base_limit then
      update public.scout_teams
      set limit_overrides = coalesce(limit_overrides, '{}'::jsonb) - limit_key,
          override_reason = 'Stripe usage top-up reversed',
          updated_at = now()
      where id = purchase.scout_team_id;
    else
      update public.scout_teams
      set limit_overrides = jsonb_set(
            coalesce(limit_overrides, '{}'::jsonb),
            array[limit_key],
            to_jsonb(new_limit),
            true
          ),
          override_reason = 'Stripe usage top-up reversed',
          updated_at = now()
      where id = purchase.scout_team_id;
    end if;
  else
    select coalesce(limit_overrides, '{}'::jsonb)
    into current_overrides
    from public.scouts
    where id = purchase.scout_id
    for update;

    current_limit := coalesce(
      nullif(current_overrides ->> limit_key, '')::integer,
      purchase.base_limit
    );
    new_limit := greatest(current_limit - purchase.quantity, purchase.base_limit);

    if new_limit <= purchase.base_limit then
      update public.scouts
      set limit_overrides = coalesce(limit_overrides, '{}'::jsonb) - limit_key,
          updated_at = now()
      where id = purchase.scout_id;
    else
      update public.scouts
      set limit_overrides = jsonb_set(
            coalesce(limit_overrides, '{}'::jsonb),
            array[limit_key],
            to_jsonb(new_limit),
            true
          ),
          updated_at = now()
      where id = purchase.scout_id;
    end if;
  end if;

  update public.scout_usage_purchases
  set status = case
        when lower(coalesce(p_reason, '')) like '%dispute%' then 'disputed'
        else 'refunded'
      end,
      reversed_at = now(),
      reversal_event_id = p_stripe_event_id,
      reversal_reason = p_reason,
      updated_at = now()
  where id = purchase.id;

  insert into public.scout_usage_events (
    scout_id,
    scout_team_id,
    event_type,
    quantity,
    metadata,
    created_at
  )
  values (
    purchase.scout_id,
    purchase.scout_team_id,
    'usage_top_up_reversal',
    purchase.quantity,
    jsonb_build_object(
      'checkout_session_id', purchase.stripe_checkout_session_id,
      'top_up_type', purchase.top_up_type,
      'stripe_event_id', p_stripe_event_id,
      'reason', p_reason
    ),
    now()
  );

  return true;
end;
$$;

revoke all on function public.reverse_scout_usage_top_up(text, text, text)
  from public, anon, authenticated;

grant execute on function public.reverse_scout_usage_top_up(text, text, text)
  to service_role;

commit;
