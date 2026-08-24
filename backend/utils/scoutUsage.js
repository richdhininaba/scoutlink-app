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

function scopedQuery(query, scout) {
  return scout.scout_team_id
    ? query.eq('scout_team_id', scout.scout_team_id)
    : query.eq('scout_id', scout.id);
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

  query = scopedQuery(query, scout);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function usageEventQuantity(context, eventType) {
  const scout = context && context.scout;
  if (!scout || !scout.id) throw new Error('Scout usage context is missing.');

  let query = supabase
    .from('scout_usage_events')
    .select('quantity')
    .eq('event_type', eventType);

  query = scopedQuery(query, scout);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).reduce(
    (total, row) => total + Math.max(0, number(row.quantity)),
    0
  );
}

/*
 * Predictions/Exports/Coach interests historically consumed allowance by
 * writing their source tables directly, while the durable usage ledger was
 * introduced later. The authoritative base usage therefore remains the
 * greater of source rows and matching ledger quantity.
 *
 * AI-enhanced predictions deliberately use a separate premium event:
 *   - every prediction_log row = the first prediction credit;
 *   - prediction_ai_premium quantity 7 = the extra AI cost;
 *   - total AI prediction cost = 8 credits.
 *
 * Keeping the seven-credit premium separate prevents historical prediction
 * rows from disappearing during the source-table/ledger transition.
 */
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
    predictionRows,
    exportRows,
    interestRows,
    predictionEvents,
    predictionAiPremiumEvents,
    exportEvents,
    interestEvents,
    radarEvents
  ] = await Promise.all([
    countUsageRows(context, 'predictions_log'),
    countUsageRows(context, 'scout_exports'),
    countUsageRows(context, 'recruitment_pipeline'),
    usageEventQuantity(context, 'prediction'),
    usageEventQuantity(context, 'prediction_ai_premium'),
    usageEventQuantity(context, 'export'),
    usageEventQuantity(context, 'interest_request'),
    usageEventQuantity(context, 'ask_radar')
  ]);

  const basePredictionsUsed = Math.max(predictionRows, predictionEvents);
  const predictionsUsed = basePredictionsUsed + predictionAiPremiumEvents;
  const exportsUsed = Math.max(exportRows, exportEvents);
  const interestsUsed = Math.max(interestRows, interestEvents);
  const radarUsed = radarEvents;

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
    radar: usageRow(radarUsed, limits.radar),
    sources: {
      predictions: {
        sourceRows: predictionRows,
        ledgerQuantity: predictionEvents,
        baseUsed: basePredictionsUsed,
        aiPremiumQuantity: predictionAiPremiumEvents
      },
      exports: { sourceRows: exportRows, ledgerQuantity: exportEvents },
      interests: { sourceRows: interestRows, ledgerQuantity: interestEvents },
      radar: { ledgerQuantity: radarEvents }
    }
  };
}

module.exports = {
  getScoutUsageSnapshot,
  usageRow
};
