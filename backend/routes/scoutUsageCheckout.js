'use strict';

const express = require('express');
const Stripe = require('stripe');
const router = express.Router();

const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const {
  limitsForPlan,
  effectiveLimits
} = require('../utils/scoutPlans');
const { getScoutUsageSnapshot } = require('../utils/scoutUsage');

const ALLOWED_TYPES = new Set([
  'prediction',
  'export',
  'interest_request',
  'ask_radar'
]);

const TYPE_TO_LIMIT = Object.freeze({
  prediction: 'predictions',
  export: 'exports',
  interest_request: 'interests',
  ask_radar: 'radar'
});

const TYPE_LABELS = Object.freeze({
  prediction: 'Predictions',
  export: 'Exports',
  interest_request: 'Coach interests',
  ask_radar: 'Ask Radar credits'
});

let stripeInstance = null;
let packCache = null;
let packCacheAt = 0;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('Stripe is not configured.');
    error.status = 503;
    throw error;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-07-29.dahlia'
    });
  }

  return stripeInstance;
}

function text(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function integer(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function money(amount, currency) {
  const value = integer(amount);
  const unit = value / 100;
  const code = text(currency || 'gbp', 3).toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: unit % 1 ? 2 : 0
    }).format(unit);
  } catch (_) {
    return `£${unit.toFixed(unit % 1 ? 2 : 0)}`;
  }
}

function topUpMetadata(price) {
  const product =
    price &&
    price.product &&
    typeof price.product === 'object'
      ? price.product
      : {};
  return Object.assign(
    {},
    product.metadata || {},
    price.metadata || {}
  );
}

function validateTopUpPrice(price) {
  if (!price || !price.id || price.active === false) return null;
  if (price.type && price.type !== 'one_time') return null;

  const metadata = topUpMetadata(price);
  const platform = text(metadata.platform).toLowerCase();
  const category = text(metadata.product_category).toLowerCase();
  const type = text(metadata.top_up_type).toLowerCase();
  const quantity = integer(metadata.quantity_included);

  if (platform !== 'scoutlink') return null;
  if (category !== 'top_up') return null;
  if (!ALLOWED_TYPES.has(type)) return null;
  if (!quantity) return null;
  if (!price.unit_amount || !price.currency) return null;

  return {
    priceId: price.id,
    productId:
      price.product && typeof price.product === 'object'
        ? price.product.id
        : price.product || null,
    type,
    limitKey: TYPE_TO_LIMIT[type],
    label: TYPE_LABELS[type],
    quantity,
    amount: price.unit_amount,
    currency: price.currency,
    priceLabel: money(price.unit_amount, price.currency),
    productName:
      price.product && typeof price.product === 'object'
        ? text(price.product.name, 180)
        : '',
    sortOrder: [
      'prediction',
      'export',
      'interest_request',
      'ask_radar'
    ].indexOf(type)
  };
}

async function listPacks(force = false) {
  const now = Date.now();
  if (!force && packCache && now - packCacheAt < 5 * 60 * 1000) {
    return packCache;
  }

  const response = await stripe().prices.list({
    active: true,
    limit: 100,
    type: 'one_time',
    expand: ['data.product']
  });

  const packs = (response.data || [])
    .map(validateTopUpPrice)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.quantity - b.quantity;
    });

  packCache = packs;
  packCacheAt = now;
  return packs;
}

async function loadContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select([
      'id',
      'first_name',
      'last_name',
      'email',
      'club_name',
      'scout_team_id',
      'subscription_plan',
      'plan_start',
      'plan_end',
      'limit_overrides',
      'is_active',
      'is_demo'
    ].join(','))
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!scout) {
    const issue = new Error('Scout account not found.');
    issue.status = 404;
    throw issue;
  }

  let team = null;
  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();

    if (result.error) throw result.error;
    team = result.data || null;
  }

  return { scout, team };
}

