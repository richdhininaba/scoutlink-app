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

/*
 * Verified against the live Stratex Analytics Stripe account on 23 Aug 2026.
 * This fallback exists so the Scout usage page remains functional while the
 * production STRIPE_SECRET_KEY is temporarily unavailable in Vercel.
 *
 * It is a catalogue only. It cannot create a payment or grant credits.
 * The signed Stripe webhook remains the only path that can apply paid usage.
 */
const VERIFIED_LIVE_PACKS = Object.freeze([
  {
    priceId: 'price_1U7EGJLzVSereCjWorwk7I0b',
    type: 'prediction',
    quantity: 10,
    amount: 900,
    currency: 'gbp',
    productName: 'Prediction Pack - 10'
  },
  {
    priceId: 'price_1U7EGOLzVSereCjWWfJ94o8L',
    type: 'prediction',
    quantity: 25,
    amount: 1900,
    currency: 'gbp',
    productName: 'Prediction Pack - 25'
  },
  {
    priceId: 'price_1U7EGULzVSereCjWv4Ro5XjG',
    type: 'prediction',
    quantity: 50,
    amount: 3400,
    currency: 'gbp',
    productName: 'Prediction Pack - 50'
  },
  {
    priceId: 'price_1U7EGYLzVSereCjWfT0R0vfX',
    type: 'prediction',
    quantity: 100,
    amount: 5900,
    currency: 'gbp',
    productName: 'Prediction Pack - 100'
  },
  {
    priceId: 'price_1U7EGcLzVSereCjWniTFuCv1',
    type: 'export',
    quantity: 10,
    amount: 900,
    currency: 'gbp',
    productName: 'Export Pack - 10'
  },
  {
    priceId: 'price_1U7EGhLzVSereCjWXyrtGqnj',
    type: 'export',
    quantity: 25,
    amount: 1900,
    currency: 'gbp',
    productName: 'Export Pack - 25'
  },
  {
    priceId: 'price_1U7EGnLzVSereCjWzVbB6l1K',
    type: 'export',
    quantity: 50,
    amount: 3400,
    currency: 'gbp',
    productName: 'Export Pack - 50'
  },
  {
    priceId: 'price_1U7EGyLzVSereCjW1qp2yBMi',
    type: 'export',
    quantity: 100,
    amount: 5900,
    currency: 'gbp',
    productName: 'Export Pack - 100'
  },
  {
    priceId: 'price_1U7EH4LzVSereCjWZiapW9xy',
    type: 'interest_request',
    quantity: 10,
    amount: 17900,
    currency: 'gbp',
    productName: 'Interest Request Pack - 10'
  },
  {
    priceId: 'price_1U7EHALzVSereCjWND1G8BAH',
    type: 'interest_request',
    quantity: 25,
    amount: 39900,
    currency: 'gbp',
    productName: 'Interest Request Pack - 25'
  },
  {
    priceId: 'price_1U7EHGLzVSereCjWn7SqHgqR',
    type: 'interest_request',
    quantity: 50,
    amount: 69900,
    currency: 'gbp',
    productName: 'Interest Request Pack - 50'
  },
  {
    priceId: 'price_1U7EHPLzVSereCjWSyracQiG',
    type: 'interest_request',
    quantity: 100,
    amount: 119900,
    currency: 'gbp',
    productName: 'Interest Request Pack - 100'
  },
  {
    priceId: 'price_1U7I38LzVSereCjW86L8werU',
    type: 'ask_radar',
    quantity: 50,
    amount: 4900,
    currency: 'gbp',
    productName: 'Ask Radar Pack - 50'
  },
  {
    priceId: 'price_1U7I3DLzVSereCjWW9wphaao',
    type: 'ask_radar',
    quantity: 150,
    amount: 12900,
    currency: 'gbp',
    productName: 'Ask Radar Pack - 150'
  },
  {
    priceId: 'price_1U7I3ILzVSereCjWOoH9Hk4A',
    type: 'ask_radar',
    quantity: 400,
    amount: 29900,
    currency: 'gbp',
    productName: 'Ask Radar Pack - 400'
  },
  {
    priceId: 'price_1U7I3PLzVSereCjWY6yKKK6O',
    type: 'ask_radar',
    quantity: 1000,
    amount: 64900,
    currency: 'gbp',
    productName: 'Ask Radar Pack - 1000'
  }
]);

