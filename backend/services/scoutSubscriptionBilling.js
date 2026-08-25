'use strict';

const Stripe = require('stripe');
const { supabase } = require('../db/supabase');
const config = require('../config');
const email = require('../services/email');
const { generateId } = require('../utils/auth');
const { normalizePlan, limitsForPlan, addSubscriptionYear } = require('../utils/scoutPlans');

const API_VERSION = '2026-07-29.dahlia';
const PRICE_CACHE_MS = 5 * 60 * 1000;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid']);

let stripeInstance = null;
let cachedPrices = null;
let cachedPricesAt = 0;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: API_VERSION });
  }
  return stripeInstance;
}

function text(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function metadataFor(price) {
  const product = price && price.product && typeof price.product === 'object'
    ? price.product
    : {};
  return Object.assign({}, product.metadata || {}, price.metadata || {});
}

function productIdFor(price) {
  if (!price) return null;
  if (typeof price.product === 'string') return price.product;
  return price.product && price.product.id ? price.product.id : null;
}

function planForPrice(price) {
  const metadata = metadataFor(price);
  return normalizePlan(metadata.plan || metadata.plan_name || metadata.scout_plan || '');
}

function isScoutSubscriptionPrice(price) {
  if (!price || price.active === false || price.type !== 'recurring' || !price.recurring) return false;
  const metadata = metadataFor(price);
  return text(metadata.platform).toLowerCase() === 'scoutlink' &&
    text(metadata.product_category).toLowerCase() === 'subscription' &&
    String(price.currency || '').toLowerCase() === 'gbp';
}

async function liveScoutSubscriptionPrices(force = false) {
  if (!force && cachedPrices && Date.now() - cachedPricesAt < PRICE_CACHE_MS) {
    return cachedPrices;
  }

  const all = [];
  let startingAfter;
  do {
    const page = await stripe().prices.list({
      active: true,
      type: 'recurring',
      currency: 'gbp',
      limit: 100,
      expand: ['data.product'],
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });
    all.push(...(page.data || []));
    startingAfter = page.has_more && page.data.length ? page.data[page.data.length - 1].id : null;
  } while (startingAfter);

  cachedPrices = all.filter(isScoutSubscriptionPrice);
  cachedPricesAt = Date.now();
  return cachedPrices;
}

async function priceForPlan(plan) {
  const wanted = normalizePlan(plan);
  const prices = await liveScoutSubscriptionPrices();
  const exact = prices.filter(price => planForPrice(price) === wanted);

  if (exact.length !== 1) {
    throw new Error(
      exact.length === 0
        ? `Stripe has no active ScoutLink subscription price for the ${wanted} plan.`
        : `Stripe has more than one active ScoutLink subscription price for the ${wanted} plan. Archive the duplicate before approving Scouts.`
    );
  }

  return exact[0];
}

function checkoutBaseUrl() {
  return String(config.brandUrl || 'https://www.scoutlink.app').replace(/\/+$/, '');
}

function checkoutMetadata(registration, plan, price) {
  return {
    platform: 'scoutlink',
    purchase_type: 'subscription_registration',
    registration_request_id: String(registration.id),
    selected_plan: normalizePlan(plan),
    price_id: String(price.id)
  };
}

async function expireOpenSession(sessionId) {
  if (!sessionId) return;
  try {
    const current = await stripe().checkout.sessions.retrieve(sessionId);
    if (current && current.status === 'open') {
      await stripe().checkout.sessions.expire(sessionId);
    }
  } catch (error) {
    if (!/No such checkout\.session/i.test(String(error && error.message))) {
      console.warn('[Scout subscription] Could not expire previous Checkout Session:', error.message);
    }
  }
}

async function createCheckoutForRegistration(registration, options = {}) {
  if (!registration || !registration.id) throw new Error('Registration request is required.');
  if (String(registration.account_type || '').toLowerCase() !== 'scout') {
    throw new Error('Stripe subscription Checkout is only used for Scout registrations.');
  }

  const plan = normalizePlan(registration.preferred_scout_plan || registration.payment_plan || 'Core');
  const price = await priceForPlan(plan);

  if (options.replaceExisting && registration.stripe_checkout_session_id) {
    await expireOpenSession(registration.stripe_checkout_session_id);
  } else if (registration.stripe_checkout_session_id) {
    try {
      const existing = await stripe().checkout.sessions.retrieve(registration.stripe_checkout_session_id);
      if (existing && existing.status === 'open' && existing.url) {
        return { session: existing, price, plan, reused: true };
      }
    } catch (_) {}
  }

  const metadata = checkoutMetadata(registration, plan, price);
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer_email: text(registration.email, 320).toLowerCase(),
    client_reference_id: String(registration.id),
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: checkoutBaseUrl() + '/login?subscription=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: checkoutBaseUrl() + '/login?subscription=cancelled',
    allow_promotion_codes: false,
    billing_address_collection: 'auto',
    metadata,
    subscription_data: { metadata },
    automatic_tax: { enabled: false }
  });

  if (!session || !session.id || !session.url) {
    throw new Error('Stripe did not return a hosted Checkout URL.');
  }

  return { session, price, plan, reused: false };
}