async function ensureTeam(context) {
  if (context.team && context.scout.scout_team_id) return context;

  const scout = context.scout;
  const teamName =
    text(scout.club_name, 240) ||
    text([scout.first_name, scout.last_name].filter(Boolean).join(' '), 180) ||
    'Scout Workspace';

  const { data: team, error } = await supabase
    .from('scout_teams')
    .insert({
      team_name: teamName.endsWith('Workspace')
        ? teamName
        : `${teamName} Scout Workspace`,
      club_name: text(scout.club_name, 240) || null,
      status: 'active',
      subscription_plan: text(scout.subscription_plan, 50) || 'Core',
      subscription_start_at: scout.plan_start || null,
      subscription_renewal_at: scout.plan_end || null,
      activated_at: new Date().toISOString(),
      limit_overrides: scout.limit_overrides || {},
      plan_limits: {}
    })
    .select('*')
    .single();

  if (error) throw error;

  const { error: scoutError } = await supabase
    .from('scouts')
    .update({
      scout_team_id: team.id,
      is_super_user: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', scout.id);

  if (scoutError) throw scoutError;

  const scopedTables = [
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

  for (const table of scopedTables) {
    const result = await supabase
      .from(table)
      .update({ scout_team_id: team.id })
      .eq('scout_id', scout.id)
      .is('scout_team_id', null);

    if (result.error && result.error.code !== '42P01') {
      throw result.error;
    }
  }

  context.scout.scout_team_id = team.id;
  context.team = team;
  return context;
}

function baseLimitFor(context, topUpType) {
  const plan =
    context.team?.subscription_plan ||
    context.scout.subscription_plan ||
    'Core';
  const key = TYPE_TO_LIMIT[topUpType];
  return integer(limitsForPlan(plan)[key]);
}

async function purchaseHistory(context) {
  let query = supabase
    .from('scout_usage_purchases')
    .select([
      'id',
      'stripe_checkout_session_id',
      'stripe_payment_intent_id',
      'stripe_price_id',
      'top_up_type',
      'quantity',
      'amount_total',
      'currency',
      'status',
      'paid_at',
      'reversed_at',
      'reversal_reason'
    ].join(','))
    .order('paid_at', { ascending: false })
    .limit(100);

  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('scout_id', context.scout.id);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    checkoutSessionId: row.stripe_checkout_session_id,
    paymentIntentId: row.stripe_payment_intent_id,
    priceId: row.stripe_price_id,
    type: row.top_up_type,
    label: TYPE_LABELS[row.top_up_type] || 'Usage top-up',
    quantity: row.quantity,
    amount: row.amount_total,
    currency: row.currency,
    priceLabel: money(row.amount_total, row.currency),
    status: row.status,
    paidAt: row.paid_at,
    reversedAt: row.reversed_at,
    reversalReason: row.reversal_reason
  }));
}

function webBaseUrl(req) {
  const configured = text(process.env.SCOUTLINK_WEB_URL, 500);
  if (configured) return configured.replace(/\/+$/, '');

  const origin = text(req.get('origin'), 500);
  if (/^https?:\/\//i.test(origin)) return origin.replace(/\/+$/, '');

  return 'https://scoutlink.app';
}

router.use(requireAuth, requireRole('Scout'));

router.get('/', async (req, res) => {
  try {
    let context = await loadContext(req.user.id);

    const [packs, usage, purchases] = await Promise.all([
      listPacks(),
      getScoutUsageSnapshot(context),
      purchaseHistory(context)
    ]);

    res.json({
      data: {
        plan:
          context.team?.subscription_plan ||
          context.scout.subscription_plan ||
          usage.plan,
        scope: usage.scope,
        usage,
        packs,
        purchases
      }
    });
  } catch (error) {
    console.error('[Scout usage GET]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Usage could not be loaded.'
    });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const priceId = text(req.body && req.body.priceId, 120);
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required.' });
    }

    let context = await loadContext(req.user.id);
    context = await ensureTeam(context);

    const packs = await listPacks();
    const pack = packs.find(item => item.priceId === priceId);

    if (!pack) {
      return res.status(400).json({
        error: 'That ScoutLink top-up price is not available.'
      });
    }

    const currentPlan =
      context.team?.subscription_plan ||
      context.scout.subscription_plan ||
      'Core';

    const currentLimits = context.scout.scout_team_id
      ? effectiveLimits(currentPlan, context.team?.limit_overrides || {})
      : effectiveLimits(currentPlan, context.scout.limit_overrides || {});

    const baseLimit = baseLimitFor(context, pack.type);
    const baseUrl = webBaseUrl(req);

    const metadata = {
      platform: 'scoutlink',
      purchase_type: 'usage_top_up',
      scout_id: context.scout.id,
      scout_team_id: context.scout.scout_team_id || '',
      top_up_type: pack.type,
      limit_key: pack.limitKey,
      quantity_included: String(pack.quantity),
      price_id: pack.priceId,
      plan_at_purchase: String(currentPlan),
      base_limit: String(baseLimit),
      effective_limit_before_purchase: String(
        integer(currentLimits[pack.limitKey])
      )
    };

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.priceId, quantity: 1 }],
      client_reference_id: context.scout.id,
      customer_email: context.scout.email || undefined,
      success_url:
        `${baseUrl}/scout/usage?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/scout/usage?checkout=cancelled`,
      metadata,
      payment_intent_data: { metadata }
    });

    res.status(201).json({
      data: {
        id: session.id,
        url: session.url,
        pack
      }
    });
  } catch (error) {
    console.error('[Scout usage checkout]', error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Stripe Checkout could not be started.'
    });
  }
});

router.get('/checkout/:sessionId', async (req, res) => {
  try {
    const sessionId = text(req.params.sessionId, 160);
    const context = await loadContext(req.user.id);

    let query = supabase
      .from('scout_usage_purchases')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('scout_id', context.scout.id);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;

    res.json({
      data: {
        applied: Boolean(data && data.status === 'paid'),
        purchase: data || null
      }
    });
  } catch (error) {
    console.error('[Scout usage checkout status]', error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Checkout status could not be loaded.'
    });
  }
});

module.exports = router;
module.exports.listPacks = listPacks;
module.exports.validateTopUpPrice = validateTopUpPrice;
module.exports.loadContext = loadContext;
module.exports.baseLimitFor = baseLimitFor;