const PAYMENT_SURFACE_ENABLED = false;

let stripeInstance = null;
let packCache = null;
let packCacheAt = 0;
let packCacheSource = 'verified-live-fallback';

function stripeConfigured() {
  return /^sk_live_[A-Za-z0-9]+$/.test(String(process.env.STRIPE_SECRET_KEY || '').trim());
}

function stripe() {
  if (!stripeConfigured()) {
    const error = new Error(
      'Live Stripe checkout is not available yet. The selected pack is valid and ready for the Stripe handoff once the live key is restored.'
    );
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

function finalisePack(pack) {
  const type = text(pack.type).toLowerCase();
  return {
    priceId: pack.priceId,
    productId: pack.productId || null,
    type,
    limitKey: TYPE_TO_LIMIT[type],
    label: TYPE_LABELS[type],
    quantity: integer(pack.quantity),
    amount: integer(pack.amount),
    currency: text(pack.currency || 'gbp', 3).toLowerCase(),
    priceLabel: money(pack.amount, pack.currency),
    productName: text(pack.productName, 180),
    sortOrder: [
      'prediction',
      'export',
      'interest_request',
      'ask_radar'
    ].indexOf(type)
  };
}

function fallbackPacks() {
  return VERIFIED_LIVE_PACKS.map(finalisePack);
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

  return finalisePack({
    priceId: price.id,
    productId:
      price.product && typeof price.product === 'object'
        ? price.product.id
        : price.product || null,
    type,
    quantity,
    amount: price.unit_amount,
    currency: price.currency,
    productName:
      price.product && typeof price.product === 'object'
        ? text(price.product.name, 180)
        : ''
  });
}

async function listPacks(force = false) {
  const now = Date.now();
  if (!force && packCache && now - packCacheAt < 5 * 60 * 1000) {
    return { packs: packCache, source: packCacheSource };
  }

  if (!stripeConfigured()) {
    packCache = fallbackPacks();
    packCacheAt = now;
    packCacheSource = 'verified-live-fallback';
    return { packs: packCache, source: packCacheSource };
  }

  try {
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

    if (!packs.length) {
      throw new Error('No ScoutLink top-up prices were returned by Stripe.');
    }

    packCache = packs;
    packCacheAt = now;
    packCacheSource = 'stripe-live';
    return { packs, source: packCacheSource };
  } catch (error) {
    console.warn('[Scout usage] Stripe catalogue unavailable; using verified live fallback:', error.message);
    packCache = fallbackPacks();
    packCacheAt = now;
    packCacheSource = 'verified-live-fallback';
    return { packs: packCache, source: packCacheSource };
  }
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

async function preparedCheckout(context, priceId) {
  const catalogue = await listPacks();
  const pack = catalogue.packs.find(item => item.priceId === priceId);

  if (!pack) {
    const issue = new Error('That ScoutLink top-up pack is not available.');
    issue.status = 400;
    throw issue;
  }
  if (pack.type === 'ask_radar') {
    const issue = new Error('Ask Radar top-ups are unavailable until Ask Radar is enabled.');
    issue.status = 409;
    throw issue;
  }

  const currentPlan =
    context.team?.subscription_plan ||
    context.scout.subscription_plan ||
    'Core';

  const currentLimits = context.scout.scout_team_id
    ? effectiveLimits(currentPlan, context.team?.limit_overrides || {})
    : effectiveLimits(currentPlan, context.scout.limit_overrides || {});

  return {
    pack,
    plan: currentPlan,
    baseLimit: baseLimitFor(context, pack.type),
    effectiveLimitBeforePurchase: integer(currentLimits[pack.limitKey]),
    stripeReady: stripeConfigured(),
    demoAccount: Boolean(context.scout.is_demo),
    paymentLaunchAllowed: PAYMENT_SURFACE_ENABLED && stripeConfigured() && !context.scout.is_demo,
    catalogueSource: catalogue.source,
    handoffReady: true
  };
}

router.use(requireAuth, requireRole('Scout'));

router.get('/', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);

    const [catalogue, usage, purchases] = await Promise.all([
      listPacks(),
      getScoutUsageSnapshot(context),
      purchaseHistory(context)
    ]);

    res.set('Cache-Control', 'no-store');
    res.json({
      data: {
        plan:
          context.team?.subscription_plan ||
          context.scout.subscription_plan ||
          usage.plan,
        scope: usage.scope,
        usage,
        packs: catalogue.packs.filter(pack => pack.type !== 'ask_radar'),
        purchases,
        stripeReady: stripeConfigured(),
        demoAccount: Boolean(context.scout.is_demo),
        paymentLaunchAllowed: PAYMENT_SURFACE_ENABLED && stripeConfigured() && !context.scout.is_demo,
        catalogueSource: catalogue.source,
        checkoutMode: 'prepared-handoff-only',
        note: 'The live Stripe catalogue is verified and the checkout handoff can be prepared. Payment launch is intentionally paused until the Stripe payment surface is enabled.'
      }
    });
  } catch (error) {
    console.error('[Scout usage GET]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Usage could not be loaded.'
    });
  }
});

