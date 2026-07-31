'use strict';

/** Target path: backend/engines/evidenceConfidence.js */

const {
  CONFIDENCE_BANDS,
  ATTRIBUTE_DEFINITIONS
} = require('./scoringConfig');
const {
  clamp,
  round,
  average,
  standardDeviation,
  getAgeGroup,
  getAgePhase,
  attributesForPlayer,
  collectRatings,
  criticalCoverage,
  effectiveMatchEquivalents,
  normaliseMatchFact,
  normaliseRating,
  recencyWeight,
  scoreBand,
  unique,
  isObservedScore
} = require('./scoringUtils');

const SAMPLE_TARGETS = Object.freeze({
  'Foundation Function Match': 3,
  'Emerging Role Match': 4,
  'Tactical Role Compatibility': 6,
  'Recruitment Compatibility': 8
});

const RECENCY_HALF_LIVES = Object.freeze({
  'Foundation Function Match': 90,
  'Emerging Role Match': 120,
  'Tactical Role Compatibility': 180,
  'Recruitment Compatibility': 270
});

function latestEvidenceDate(player = {}, facts = [], observations = []) {
  const dates = [
    player.attribute_assessed_at,
    player.attributeAssessedAt,
    player.updated_at,
    ...facts.map(fact => fact.matchDate),
    ...observations.map(observation => observation.observed_at || observation.observedAt || observation.created_at)
  ].filter(Boolean).map(value => new Date(value)).filter(date => !Number.isNaN(date.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map(date => date.getTime())));
}

function sourceCoverage(player = {}, facts = [], observations = []) {
  const sources = [];
  const attributeCount = Object.values(collectRatings(player)).filter(Number.isFinite).length;
  if (attributeCount) sources.push('coach assessment');
  if (facts.some(fact => fact.confirmed !== false)) sources.push('confirmed match facts');
  if (facts.some(fact => Object.keys(fact.ratings || {}).length)) sources.push('match-specific ratings');
  observations.forEach(observation => {
    const type = String(observation.source_type || observation.sourceType || observation.method || 'independent observation').toLowerCase();
    const observer = observation.observer_id || observation.observerId || observation.created_by || 'unknown';
    sources.push(`${type}:${observer}`);
  });
  const uniqueSources = unique(sources);
  const score = uniqueSources.length >= 4 ? 100
    : uniqueSources.length === 3 ? 85
      : uniqueSources.length === 2 ? 68
        : uniqueSources.length === 1 ? 42
          : 0;
  return { score, sources: uniqueSources };
}

function agreementScore(player = {}, facts = [], observations = []) {
  const baseRatings = collectRatings(player);
  const differences = [];
  facts.forEach(fact => {
    Object.entries(fact.ratings || {}).forEach(([key, raw]) => {
      const base = isObservedScore(baseRatings[key]) ? Number(baseRatings[key]) : null;
      const match = normaliseRating(raw, 'auto');
      if (isObservedScore(base) && isObservedScore(match)) differences.push(Math.abs(base - match));
    });
  });
  observations.forEach(observation => {
    const ratings = observation.attribute_ratings || observation.attributeRatings || observation.ratings || {};
    Object.entries(ratings).forEach(([key, raw]) => {
      const base = isObservedScore(baseRatings[key]) ? Number(baseRatings[key]) : null;
      const observed = normaliseRating(raw, 'auto');
      if (isObservedScore(base) && isObservedScore(observed)) differences.push(Math.abs(base - observed));
    });
  });
  if (differences.length) {
    const meanDifference = average(differences);
    return { score: clamp(100 - meanDifference * 1.65), comparisons: differences.length, method: 'attribute agreement' };
  }

  const performanceScores = facts.map(fact => fact.performanceScore).filter(Number.isFinite);
  if (performanceScores.length >= 3) {
    const deviation = standardDeviation(performanceScores) || 0;
    return { score: clamp(92 - deviation * 1.35), comparisons: performanceScores.length, method: 'match consistency' };
  }
  return { score: performanceScores.length ? 45 : 25, comparisons: performanceScores.length, method: 'insufficient comparison evidence' };
}

