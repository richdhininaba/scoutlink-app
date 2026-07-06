'use strict';

const CUSTOM_LIMIT = 999999999;

const SCOUT_PLAN_LIMITS = Object.freeze({
  Core: Object.freeze({ seats: 1, exports: 20, predictions: 60, interests: 30 }),
  Plus: Object.freeze({ seats: 5, exports: 100, predictions: 300, interests: 120 }),
  Elite: Object.freeze({ seats: 10, exports: 300, predictions: 900, interests: 300 }),
  Enterprise: Object.freeze({ seats: CUSTOM_LIMIT, exports: CUSTOM_LIMIT, predictions: CUSTOM_LIMIT, interests: CUSTOM_LIMIT })
});

const INTEREST_REQUEST_LABEL = 'coach-mediated interest requests';

function normalizePlan(plan) {
  const raw = String(plan || 'Core').trim();
  const match = Object.keys(SCOUT_PLAN_LIMITS).find(key => key.toLowerCase() === raw.toLowerCase());
  return match || 'Core';
}

function limitsForPlan(plan) {
  return SCOUT_PLAN_LIMITS[normalizePlan(plan)];
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function parseLimitOverrides(overrides) {
  const src = overrides && typeof overrides === 'object' ? overrides : {};
  const out = {};
  ['seats', 'exports', 'predictions', 'interests'].forEach(key => {
    const n = numberOrNull(src[key]);
    if (n !== null) out[key] = n;
  });
  return out;
}

function effectiveLimits(plan, overrides) {
  return Object.assign({}, limitsForPlan(plan), parseLimitOverrides(overrides));
}

function displayLimit(value) {
  return Number(value) >= CUSTOM_LIMIT ? 'Custom' : String(value);
}

function addSubscriptionYear(date) {
  const d = date ? new Date(date) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

function shouldResetUsage(team, now = new Date()) {
  if (!team || !team.subscription_renewal_at) return false;
  const renewal = new Date(team.subscription_renewal_at);
  return Number.isFinite(renewal.getTime()) && renewal <= now;
}

module.exports = {
  CUSTOM_LIMIT,
  SCOUT_PLAN_LIMITS,
  INTEREST_REQUEST_LABEL,
  normalizePlan,
  limitsForPlan,
  effectiveLimits,
  displayLimit,
  addSubscriptionYear,
  shouldResetUsage
};