router.post('/prepare', async (req, res) => {
  try {
    const priceId = text(req.body && req.body.priceId, 120);
    if (!priceId) return res.status(400).json({ error: 'priceId is required.' });

    let context = await loadContext(req.user.id);
    context = await ensureTeam(context);

    const prepared = await preparedCheckout(context, priceId);

    res.json({
      data: {
        ...prepared,
        nextStep: prepared.demoAccount
          ? 'demo_checkout_disabled'
          : 'payment_surface_pending',
        message: prepared.demoAccount
          ? 'This is a demo Scout account. Live payment launch is intentionally disabled.'
          : 'This pack is validated and the checkout handoff is ready. Payment launch is intentionally paused for the next Stripe integration step.'
      }
    });
  } catch (error) {
    console.error('[Scout usage prepare]', error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'The Stripe handoff could not be prepared.'
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

    const prepared = await preparedCheckout(context, priceId);

    if (!PAYMENT_SURFACE_ENABLED) {
      return res.status(503).json({
        error: 'The checkout handoff is ready, but payment launch is intentionally paused until the Stripe payment surface is enabled.',
        prepared
      });
    }

    if (prepared.demoAccount) {
      return res.status(409).json({
        error: 'Live Stripe checkout is disabled for demo Scout accounts.',
        prepared
      });
    }

    if (!prepared.stripeReady) {
      return res.status(503).json({
        error: 'The pack is ready, but live Stripe payment launch is paused until STRIPE_SECRET_KEY is restored in Vercel.',
        prepared
      });
    }

    const pack = prepared.pack;
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
      plan_at_purchase: String(prepared.plan),
      base_limit: String(prepared.baseLimit),
      effective_limit_before_purchase: String(
        prepared.effectiveLimitBeforePurchase
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
        pack,
        prepared
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

    const { data, error } = await supabase
      .from('scout_usage_purchases')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('scout_id', context.scout.id)
      .maybeSingle();

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
module.exports.listPacks = async function listPacksForTests(force = false) {
  return (await listPacks(force)).packs;
};
module.exports.validateTopUpPrice = validateTopUpPrice;
module.exports.loadContext = loadContext;
module.exports.baseLimitFor = baseLimitFor;
module.exports.VERIFIED_LIVE_PACKS = VERIFIED_LIVE_PACKS;
