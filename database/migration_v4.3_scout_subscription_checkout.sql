-- ScoutLink subscription Checkout reconciliation for accepted Scout registrations.
-- Additive only: legacy manually-confirmed registrations remain valid and untouched.

alter table if exists public.registration_requests
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_product_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_payment_status text,
  add column if not exists stripe_last_event_id text,
  add column if not exists stripe_checkout_created_at timestamptz,
  add column if not exists stripe_checkout_expires_at timestamptz,
  add column if not exists stripe_amount_total bigint,
  add column if not exists stripe_currency text,
  add column if not exists activation_email_sent_at timestamptz;

create unique index if not exists registration_requests_stripe_checkout_session_uidx
  on public.registration_requests (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists registration_requests_stripe_subscription_uidx
  on public.registration_requests (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists registration_requests_stripe_payment_status_idx
  on public.registration_requests (stripe_payment_status)
  where stripe_payment_status is not null;

alter table if exists public.scouts
  add column if not exists source_registration_request_id uuid references public.registration_requests(id) on delete set null,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

create unique index if not exists scouts_source_registration_request_uidx
  on public.scouts (source_registration_request_id)
  where source_registration_request_id is not null;

create index if not exists scouts_stripe_subscription_idx
  on public.scouts (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.registration_requests.stripe_checkout_session_id is
  'Unique Stripe-hosted Checkout Session generated after an authorised Scout safeguarding approval.';
comment on column public.registration_requests.stripe_subscription_id is
  'Stripe subscription created by the accepted Scout Checkout Session.';
comment on column public.scouts.source_registration_request_id is
  'Registration request that created this Scout account; used to make Stripe webhook activation idempotent.';
