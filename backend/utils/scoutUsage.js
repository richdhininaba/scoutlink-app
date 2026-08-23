'use strict';

const { supabase } = require('../db/supabase');
const { limitsForPlan, effectiveLimits } = require('./scoutPlans');

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function usageRow(used, limit) {
  const safeUsed = Math.max(0, number(used));
  const safeLimit = Math.max(0, number(limit));

  return {
    used: safeUsed,
    limit: safeLimit,
    remaining: Math.max(0, safeLimit - safeUsed),
    percent: safeLimit
      ? Math.min(100, Math.round((safeUsed / safeLimit) * 100))
      : 0
  };
}

async function countUsageRows(context, table, activeOnly = false) {
  const scout = context && context.scout;

  if (!scout || !scout.id) {
    throw new Error('Scout usage context is missing.');
  }

  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  query = scout.scout_team_id
    ? query.eq('scout_team_id', scout.scout_team_id)
    : query.eq('scout_id', scout.id);

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

async function radarCreditsUsed(context) {
  const scout = context && context.scout;
  if (!scout || !scout.id) throw new Error('Scout usage context is missing.');

  let query = supabase
    .from('scout_usage_events')
    .select('quantity')
    .eq('event_type', 'ask_radar');

  query = scout.scout_team_id
    ? query.eq('scout_team_id', scout.scout_team_id)
    : query.eq('scout_id', scout.id);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce(
    (total, row) => total + Math.max(0, number(row.quantity)),
    0
  );
}

async function getScoutUsageSnapshot(context) {
  const scout = context && context.scout;
  const team = context && context.team || {};

  if (!scout || !scout.id) {
    throw new Error('Scout usage context is missing.');
  }

  const plan = team.subscription_plan || scout.subscription_plan || 'Core';
  const overrides = scout.scout_team_id
    ? team.limit_overrides || {}
    : scout.limit_overrides || {};
  const limits = effectiveLimits(plan, overrides);

  const [
    predictionsUsed,
    exportsUsed,
    interestsUsed,
    radarUsed
  ] = await Promise.all([
    countUsageRows(context, 'predictions_log'),
    countUsageRows(context, 'scout_exports'),
    countUsageRows(context, 'recruitment_pipeline', true),
    radarCreditsUsed(context)
  ]);

  return {
    plan,
    scope: scout.scout_team_id ? 'team' : 'scout',
    resetAt:
      team.subscription_renewal_at ||
      scout.plan_end ||
      scout.subscription_renewal_at ||
      null,
    generatedAt: new Date().toISOString(),
    predictions: usageRow(predictionsUsed, limits.predictions),
    exports: usageRow(exportsUsed, limits.exports),
    interests: usageRow(interestsUsed, limits.interests),
    radar: usageRow(radarUsed, limits.radar)
  };
}

module.exports = {
  getScoutUsageSnapshot,
  usageRow
};
