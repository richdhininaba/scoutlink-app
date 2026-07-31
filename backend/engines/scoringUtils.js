'use strict';

/** Target path: backend/engines/scoringUtils.js */

const {
  POSITION_GROUPS,
  POSITION_ALIASES,
  GENERAL_ATTRIBUTES,
  GOALKEEPER_ATTRIBUTES,
  DEFENDER_ATTRIBUTES,
  MIDFIELDER_ATTRIBUTES,
  ATTACKER_ATTRIBUTES,
  LEGACY_ATTRIBUTE_MAP,
  AGE_PHASES,
  MATCH_FORMAT_BY_AGE,
  DEFAULT_MATCH_MINUTES
} = require('./scoringConfig');

function clamp(value, minimum = 0, maximum = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.max(minimum, Math.min(maximum, number));
}

function round(value, places = 1) {
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function isObservedScore(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function sum(values) {
  return (values || []).reduce((total, value) => total + (Number(value) || 0), 0);
}

function average(values) {
  const valid = (values || []).filter(isObservedScore).map(Number);
  if (!valid.length) return null;
  return valid.reduce((total, value) => total + value, 0) / valid.length;
}

function standardDeviation(values) {
  const valid = (values || []).filter(isObservedScore).map(Number);
  if (valid.length < 2) return null;
  const mean = average(valid);
  return Math.sqrt(average(valid.map(value => (value - mean) ** 2)));
}

function unique(values) {
  return [...new Set((values || []).filter(value => value !== null && value !== undefined && value !== ''))];
}

function normaliseAgeGroup(value) {
  const match = String(value || '').trim().toUpperCase().match(/^U(\d{1,2})$/);
  if (!match) return null;
  const age = Number(match[1]);
  return age >= 7 && age <= 16 ? `U${age}` : null;
}

function ageNumber(value) {
  const ageGroup = normaliseAgeGroup(value);
  return ageGroup ? Number(ageGroup.slice(1)) : null;
}

function getAgeGroup(player = {}) {
  return normaliseAgeGroup(player.age_group || player.ageGroup);
}

function getAgePhase(ageGroupOrPlayer) {
  const ageGroup = typeof ageGroupOrPlayer === 'object'
    ? getAgeGroup(ageGroupOrPlayer)
    : normaliseAgeGroup(ageGroupOrPlayer);
  const age = ageNumber(ageGroup);
  if (!age) return null;
  return Object.entries(AGE_PHASES).find(([, phase]) => age >= phase.min && age <= phase.max)?.[1] || null;
}

function normalisePosition(value) {
  const code = String(value || '').trim().toUpperCase();
  if (!code) return null;
  const canonical = POSITION_ALIASES[code] || code;
  return Object.values(POSITION_GROUPS).flat().includes(canonical) ? canonical : null;
}

function normalisePositions(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(/[,/|]/g);
  return unique(values.map(normalisePosition).filter(Boolean));
}

function getPrimaryPosition(player = {}) {
  const explicit = normalisePosition(player.primary_position || player.primaryPosition || player.specific_position || player.specificPosition);
  if (explicit) return explicit;
  return normalisePositions(player.positions)[0] || null;
}

function getPositionGroup(positionOrPlayer) {
  if (positionOrPlayer && typeof positionOrPlayer === 'object') {
    const stored = String(positionOrPlayer.position_group || positionOrPlayer.positionGroup || '').trim();
    if (Object.prototype.hasOwnProperty.call(POSITION_GROUPS, stored)) return stored;
    return getPositionGroup(getPrimaryPosition(positionOrPlayer));
  }
  const position = normalisePosition(positionOrPlayer);
  if (!position) return null;
  return Object.entries(POSITION_GROUPS).find(([, positions]) => positions.includes(position))?.[0] || null;
}

function attributesForGroup(group) {
  if (group === 'Goalkeeper') return [...GOALKEEPER_ATTRIBUTES];
  if (group === 'Defender') return [...GENERAL_ATTRIBUTES, ...DEFENDER_ATTRIBUTES];
  if (group === 'Midfielder') return [...GENERAL_ATTRIBUTES, ...MIDFIELDER_ATTRIBUTES];
  if (group === 'Attacker') return [...GENERAL_ATTRIBUTES, ...ATTACKER_ATTRIBUTES];
  return [];
}

function attributesForPlayer(player = {}) {
  return attributesForGroup(getPositionGroup(player));
}

function flattenRatingObject(value, target = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return target;
  Object.entries(value).forEach(([key, child]) => {
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenRatingObject(child, target);
    else target[key] = child;
  });
  return target;
}

function normaliseRating(value, scale = 'ten') {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (scale === 'five') {
    if (!Number.isInteger(number) || number < 1 || number > 5) return null;
    return number * 20;
  }
  if (scale === 'ten') {
    if (!Number.isInteger(number) || number < 1 || number > 10) return null;
    return number * 10;
  }
  if (scale === 'hundred') {
    if (number <= 0 || number > 100) return null;
    return number;
  }
  if (number >= 1 && number <= 5) return number * 20;
  if (number > 5 && number <= 10) return number * 10;
  if (number > 10 && number <= 100) return number;
  return null;
}

function playerRatingScale(player = {}, nested = false) {
  if (nested) {
    const nestedScale = String(player.attribute_rating_scale || player.attributeRatingScale || 'ten').toLowerCase();
    if (nestedScale.includes('100') || nestedScale === 'hundred') return 'hundred';
    if (nestedScale.includes('10') || nestedScale === 'ten') return 'ten';
    return 'ten';
  }
  // Existing scalar columns historically contain either 1-10 or 0-100 data.
  // They must remain auto-detected even after attribute_rating_scale='ten' is
  // added for the new nested attribute_ratings payload.
  const raw = String(player.legacy_attribute_rating_scale || player.legacyRatingScale || '').toLowerCase();
  if (raw.includes('5') || raw === 'five') return 'five';
  if (raw.includes('100') || raw === 'hundred') return 'hundred';
  if (raw.includes('10') || raw === 'ten') return 'ten';
  const legacyKeys = unique(Object.values(LEGACY_ATTRIBUTE_MAP).flat().map(source => source.key));
  const legacyValues = legacyKeys
    .filter(key => Object.prototype.hasOwnProperty.call(player, key))
    .map(key => Number(player[key]))
    .filter(Number.isFinite);
  return legacyValues.some(value => value > 10) ? 'hundred' : 'ten';
}

function directNewRating(player, key) {
  const nested = flattenRatingObject(player.attribute_ratings || player.attributeRatings || {});
  if (!Object.prototype.hasOwnProperty.call(nested, key)) return null;
  return normaliseRating(nested[key], playerRatingScale(player, true));
}

function legacyRating(player, key) {
  const sources = LEGACY_ATTRIBUTE_MAP[key] || [];
  const scale = playerRatingScale(player, false);
  const exactNewRoot = Object.prototype.hasOwnProperty.call(player, key)
    && !['passing', 'dribbling', 'pace', 'strength', 'stamina', 'composure', 'shooting', 'tackling', 'crossing'].includes(key);
  if (exactNewRoot) {
    const direct = normaliseRating(player[key], scale);
    if (direct !== null) return direct;
  }
  let weightedTotal = 0;
  let usedWeight = 0;
  sources.forEach(source => {
    if (!Object.prototype.hasOwnProperty.call(player, source.key)) return;
    const score = normaliseRating(player[source.key], scale);
    if (score === null) return;
    const weight = Number(source.weight) || 0;
    weightedTotal += score * weight;
    usedWeight += weight;
  });
  return usedWeight > 0 ? clamp(weightedTotal / usedWeight) : null;
}

function getAttributeRating(player = {}, key) {
  const direct = directNewRating(player, key);
  return direct !== null ? direct : legacyRating(player, key);
}

function collectRatings(player = {}, keys = attributesForPlayer(player)) {
  return (keys || []).reduce((ratings, key) => {
    ratings[key] = getAttributeRating(player, key);
    return ratings;
  }, {});
}

function coverageForWeights(ratings = {}, weights = {}) {
  const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0);
  const totalWeight = sum(entries.map(([, weight]) => weight));
  const observedWeight = sum(entries
    .filter(([key]) => isObservedScore(ratings[key]))
    .map(([, weight]) => weight));
  return totalWeight > 0 ? clamp((observedWeight / totalWeight) * 100) : 0;
}

function weightedMean(ratings = {}, weights = {}, options = {}) {
  const minimumCoverage = Number(options.minimumCoverage ?? 0);
  const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0);
  const totalWeight = sum(entries.map(([, weight]) => weight));
  let usedWeight = 0;
  let weightedTotal = 0;
  const used = [];
  const missing = [];
  entries.forEach(([key, weight]) => {
    if (!isObservedScore(ratings[key])) {
      missing.push(key);
      return;
    }
    const score = Number(ratings[key]);
    usedWeight += Number(weight);
    weightedTotal += score * Number(weight);
    used.push({ key, score, weight: Number(weight) });
  });
  const coverage = totalWeight > 0 ? (usedWeight / totalWeight) * 100 : 0;
  return {
    score: usedWeight > 0 && coverage >= minimumCoverage ? clamp(weightedTotal / usedWeight) : null,
    coverage: round(coverage),
    usedWeight: round(usedWeight, 3),
    totalWeight: round(totalWeight, 3),
    used,
    missing
  };
}

