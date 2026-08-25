'use strict';

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const {
  requireStratexAdminPermission,
  loadCurrentStratexAdmin,
  isSuperAdmin,
  isManagementAdmin
} = require('../utils/stratexPermissions');

let stripeInstance = null;

function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured.');
  if (!stripeInstance) stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion:'2026-07-29.dahlia' });
  return stripeInstance;
}

function text(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function metadataFor(price) {
  const product = price && price.product && typeof price.product === 'object' ? price.product : {};
  return Object.assign({}, product.metadata || {}, price.metadata || {});
}

function isScoutSubscriptionPrice(price) {
  const metadata = metadataFor(price);
  return price && price.active !== false && price.type === 'recurring' && price.recurring &&
    text(metadata.platform).toLowerCase() === 'scoutlink' &&
    text(metadata.product_category).toLowerCase() === 'subscription';
}

function isScoutTopUpPrice(price) {
  const metadata = metadataFor(price);
  return price && price.active !== false && price.type === 'one_time' &&
    text(metadata.platform).toLowerCase() === 'scoutlink' &&
    text(metadata.product_category).toLowerCase() === 'top_up';
}

function annualValue(price) {
  if (!price || !price.recurring) return 0;
  const amount = money(price.unit_amount);
  const count = Math.max(1, Number(price.recurring.interval_count || 1));
  if (price.recurring.interval === 'year') return Math.round(amount / count);
  if (price.recurring.interval === 'month') return Math.round(amount * (12 / count));
  if (price.recurring.interval === 'week') return Math.round(amount * (52 / count));
  if (price.recurring.interval === 'day') return Math.round(amount * (365 / count));
  return 0;
}

function productName(price) {
  if (price && price.product && typeof price.product === 'object') return price.product.name || '';
  return '';
}

function planName(price) {
  const metadata = metadataFor(price);
  const raw = text(metadata.plan || metadata.plan_name || productName(price).replace(/^ScoutLink\s*[-–—]?\s*/i, ''));
  if (!raw) return 'ScoutLink';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function statusIsOpen(value) {
  return !['resolved', 'closed', 'dismissed', 'cancelled'].includes(String(value || '').toLowerCase());
}

async function allRows(table, columns, orderColumn) {
  let query = supabase.from(table).select(columns || '*');
  if (orderColumn) query = query.order(orderColumn, { ascending:false });
  const result = await query.limit(1000);
  if (result.error) throw result.error;
  return result.data || [];
}

async function dashboardPayload() {
  const [staff, concerns, leads, events, posts, timeOff] = await Promise.all([
    allRows('stratex', 'id,first_name,last_name,email,job_title,admin_role,role,is_active,manager_id', 'created_at'),
    allRows('safeguarding_concerns', 'id,status,urgency,created_at', 'created_at'),
    allRows('stratex_website_leads', 'id,status,created_at', 'created_at'),
    allRows('showcase_events', 'id,event_name,event_date,status,public_visible,featured,created_at', 'created_at'),
    allRows('stratex_learning_posts', 'id,title,status,published_at,created_at', 'created_at'),
    allRows('stratex_time_off', 'id,stratex_id,start_date,end_date,status', 'created_at')
  ]);

  const activeStaff = staff.filter(row => row.is_active !== false);
  const openConcerns = concerns.filter(row => statusIsOpen(row.status));
  const publishedPosts = posts.filter(row => String(row.status || '').toLowerCase() === 'published');
  const today = new Date().toISOString().slice(0, 10);
  const away = timeOff.filter(row =>
    String(row.status || '').toLowerCase() === 'approved' &&
    String(row.start_date || '') <= today &&
    String(row.end_date || '') >= today
  );

  const configuredEvents = events.filter(row => !['cancelled', 'archived'].includes(String(row.status || '').toLowerCase()));
  const newestConcern = openConcerns.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;

  return {
    staff: activeStaff.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      name: [row.first_name, row.last_name].filter(Boolean).join(' '),
      email: row.email,
      jobTitle: row.job_title || row.admin_role || row.role || 'Stratex'
    })),
    counts: {
      activeStaff: activeStaff.length,
      openConcerns: openConcerns.length,
      websiteLeads: leads.length,
      showcaseEvents: configuredEvents.length,
      publishedLearningPosts: publishedPosts.length,
      awayToday: away.length
    },
    newestConcernAt: newestConcern && newestConcern.created_at || null,
    showcaseEvent: configuredEvents.slice().sort((a, b) => {
      if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
      return new Date(a.event_date || a.created_at) - new Date(b.event_date || b.created_at);
    })[0] || null,
    latestLearningPost: publishedPosts.slice().sort((a, b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at))[0] || null
  };
}

async function stripePrices() {
  const all = [];
  let startingAfter = null;
  do {
    const page = await stripe().prices.list({
      active:true,
      limit:100,
      expand:['data.product'],
      ...(startingAfter ? { starting_after:startingAfter } : {})
    });
    all.push(...(page.data || []));
    startingAfter = page.has_more && page.data.length ? page.data[page.data.length - 1].id : null;
  } while (startingAfter);
  return all;
}

async function stripeSubscriptions() {
  const all = [];
  let startingAfter = null;
  do {
    const page = await stripe().subscriptions.list({
      status:'all',
      limit:100,
      ...(startingAfter ? { starting_after:startingAfter } : {})
    });
    all.push(...(page.data || []));
    startingAfter = page.has_more && page.data.length ? page.data[page.data.length - 1].id : null;
  } while (startingAfter);
  return all;
}