async function checkoutWithLines(sessionId) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer']
  });
  const lines = await stripe().checkout.sessions.listLineItems(sessionId, {
    limit: 10,
    expand: ['data.price.product']
  });
  return { session, lines: lines.data || [] };
}

function asId(value) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id || null;
}

function stripeDate(seconds, fallback) {
  const value = Number(seconds);
  if (Number.isFinite(value) && value > 0) return new Date(value * 1000);
  return fallback || null;
}

function subscriptionPeriod(subscription, fallbackDate) {
  const item = subscription && subscription.items && subscription.items.data && subscription.items.data[0];
  const start = stripeDate(
    subscription && subscription.current_period_start || item && item.current_period_start,
    fallbackDate || new Date()
  );
  const end = stripeDate(
    subscription && subscription.current_period_end || item && item.current_period_end,
    null
  ) || addSubscriptionYear(start);
  return { start, end };
}

async function uniqueLoginCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
    const [scout, coach, staff] = await Promise.all([
      supabase.from('scouts').select('id').eq('login_code', code).maybeSingle(),
      supabase.from('coaches').select('id').eq('login_code', code).maybeSingle(),
      supabase.from('stratex').select('id').eq('login_code', code).maybeSingle()
    ]);
    if (!scout.data && !coach.data && !staff.data) return code;
  }
  throw new Error('Could not generate a unique Scout login code.');
}