function generalisedWeightedMean(ratings = {}, weights = {}, options = {}) {
  const exponent = Number(options.exponent ?? -2);
  const offset = Number(options.offset ?? 5);
  const arithmetic = weightedMean(ratings, weights, options);
  if (arithmetic.score === null) return arithmetic;
  const observed = arithmetic.used;
  const totalWeight = sum(observed.map(item => item.weight));
  if (!totalWeight) return { ...arithmetic, score: null };
  if (exponent === 0) {
    const logMean = observed.reduce((total, item) => total + (item.weight / totalWeight) * Math.log(item.score + offset), 0);
    return { ...arithmetic, score: clamp(Math.exp(logMean) - offset) };
  }
  const powered = observed.reduce((total, item) => {
    return total + (item.weight / totalWeight) * ((item.score + offset) ** exponent);
  }, 0);
  return { ...arithmetic, score: clamp((powered ** (1 / exponent)) - offset) };
}

function mergeWeightVectors(weightedVectors = []) {
  const merged = {};
  weightedVectors.forEach(({ weights, multiplier = 1 }) => {
    Object.entries(weights || {}).forEach(([key, weight]) => {
      const contribution = Math.max(0, Number(weight) || 0) * Math.max(0, Number(multiplier) || 0);
      merged[key] = (merged[key] || 0) + contribution;
    });
  });
  return merged;
}