function calculateEvidenceConfidence(player = {}, matchHistory = [], options = {}) {
  const ageGroup = getAgeGroup(player);
  const agePhase = getAgePhase(ageGroup);
  const expectedAttributes = options.expectedAttributes || attributesForPlayer(player);
  const criticalAttributes = options.criticalAttributes || [];
  const ratings = collectRatings(player, expectedAttributes);
  const observedAttributes = expectedAttributes.filter(key => isObservedScore(ratings[key]));
  const missingAttributes = expectedAttributes.filter(key => !isObservedScore(ratings[key]));
  const notObservedAttributes = missingAttributes.map(key => ({
    key,
    label: ATTRIBUTE_DEFINITIONS[key]?.label || key
  }));

  const attributeCompleteness = expectedAttributes.length
    ? (observedAttributes.length / expectedAttributes.length) * 100
    : 0;
  const criticalFieldCoverage = criticalAttributes.length
    ? criticalCoverage(ratings, criticalAttributes)
    : attributeCompleteness;
  const coverageScore = criticalAttributes.length
    ? criticalFieldCoverage * 0.72 + attributeCompleteness * 0.28
    : attributeCompleteness;

  const facts = (Array.isArray(matchHistory) ? matchHistory : []).map(normaliseMatchFact);
  const effectiveMatches = effectiveMatchEquivalents(facts, ageGroup);
  const sampleTarget = SAMPLE_TARGETS[agePhase?.label] || 8;
  const sampleScore = clamp((effectiveMatches / sampleTarget) * 100);

  const observations = Array.isArray(options.observations) ? options.observations : [];
  const latestDate = latestEvidenceDate(player, facts, observations);
  const halfLife = RECENCY_HALF_LIVES[agePhase?.label] || 180;
  const recencyScore = latestDate ? recencyWeight(latestDate, halfLife, options.now || new Date()) * 100 : 0;

  const sources = sourceCoverage(player, facts, observations);
  const agreement = agreementScore(player, facts, observations);

  let score = clamp(
    coverageScore * 0.30 +
    sampleScore * 0.20 +
    recencyScore * 0.15 +
    sources.score * 0.15 +
    agreement.score * 0.20
  );

  const hardFailures = [];
  if (!ageGroup) hardFailures.push('Age group must be U7 to U16.');
  if (!expectedAttributes.length) hardFailures.push('The player position group is missing or invalid.');
  if (attributeCompleteness < 50) hardFailures.push('Fewer than half of the required attributes have been observed.');
  if (criticalAttributes.length && criticalFieldCoverage < 60) {
    hardFailures.push('More than 40% of the critical evidence for this assessment is missing.');
  }
  if (hardFailures.length) score = Math.min(score, 49);

  const band = scoreBand(score, CONFIDENCE_BANDS) || { label: 'Insufficient' };
  const missingCriticalAttributes = criticalAttributes.filter(key => !isObservedScore(ratings[key]));
  const warnings = [];
  if (effectiveMatches < sampleTarget) warnings.push(`Only ${effectiveMatches} effective match equivalents are available; ${sampleTarget} are preferred for this age phase.`);
  if (sources.sources.length < 2) warnings.push('The result is supported by fewer than two independent evidence types.');
  if (recencyScore < 50) warnings.push('The latest evidence is old or has no usable date.');
  if (agreement.score < 50) warnings.push('Evidence agreement cannot yet be established reliably.');

  return {
    score: round(score),
    label: band.label,
    status: hardFailures.length ? 'Insufficient' : band.label,
    ageGroup,
    agePhase: agePhase?.label || null,
    attributeCompleteness: round(attributeCompleteness),
    criticalFieldCoverage: round(criticalFieldCoverage),
    effectiveMatchEquivalents: effectiveMatches,
    matchesRecorded: facts.length,
    sampleTarget,
    recencyScore: round(recencyScore),
    latestEvidenceAt: latestDate ? latestDate.toISOString() : null,
    independentSourceScore: round(sources.score),
    independentSources: sources.sources,
    agreementScore: round(agreement.score),
    agreementMethod: agreement.method,
    observedAttributes,
    missingCriticalAttributes,
    notObservedAttributes,
    hardFailures,
    warnings,
    reasons: [
      `Required attribute coverage contributes 30% and is ${round(coverageScore)}%.`,
      `Effective role-specific match sample contributes 20% and is ${round(sampleScore)}%.`,
      `Evidence recency contributes 15% and is ${round(recencyScore)}%.`,
      `Independent source coverage contributes 15% and is ${round(sources.score)}%.`,
      `Agreement and consistency contribute 20% and are ${round(agreement.score)}%.`
    ]
  };
}

module.exports = {
  calculateEvidenceConfidence,
  SAMPLE_TARGETS,
  RECENCY_HALF_LIVES
};