async function ensureVerificationReview(registration, scoutId, status) {
  const { data: existing, error } = await supabase
    .from('scout_verification_reviews')
    .select('id')
    .eq('registration_request_id', registration.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const review = registration.safeguarding_review || {};
  const values = {
    registration_request_id: registration.id,
    scout_id: scoutId || null,
    checklist: review.checklist || {},
    documents: Array.isArray(registration.safeguarding_documents) ? registration.safeguarding_documents : [],
    dbs_certificate_number: review.dbsCertificateNumber || null,
    dbs_issue_date: review.dbsIssueDate || null,
    dbs_level: review.dbsLevel || null,
    status,
    notes: review.notes || null,
    updated_at: new Date().toISOString()
  };

  if (existing && existing.id) {
    const update = await supabase.from('scout_verification_reviews').update(values).eq('id', existing.id);
    if (update.error) throw update.error;
    return;
  }

  const insert = await supabase.from('scout_verification_reviews').insert(values);
  if (insert.error) throw insert.error;
}

async function existingScoutForRegistration(registration) {
  if (registration.linked_account_id) {
    const byLinked = await supabase
      .from('scouts')
      .select('*')
      .eq('id', registration.linked_account_id)
      .maybeSingle();
    if (byLinked.error) throw byLinked.error;
    if (byLinked.data) return byLinked.data;
  }

  const bySource = await supabase
    .from('scouts')
    .select('*')
    .eq('source_registration_request_id', registration.id)
    .maybeSingle();
  if (bySource.error) throw bySource.error;
  return bySource.data || null;
}

async function createScout(registration, subscription, customerId, price, plan, loginCode) {
  const limits = limitsForPlan(plan);
  const period = subscriptionPeriod(subscription, new Date());
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase.from('scouts').insert({
    scout_id: generateId('SCT'),
    first_name: registration.first_name,
    last_name: registration.last_name,
    email: registration.email,
    phone: registration.phone || null,
    club_name: registration.scout_club || registration.scouting_team_name || null,
    club_league: registration.scout_league || null,
    login_code: loginCode,
    login_code_expires: expires,
    is_active: true,
    preferences_set: false,
    is_super_user: false,
    registration_complete: false,
    subscription_plan: plan,
    plan_start: period.start,
    plan_end: period.end,
    exports_remaining: limits.exports,
    predictions_remaining: limits.predictions,
    interests_remaining: limits.interests,
    source_registration_request_id: registration.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription && subscription.id || null,
    stripe_price_id: price && price.id || null
  }).select('*').single();

  if (error) throw error;
  return data;
}

async function sendActivationEmail(registration, scout, loginCode) {
  if (registration.activation_email_sent_at) return { success: true, skipped: true };
  const completeLink = checkoutBaseUrl() +
    '/confirm-password?code=' + encodeURIComponent(loginCode) +
    '&email=' + encodeURIComponent(registration.email) +
    '&type=Scout';

  const result = await email.sendRegApproved({
    to: registration.email,
    firstName: registration.first_name,
    loginCode,
    accountType: 'Scout',
    completeLink,
    email: registration.email
  }).catch(error => ({ success: false, error: error.message }));

  if (result && result.success) {
    await supabase.from('registration_requests').update({
      activation_email_sent_at: new Date().toISOString()
    }).eq('id', registration.id);
  } else {
    console.error('[Scout subscription] Payment succeeded but activation email was not accepted:', result && result.error);
  }
  return Object.assign({ completeLink }, result || {});
}

async function activatePaidScoutRegistration(rawSession, eventId) {
  if (!rawSession || !rawSession.id) return { ignored: true };
  const { session, lines } = await checkoutWithLines(rawSession.id);
  const metadata = session.metadata || {};

  if (text(metadata.platform).toLowerCase() !== 'scoutlink' ||
      text(metadata.purchase_type).toLowerCase() !== 'subscription_registration') {
    return { ignored: true };
  }

  if (!['paid', 'no_payment_required'].includes(String(session.payment_status || '').toLowerCase())) {
    return { ignored: true, reason: 'not_paid' };
  }

  const registrationId = text(metadata.registration_request_id, 80);
  if (!registrationId) throw new Error('Scout subscription Checkout has no registration_request_id metadata.');

  const { data: registration, error: registrationError } = await supabase
    .from('registration_requests')
    .select('*')
    .eq('id', registrationId)
    .maybeSingle();
  if (registrationError) throw registrationError;
  if (!registration) throw new Error('Scout registration for Stripe Checkout could not be found.');
  if (String(registration.account_type || '').toLowerCase() !== 'scout') {
    throw new Error('Stripe Checkout registration is not a Scout registration.');
  }

  if (lines.length !== 1 || !lines[0].price) {
    throw new Error('Scout subscription Checkout must contain exactly one priced line item.');
  }

  const paidPrice = lines[0].price;
  if (!isScoutSubscriptionPrice(paidPrice)) {
    throw new Error('Paid Checkout line is not an active ScoutLink subscription price.');
  }

  const selectedPlan = normalizePlan(registration.preferred_scout_plan || registration.payment_plan || metadata.selected_plan || 'Core');
  const paidPlan = planForPrice(paidPrice);
  if (selectedPlan !== paidPlan || normalizePlan(metadata.selected_plan) !== paidPlan) {
    throw new Error(`Paid Stripe plan (${paidPlan}) does not match the Scout-selected plan (${selectedPlan}).`);
  }

  const subscriptionId = asId(session.subscription);
  if (!subscriptionId) throw new Error('Paid Scout Checkout did not create a Stripe subscription.');
  const subscription = typeof session.subscription === 'object'
    ? session.subscription
    : await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = asId(session.customer);

  let scout = await existingScoutForRegistration(registration);
  let loginCode = registration.login_code || scout && scout.login_code || null;

  if (!scout) {
    loginCode = await uniqueLoginCode();
    try {
      scout = await createScout(registration, subscription, customerId, paidPrice, paidPlan, loginCode);
    } catch (error) {
      if (String(error && error.code) === '23505') {
        scout = await existingScoutForRegistration(registration);
      }
      if (!scout) throw error;
    }
  } else {
    const period = subscriptionPeriod(subscription, scout.plan_start ? new Date(scout.plan_start) : new Date());
    const updateScout = await supabase.from('scouts').update({
      subscription_plan: paidPlan,
      plan_start: period.start,
      plan_end: period.end,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: paidPrice.id,
      source_registration_request_id: registration.id,
      is_active: ACTIVE_SUBSCRIPTION_STATUSES.has(String(subscription.status || '').toLowerCase())
    }).eq('id', scout.id).select('*').single();
    if (updateScout.error) throw updateScout.error;
    scout = updateScout.data;
  }

  const registrationUpdate = await supabase.from('registration_requests').update({
    status: 'approved',
    verification_status: 'activated',
    login_code: loginCode,
    payment_received_at: registration.payment_received_at || new Date().toISOString(),
    activated_at: registration.activated_at || new Date().toISOString(),
    linked_account_id: String(scout.id),
    linked_account_type: 'Scout',
    payment_plan: paidPlan,
    payment_link: session.url || registration.payment_link,
    stripe_checkout_session_id: session.id,
    stripe_price_id: paidPrice.id,
    stripe_product_id: productIdFor(paidPrice),
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_payment_status: session.payment_status || subscription.status || 'paid',
    stripe_last_event_id: eventId || null,
    stripe_amount_total: session.amount_total == null ? null : Number(session.amount_total),
    stripe_currency: String(session.currency || paidPrice.currency || 'gbp').toLowerCase()
  }).eq('id', registration.id);
  if (registrationUpdate.error) throw registrationUpdate.error;

  await ensureVerificationReview(registration, scout.id, 'approved');
  const activationEmail = await sendActivationEmail(registration, scout, loginCode);

  return {
    activated: true,
    registrationId: registration.id,
    scoutId: scout.id,
    plan: paidPlan,
    activationEmail
  };
}

async function syncSubscriptionLifecycle(subscription, eventId) {
  if (!subscription || !subscription.id) return { ignored: true };
  const metadata = subscription.metadata || {};
  if (text(metadata.platform).toLowerCase() !== 'scoutlink' ||
      text(metadata.purchase_type).toLowerCase() !== 'subscription_registration') {
    return { ignored: true };
  }

  const registrationId = text(metadata.registration_request_id, 80);
  const period = subscriptionPeriod(subscription, new Date());
  const active = ACTIVE_SUBSCRIPTION_STATUSES.has(String(subscription.status || '').toLowerCase());

  const scoutQuery = registrationId
    ? supabase.from('scouts').select('id').eq('source_registration_request_id', registrationId).maybeSingle()
    : supabase.from('scouts').select('id').eq('stripe_subscription_id', subscription.id).maybeSingle();
  const scoutResult = await scoutQuery;
  if (scoutResult.error) throw scoutResult.error;

  if (scoutResult.data) {
    const scoutUpdate = await supabase.from('scouts').update({
      plan_start: period.start,
      plan_end: period.end,
      is_active: active,
      stripe_subscription_id: subscription.id
    }).eq('id', scoutResult.data.id);
    if (scoutUpdate.error) throw scoutUpdate.error;
  }

  let registrationQuery = supabase.from('registration_requests').update({
    stripe_subscription_id: subscription.id,
    stripe_customer_id: asId(subscription.customer),
    stripe_payment_status: subscription.status || null,
    stripe_last_event_id: eventId || null
  });
  registrationQuery = registrationId
    ? registrationQuery.eq('id', registrationId)
    : registrationQuery.eq('stripe_subscription_id', subscription.id);
  const registrationUpdate = await registrationQuery;
  if (registrationUpdate.error) throw registrationUpdate.error;

  return { synced: true, active };
}

module.exports = {
  API_VERSION,
  activatePaidScoutRegistration,
  createCheckoutForRegistration,
  isScoutSubscriptionPrice,
  liveScoutSubscriptionPrices,
  normalizePlan,
  planForPrice,
  priceForPlan,
  stripe,
  syncSubscriptionLifecycle
};