async function financialPayload() {
  const [prices, subscriptions] = await Promise.all([stripePrices(), stripeSubscriptions()]);
  const recurring = prices.filter(isScoutSubscriptionPrice);
  const topUps = prices.filter(isScoutTopUpPrice);
  const priceById = Object.fromEntries(recurring.map(price => [price.id, price]));
  const activeStatuses = new Set(['active', 'trialing']);
  const active = subscriptions.filter(sub => activeStatuses.has(String(sub.status || '').toLowerCase()));

  let arr = 0;
  const planCounts = {};
  active.forEach(subscription => {
    (subscription.items && subscription.items.data || []).forEach(item => {
      const price = item.price && priceById[item.price.id] || item.price;
      if (!price || !isScoutSubscriptionPrice(price)) return;
      const quantity = Math.max(1, Number(item.quantity || 1));
      arr += annualValue(price) * quantity;
      const name = planName(price);
      planCounts[name] = (planCounts[name] || 0) + quantity;
    });
  });

  const monthStart = Math.floor(new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    1, 0, 0, 0
  )).getTime() / 1000);

  const sessions = await stripe().checkout.sessions.list({
    created:{ gte:monthStart },
    limit:100
  });
  const paidSessions = (sessions.data || []).filter(session =>
    ['paid', 'no_payment_required'].includes(String(session.payment_status || '').toLowerCase())
  );
  const mtdGross = paidSessions.reduce((sum, session) => sum + money(session.amount_total), 0);
  const topUpRevenue = paidSessions
    .filter(session => text(session.metadata && session.metadata.purchase_type).toLowerCase() === 'usage_top_up')
    .reduce((sum, session) => sum + money(session.amount_total), 0);

  const cancelling = active.filter(subscription => subscription.cancel_at_period_end).length;
  const pastDue = subscriptions.filter(subscription => ['past_due', 'unpaid'].includes(String(subscription.status || '').toLowerCase())).length;

  return {
    source:'stripe_live',
    currency:'gbp',
    fetchedAt:new Date().toISOString(),
    metrics:{
      arr,
      activeSubscriptions:active.length,
      mtdGross,
      mtdTopUpRevenue:topUpRevenue,
      cancellingAtPeriodEnd:cancelling,
      pastDue
    },
    planCounts,
    subscriptionCatalogue:recurring
      .sort((a, b) => money(a.unit_amount) - money(b.unit_amount))
      .map(price => ({
        plan:planName(price),
        priceId:price.id,
        productId:typeof price.product === 'string' ? price.product : price.product && price.product.id || null,
        productName:productName(price),
        unitAmount:money(price.unit_amount),
        currency:price.currency,
        interval:price.recurring && price.recurring.interval,
        intervalCount:price.recurring && price.recurring.interval_count,
        annualValue:annualValue(price),
        active:price.active !== false
      })),
    topUpCatalogue:topUps
      .sort((a, b) => money(a.unit_amount) - money(b.unit_amount))
      .map(price => {
        const metadata = metadataFor(price);
        return {
          name:productName(price),
          type:text(metadata.top_up_type),
          quantity:Number(metadata.quantity_included || 0),
          unitAmount:money(price.unit_amount),
          currency:price.currency,
          priceId:price.id
        };
      }),
    recentPurchaseActivity:paidSessions.slice(0, 20).map(session => ({
      id:session.id,
      created:session.created ? new Date(session.created * 1000).toISOString() : null,
      amountTotal:money(session.amount_total),
      currency:session.currency,
      purchaseType:text(session.metadata && session.metadata.purchase_type) || 'checkout',
      plan:text(session.metadata && session.metadata.selected_plan),
      topUpType:text(session.metadata && session.metadata.top_up_type),
      customerEmail:session.customer_details && session.customer_details.email || session.customer_email || null
    }))
  };
}

router.use(requireAuth, requireRole('Stratex'));

router.get('/v7/dashboard', requireStratexAdminPermission('management'), async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ data:await dashboardPayload() });
  } catch (error) {
    console.error('[Admin V7 dashboard]', error);
    res.status(500).json({ error:'The Admin Centre dashboard could not be loaded.' });
  }
});

router.get('/v7/staff', requireStratexAdminPermission('contracts'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stratex')
      .select('id,first_name,last_name,email,job_title,admin_role,role,manager_id,is_active,permissions,created_at')
      .eq('is_active', true)
      .order('first_name', { ascending:true });
    if (error) throw error;
    res.set('Cache-Control', 'no-store');
    res.json({ data:data || [] });
  } catch (error) {
    console.error('[Admin V7 staff]', error);
    res.status(500).json({ error:'Staff records could not be loaded.' });
  }
});

router.get('/v7/financials', async (req, res) => {
  try {
    const admin = await loadCurrentStratexAdmin(req);
    if (!admin || admin.is_active === false || (!isSuperAdmin(admin, req) && !isManagementAdmin(admin, req))) {
      return res.status(403).json({ error:'Financials are restricted to Stratex management.' });
    }
    res.set('Cache-Control', 'no-store');
    res.json({ data:await financialPayload() });
  } catch (error) {
    console.error('[Admin V7 financials]', error);
    res.status(500).json({ error:'Live Stripe financials could not be loaded.' });
  }
});

module.exports = router;
