'use strict';

const Stripe = require('stripe');

const { supabase } = require('../db/supabase');
const { limitsForPlan } = require('../utils/scoutPlans');
const {
  activatePaidScoutRegistration,
  syncSubscriptionLifecycle
} = require('../services/scoutSubscriptionBilling');

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

let stripeInstance = null;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
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

function metadataFor(price) {
  const product =
    price &&
    price.product &&
    typeof price.product === 'object'
      ? price.product
      : {};
  return Object.assign({}, product.metadata || {}, price.metadata || {});
}

function validatedPack(price) {
  if (!price || !price.id || price.active === false) return null;
  if (price.type && price.type !== 'one_time') return null;

  const metadata = metadataFor(price);
  const platform = text(metadata.platform).toLowerCase();
  const category = text(metadata.product_category).toLowerCase();
  const type = text(metadata.top_up_type).toLowerCase();
  const quantity = integer(metadata.quantity_included);

  if (platform !== 'scoutlink') return null;
  if (category !== 'top_up') return null;
  if (!ALLOWED_TYPES.has(type) || !quantity) return null;

  return {
    priceId: price.id,
    type,
    quantity,
    limitKey: TYPE_TO_LIMIT[type]
  };
}

async function scoutContext(scoutId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select([
      'id',
      'scout_team_id',
      'subscription_plan',
      'limit_overrides'
    ].join(','))
    .eq('id', scoutId)
    .maybeSingle();

  if (error) throw error;
  if (!scout) throw new Error('Scout not found for Stripe top-up.');

  let team = null;
  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('id,subscription_plan,limit_overrides')
      .eq('id', scout.scout_team_id)
      .maybeSingle();

    if (result.error) throw result.error;
    team = result.data || null;
  }

  return { scout, team };
}

function baseLimit(context, type) {
  const key = TYPE_TO_LIMIT[type];
  const plan =
    context.team?.subscription_plan ||
    context.scout.subscription_plan ||
    'Core';
  return integer(limitsForPlan(plan)[key]);
}

async function checkoutLinePack(session) {
  const lines = await stripe().checkout.sessions.listLineItems(
    session.id,
    {
      limit: 10,
      expand: ['data.price.product']
    }
  );

  if (!lines.data || lines.data.length !== 1) {
    throw new Error('ScoutLink top-up Checkout must contain one line item.');
  }

  const line = lines.data[0];
  const pack = validatedPack(line.price);

  if (!pack || integer(line.quantity, 1) !== 1) {
    throw new Error('Checkout line item is not an approved ScoutLink top-up.');
  }

  return pack;
}

async function applyPaidTopUp(session, eventId) {
  if (!session || !session.id) return;
  if (session.payment_status !== 'paid') return;

  const sessionMetadata = session.metadata || {};
  if (text(sessionMetadata.platform).toLowerCase() !== 'scoutlink') return;
  if (text(sessionMetadata.purchase_type).toLowerCase() !== 'usage_top_up') return;

  const scoutId = text(sessionMetadata.scout_id, 80);
  if (!scoutId) throw new Error('Paid ScoutLink top-up has no Scout ID.');

  const pack = await checkoutLinePack(session);
  const requestedType = text(sessionMetadata.top_up_type).toLowerCase();
  const requestedQuantity = integer(sessionMetadata.quantity_included);

  if (
    requestedType !== pack.type ||
    requestedQuantity !== pack.quantity ||
    text(sessionMetadata.price_id, 120) !== pack.priceId
  ) {
    throw new Error('Stripe top-up metadata does not match the paid line item.');
  }

  const context = await scoutContext(scoutId);
  const expectedTeamId = context.scout.scout_team_id || null;
  const metadataTeamId = text(sessionMetadata.scout_team_id, 80) || null;

  if (metadataTeamId && metadataTeamId !== expectedTeamId) {
    throw new Error('Paid ScoutLink top-up team scope does not match Scout.');
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent && session.payment_intent.id
        ? session.payment_intent.id
        : '';

  const { error } = await supabase.rpc('apply_scout_usage_top_up', {
    p_scout_id: context.scout.id,
    p_scout_team_id: expectedTeamId,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
    p_price_id: pack.priceId,
    p_top_up_type: pack.type,
    p_quantity: pack.quantity,
    p_base_limit: baseLimit(context, pack.type),
    p_amount_total: session.amount_total == null ? null : integer(session.amount_total),
    p_currency: text(session.currency, 8).toLowerCase() || null,
    p_stripe_event_id: eventId,
    p_metadata: {
      checkout_mode: session.mode,
      payment_status: session.payment_status,
      customer_email:
        session.customer_details?.email ||
        session.customer_email ||
        null
    }
  });

  if (error) throw error;
}

async function reverseByPaymentIntent(paymentIntentId, eventId, reason) {
  if (!paymentIntentId) return;

  const { data: purchase, error } = await supabase
    .from('scout_usage_purchases')
    .select('stripe_checkout_session_id,status')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (error) throw error;
  if (!purchase || purchase.status !== 'paid') return;

  const result = await supabase.rpc('reverse_scout_usage_top_up', {
    p_checkout_session_id: purchase.stripe_checkout_session_id,
    p_stripe_event_id: eventId,
    p_reason: reason
  });

  if (result.error) throw result.error;
}

async function handleCompletedCheckout(event) {
  const session = event.data.object;
  const metadata = session && session.metadata || {};
  const purchaseType = text(metadata.purchase_type).toLowerCase();

  if (text(metadata.platform).toLowerCase() !== 'scoutlink') return;

  if (purchaseType === 'subscription_registration') {
    await activatePaidScoutRegistration(session, event.id);
    return;
  }

  if (purchaseType === 'usage_top_up') {
    await applyPaidTopUp(session, event.id);
  }
}

async function handleEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await handleCompletedCheckout(event);
      return;

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscriptionLifecycle(event.data.object, event.id);
      return;

    case 'charge.refunded': {
      const charge = event.data.object;
      if (!charge.refunded) return;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
      await reverseByPaymentIntent(
        paymentIntentId,
        event.id,
        'Stripe charge fully refunded'
      );
      return;
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object;
      const chargeId =
        typeof dispute.charge === 'string'
          ? dispute.charge
          : dispute.charge?.id;

      if (!chargeId) return;

      const charge = await stripe().charges.retrieve(chargeId);
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

      await reverseByPaymentIntent(
        paymentIntentId,
        event.id,
        'Stripe dispute created'
      );
      return;
    }

    default:
      return;
  }
}

async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Stripe webhook] STRIPE_WEBHOOK_SECRET is not configured.');
    return res.status(503).json({ error: 'Stripe webhook is not configured.' });
  }

  if (!signature) {
    return res.status(400).json({ error: 'Missing Stripe signature.' });
  }

  let event;
  try {
    event = stripe().webhooks.constructEvent(req.body, signature, secret);
  } catch (error) {
    console.warn('[Stripe webhook] Signature verification failed:', error.message);
    return res.status(400).json({ error: 'Invalid Stripe signature.' });
  }

  try {
    await handleEvent(event);
    return res.json({ received: true });
  } catch (error) {
    console.error('[Stripe webhook] Event handling failed:', event.id, error);
    return res.status(500).json({ error: 'Stripe event could not be applied.' });
  }
}

module.exports = stripeWebhook;
module.exports.handleEvent = handleEvent;