function criticalCoverage(ratings = {}, critical = []) {
  if (!critical.length) return 100;
  const observed = critical.filter(key => isObservedScore(ratings[key])).length;
  return round((observed / critical.length) * 100);
}

function scoreBand(score, bands = []) {
  const number = Number(score);
  if (!Number.isFinite(number)) return null;
  return bands.find(band => number >= band.minimum) || bands[bands.length - 1] || null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(first, second) {
  const a = parseDate(first);
  const b = parseDate(second);
  if (!a || !b) return null;
  return Math.abs(b.getTime() - a.getTime()) / 86400000;
}

function recencyWeight(dateValue, halfLifeDays, now = new Date()) {
  const ageDays = daysBetween(dateValue, now);
  if (ageDays === null) return 0.35;
  return 0.5 ** (ageDays / Math.max(1, Number(halfLifeDays) || 180));
}

function defaultFormatForAge(ageGroup) {
  return MATCH_FORMAT_BY_AGE[normaliseAgeGroup(ageGroup)] || null;
}

function defaultMatchMinutes(ageGroup) {
  return DEFAULT_MATCH_MINUTES[normaliseAgeGroup(ageGroup)] || 70;
}

function effectiveMatchEquivalents(matchHistory = [], ageGroup) {
  const defaultMinutes = defaultMatchMinutes(ageGroup);
  return round((matchHistory || []).reduce((total, fact) => {
    const minutes = Number(fact.minutes_played ?? fact.minutesPlayed ?? 0);
    const confirmedFactor = fact.confirmed === false ? 0.5 : 1;
    const usableMinutes = minutes > 0 ? Math.min(minutes, defaultMinutes) : defaultMinutes * 0.6;
    return total + (usableMinutes / defaultMinutes) * confirmedFactor;
  }, 0), 2);
}

function normaliseMatchFact(fact = {}) {
  return {
    ...fact,
    matchDate: fact.match_date || fact.matchDate || fact.created_at || fact.createdAt || null,
    minutes: Number(fact.minutes_played ?? fact.minutesPlayed ?? 0),
    performanceScore: normaliseRating(fact.performance_score ?? fact.performanceScore, 'auto'),
    goals: Number(fact.goals || fact.goals_scored || 0),
    assists: Number(fact.assists || 0),
    shots: Number(fact.shots || 0),
    shotsOnTarget: Number(fact.shots_on_target || fact.shotsOnTarget || 0),
    passesAttempted: Number(fact.passes_attempted || fact.passes || 0),
    passesCompleted: Number(fact.passes_completed || 0),
    tackles: Number(fact.tackles || 0),
    interceptions: Number(fact.interceptions || 0),
    saves: Number(fact.saves || 0),
    goalsConceded: Number(fact.goals_conceded || fact.goalsConceded || 0),
    cleanSheet: Boolean(fact.clean_sheet || fact.cleanSheet),
    positionPlayed: normalisePosition(fact.position_played || fact.positionPlayed || fact.match_position),
    format: fact.match_format || fact.format || null,
    ratings: flattenRatingObject(fact.attribute_ratings || fact.ratings || {})
  };
}

function quantile(values, probability) {
  const sorted = (values || []).filter(isObservedScore).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * clamp(probability, 0, 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function formatCurrency(value, currency = 'GBP') {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(number);
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
}

function inputFingerprint(value) {
  const serialised = JSON.stringify(stableValue(safeObject(value)));
  let hash = 2166136261;
  for (let index = 0; index < serialised.length; index += 1) {
    hash ^= serialised.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v4-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

module.exports = {
  clamp,
  round,
  sum,
  average,
  standardDeviation,
  unique,
  isObservedScore,
  normaliseAgeGroup,
  ageNumber,
  getAgeGroup,
  getAgePhase,
  normalisePosition,
  normalisePositions,
  getPrimaryPosition,
  getPositionGroup,
  attributesForGroup,
  attributesForPlayer,
  flattenRatingObject,
  normaliseRating,
  getAttributeRating,
  collectRatings,
  coverageForWeights,
  weightedMean,
  generalisedWeightedMean,
  mergeWeightVectors,
  criticalCoverage,
  scoreBand,
  parseDate,
  daysBetween,
  recencyWeight,
  defaultFormatForAge,
  defaultMatchMinutes,
  effectiveMatchEquivalents,
  normaliseMatchFact,
  quantile,
  formatCurrency,
  safeObject,
  inputFingerprint
};
