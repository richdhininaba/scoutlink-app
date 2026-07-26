'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');

const ALLOWANCE_TYPES = ['interests', 'predictions', 'exports'];
const STATUSES = ['pending', 'approved_free', 'payment_link_sent', 'paid_and_applied', 'declined'];

function text(value, max = 2000) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}
function integer(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}
function displayName(user) {
  return [user.firstName || user.first_name, user.lastName || user.last_name]
    .filter(Boolean).join(' ') || user.email || user.accountType || 'ScoutLink user';
}
function requestCode() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return 'UR-' + stamp.slice(-6) + random;
}
function statusLabel(status) {
  return {
    pending: 'Pending review',
    approved_free: 'Approved free',
    payment_link_sent: 'Payment link sent',
    paid_and_applied: 'Paid and applied',
    declined: 'Declined'
  }[status] || status;
}

async function scoutContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('id,first_name,last_name,club_name,scout_team_id,subscription_plan')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!scout) return null;
  let team = null;
  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('id,team_name,club_name,subscription_plan,limit_overrides')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (result.error) throw result.error;
    team = result.data || null;
  }
  return { scout, team };
}

async function coachContext(userId) {
  const { data: coach, error } = await supabase
    .from('coaches')
    .select('id,first_name,last_name,team_id,team_name')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return coach ? { coach } : null;
}

async function usageForScout(context, type) {
  const scout = context.scout;
  const team = context.team || {};
  const plan = team.subscription_plan || scout.subscription_plan || 'Core';
  const limits = scout.scout_team_id
    ? effectiveLimits(plan, team.limit_overrides || {})
    : limitsForPlan(plan);
  const table = type === 'predictions'
    ? 'predictions_log'
    : type === 'exports'
      ? 'scout_exports'
      : 'recruitment_pipeline';
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (type === 'interests') query = query.eq('is_active', true);
  query = scout.scout_team_id
    ? query.eq('scout_team_id', scout.scout_team_id)
    : query.eq('scout_id', scout.id);
  const { count, error } = await query;
  if (error) throw error;
  return { used: count || 0, limit: Number(limits[type]) || 0, plan };
}

async function addEvent(request, values) {
  const payload = {
    request_id: request.id,
    event_type: values.eventType,
    status: values.status || request.status,
    title: values.title,
    body: values.body || null,
    actor_type: values.actorType || null,
    actor_id: values.actorId || null,
    actor_name: values.actorName || null,
    quantity: values.quantity || null,
    amount_pence: integer(values.amountPence)
  };
  const { error } = await supabase.from('usage_request_events').insert(payload);
  if (error) throw error;
}

async function withEvents(rows) {
  const ids = rows.map(row => row.id);
  if (!ids.length) return rows;
  const { data, error } = await supabase
    .from('usage_request_events')
    .select('*')
    .in('request_id', ids)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const grouped = {};
  (data || []).forEach(event => {
    if (!grouped[event.request_id]) grouped[event.request_id] = [];
    grouped[event.request_id].push(event);
  });
  return rows.map(row => ({ ...row, events: grouped[row.id] || [] }));
}

router.use(requireAuth);

