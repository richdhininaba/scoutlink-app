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

async function getScoutUsageSnapshot(context) {
  const scout = context && context.scout;
  const team = context && context.team || {};

  if (!scout || !scout.id) {
    throw new Error('Scout usage context is missing.');
  }

  const plan = team.subscription_plan || scout.subscription_plan || 'Core';
  const limits = scout.scout_team_id
    ? effectiveLimits(plan, team.limit_overrides || {})
    : limitsForPlan(plan);

  const [predictionsUsed, exportsUsed, interestsUsed] = await Promise.all([
    countUsageRows(context, 'predictions_log'),
    countUsageRows(context, 'scout_exports'),
    countUsageRows(context, 'recruitment_pipeline', true)
  ]);

  return {
    plan,
    scope: scout.scout_team_id ? 'team' : 'scout',
    resetAt: team.subscription_renewal_at || scout.subscription_renewal_at || null,
    generatedAt: new Date().toISOString(),
    predictions: usageRow(predictionsUsed, limits.predictions),
    exports: usageRow(exportsUsed, limits.exports),
    interests: usageRow(interestsUsed, limits.interests)
  };
}

module.exports = {
  getScoutUsageSnapshot,
  usageRow
};