router.get('/', requireRole('Scout', 'Coach', 'Stratex'), async (req, res) => {
  try {
    let query = supabase.from('usage_requests').select('*').order('created_at', { ascending: false }).limit(250);
    if (req.user.accountType !== 'Stratex') {
      query = query
        .eq('requester_account_type', req.user.accountType)
        .eq('requester_id', req.user.id);
    } else {
      if (req.query.status && STATUSES.includes(req.query.status)) query = query.eq('status', req.query.status);
      if (req.query.type && ALLOWANCE_TYPES.includes(req.query.type)) query = query.eq('allowance_type', req.query.type);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = await withEvents(data || []);
    const summary = rows.reduce((out, row) => {
      out[row.status] = (out[row.status] || 0) + 1;
      if (row.status === 'paid_and_applied') out.revenuePence += integer(row.amount_pence);
      return out;
    }, { pending: 0, approved_free: 0, payment_link_sent: 0, paid_and_applied: 0, declined: 0, revenuePence: 0 });
    let allowances = null;
    if (req.user.accountType === 'Scout') {
      const context = await scoutContext(req.user.id);
      if (context) {
        allowances = {};
        for (const type of ALLOWANCE_TYPES) allowances[type] = await usageForScout(context, type);
      }
    }
    res.json({ data: rows, total: rows.length, summary, allowances });
  } catch (error) {
    console.error('[Usage requests list]', error);
    res.status(500).json({ error: 'Usage requests could not be loaded.' });
  }
});

router.post('/', requireRole('Scout', 'Coach'), async (req, res) => {
  try {
    const allowanceType = text(req.body.allowanceType, 40).toLowerCase();
    const quantity = integer(req.body.quantity);
    const reason = text(req.body.reason, 3000);
    if (!ALLOWANCE_TYPES.includes(allowanceType)) {
      return res.status(400).json({ error: 'Choose interests, predictions or exports.' });
    }
    if (!quantity) return res.status(400).json({ error: 'Enter the additional quantity required.' });
    if (!reason) return res.status(400).json({ error: 'Explain why the extra allowance is required.' });

    let scout = null;
    let coach = null;
    let team = null;
    let usage = { used: integer(req.body.currentUsed), limit: integer(req.body.currentLimit) };
    let organisationName = '';

    if (req.user.accountType === 'Scout') {
      const context = await scoutContext(req.user.id);
      if (!context) return res.status(404).json({ error: 'Scout account not found.' });
      scout = context.scout;
      team = context.team;
      usage = await usageForScout(context, allowanceType);
      organisationName = team?.team_name || team?.club_name || scout.club_name || 'Scout team';
    } else {
      const context = await coachContext(req.user.id);
      if (!context) return res.status(404).json({ error: 'Coach account not found.' });
      coach = context.coach;
      organisationName = coach.team_name || 'Coach team';
    }

    const payload = {
      request_code: requestCode(),
      requester_account_type: req.user.accountType,
      requester_id: req.user.id,
      scout_id: scout?.id || null,
      coach_id: coach?.id || null,
      scout_team_id: scout?.scout_team_id || null,
      organisation_name: organisationName,
      allowance_type: allowanceType,
      quantity_requested: quantity,
      current_used: usage.used,
      current_limit: usage.limit,
      urgency: text(req.body.urgency, 80) || 'Needed this week',
      reason,
      status: 'pending'
    };
    const { data, error } = await supabase.from('usage_requests').insert(payload).select().single();
    if (error) throw error;
    await addEvent(data, {
      eventType: 'submitted',
      status: 'pending',
      title: 'Request submitted',
      body: quantity + ' additional ' + allowanceType + ' requested.',
      actorType: req.user.accountType,
      actorId: req.user.id,
      actorName: displayName(req.user),
      quantity
    });
    res.status(201).json({ request: (await withEvents([data]))[0] });
  } catch (error) {
    console.error('[Usage request create]', error);
    res.status(500).json({ error: 'The usage request could not be submitted.' });
  }
});

async function applyAllowance(row, quantity) {
  if (!row.scout_team_id) {
    if (!row.scout_id) return;
    const column = row.allowance_type + '_remaining';
    const { data: scout, error } = await supabase.from('scouts').select(column).eq('id', row.scout_id).maybeSingle();
    if (error) throw error;
    const current = Number(scout?.[column]) || 0;
    const update = {};
    update[column] = current + quantity;
    const result = await supabase.from('scouts').update(update).eq('id', row.scout_id);
    if (result.error) throw result.error;
    return;
  }
  const { data: team, error } = await supabase
    .from('scout_teams')
    .select('subscription_plan,limit_overrides')
    .eq('id', row.scout_team_id)
    .single();
  if (error) throw error;
  const plan = team.subscription_plan || 'Core';
  const currentLimits = effectiveLimits(plan, team.limit_overrides || {});
  const nextOverrides = { ...(team.limit_overrides || {}) };
  nextOverrides[row.allowance_type] = Number(currentLimits[row.allowance_type] || 0) + quantity;
  const result = await supabase
    .from('scout_teams')
    .update({ limit_overrides: nextOverrides, updated_at: new Date().toISOString() })
    .eq('id', row.scout_team_id);
  if (result.error) throw result.error;
}

router.patch('/:id/action', requireRole('Stratex'), async (req, res) => {
  try {
    const status = text(req.body.status, 40);
    if (!STATUSES.includes(status) || status === 'pending') {
      return res.status(400).json({ error: 'Choose an admin outcome.' });
    }
    const { data: existing, error: findError } = await supabase
      .from('usage_requests').select('*').eq('id', req.params.id).maybeSingle();
    if (findError) throw findError;
    if (!existing) return res.status(404).json({ error: 'Usage request not found.' });
    if (['approved_free', 'paid_and_applied'].includes(existing.status)) {
      return res.status(409).json({ error: 'This allowance has already been applied.' });
    }

    const quantity = integer(req.body.quantity, existing.quantity_requested);
    const amountPence = integer(req.body.amountPence);
    if (!quantity) return res.status(400).json({ error: 'Enter the approved quantity.' });
    if (status === 'payment_link_sent' && !text(req.body.paymentUrl, 1200)) {
      return res.status(400).json({ error: 'Add the payment link before sending it.' });
    }

    const now = new Date().toISOString();
    const shouldApply = status === 'approved_free' || status === 'paid_and_applied';
    if (shouldApply) await applyAllowance(existing, quantity);

    const updates = {
      status,
      quantity_approved: status === 'declined' ? null : quantity,
      amount_pence: amountPence,
      payment_url: status === 'payment_link_sent' ? text(req.body.paymentUrl, 1200) : existing.payment_url,
      admin_note: text(req.body.adminNote, 3000) || null,
      actioned_by: req.user.id,
      actioned_by_name: displayName(req.user),
      actioned_at: now,
      allowance_applied_at: shouldApply ? now : null,
      updated_at: now
    };
    const { data, error } = await supabase
      .from('usage_requests').update(updates).eq('id', existing.id).select().single();
    if (error) throw error;
    await addEvent(data, {
      eventType: status,
      status,
      title: statusLabel(status),
      body: updates.admin_note || (shouldApply
        ? quantity + ' additional ' + existing.allowance_type + ' applied.'
        : status === 'payment_link_sent'
          ? 'Payment link issued for £' + (amountPence / 100).toFixed(2) + '.'
          : 'The request was declined.'),
      actorType: 'Stratex',
      actorId: req.user.id,
      actorName: updates.actioned_by_name,
      quantity,
      amountPence
    });
    res.json({ request: (await withEvents([data]))[0] });
  } catch (error) {
    console.error('[Usage request action]', error);
    res.status(500).json({ error: 'The usage-request decision could not be saved.' });
  }
});

module.exports = router;
