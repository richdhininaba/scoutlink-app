'use strict';

/**
 * Target path: backend/engines/evidenceConfidence.js
 * ScoutLink profile-first evidence confidence.
 *
 * A completed player assessment is the baseline evidence for a prediction.
 * Match volume, recency and independent observations increase confidence and
 * tighten ranges, but they never decide whether a valid player can be scored.
 */

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
  ]
    .filter(Boolean)
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()));

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
    const type = String(
      observation.source_type ||
      observation.sourceType ||
      observation.method ||
      'independent observation'
    ).toLowerCase();
    const observer = observation.observer_id || observation.observerId || observation.created_by || 'unknown';
    sources.push(`${type}:${observer}`);
  });

  const uniqueSources = unique(sources);
  const score = uniqueSources.length >= 4 ? 100
    : uniqueSources.length === 3 ? 90
      : uniqueSources.length === 2 ? 75
        : uniqueSources.length === 1 ? 55
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
      if (isObservedScore(base) && isObservedScore(match)) {
        differences.push(Math.abs(base - match));
      }
    });
  });

  observations.forEach(observation => {
    const ratings = observation.attribute_ratings || observation.attributeRatings || observation.ratings || {};
    Object.entries(ratings).forEach(([key, raw]) => {
      const base = isObservedScore(baseRatings[key]) ? Number(baseRatings[key]) : null;
      const observed = normaliseRating(raw, 'auto');
      if (isObservedScore(base) && isObservedScore(observed)) {
        differences.push(Math.abs(base - observed));
      }
    });
  });

  if (differences.length) {
    const meanDifference = average(differences);
    return {
      score: clamp(100 - meanDifference * 1.5),
      comparisons: differences.length,
      method: 'attribute agreement'
    };
  }

  const performanceScores = facts.map(fact => fact.performanceScore).filter(Number.isFinite);
  if (performanceScores.length >= 3) {
    const deviation = standardDeviation(performanceScores) || 0;
    return {
      score: clamp(92 - deviation * 1.25),
      comparisons: performanceScores.length,
      method: 'match consistency'
    };
  }

  return {
    score: 50,
    comparisons: performanceScores.length,
    method: 'profile-led baseline'
  };
}

function confidenceLabel(score, attributeCompleteness, hardFailures) {
  if (hardFailures.length) return 'Profile incomplete';

  const band = scoreBand(score, CONFIDENCE_BANDS);
  const raw = String(band?.label || '').trim();

  if (attributeCompleteness >= 90 && (!raw || /insufficient/i.test(raw))) {
    return 'Profile-led';
  }
  if (attributeCompleteness >= 75 && (!raw || /insufficient/i.test(raw))) {
    return 'Developing profile';
  }
  return raw || 'Profile-led';
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
  const recencyScore = latestDate
    ? recencyWeight(latestDate, halfLife, options.now || new Date()) * 100
    : 50;

  const sources = sourceCoverage(player, facts, observations);
  const agreement = agreementScore(player, facts, observations);

  // Profile completeness is deliberately dominant. Match evidence and other
  // sources are confidence boosters, not prerequisites for a prediction.
  let score = clamp(
    coverageScore * 0.60 +
    sampleScore * 0.12 +
    recencyScore * 0.10 +
    sources.score * 0.08 +
    agreement.score * 0.10
  );

  const hardFailures = [];
  if (!ageGroup) hardFailures.push('Age group must be U7 to U16.');
  if (!expectedAttributes.length) hardFailures.push('The player position group is missing or invalid.');

  // Completed profiles receive a minimum confidence floor. This prevents a
  // low match sample from turning a complete assessment into a non-result.
  if (!hardFailures.length) {
    const profileFloor = attributeCompleteness >= 95 && criticalFieldCoverage >= 90 ? 68
      : attributeCompleteness >= 85 && criticalFieldCoverage >= 75 ? 62
        : attributeCompleteness >= 70 ? 55
          : 45;
    score = Math.max(score, profileFloor);
  } else {
    score = Math.min(score, 49);
  }

  const label = confidenceLabel(score, attributeCompleteness, hardFailures);
  const missingCriticalAttributes = criticalAttributes.filter(key => !isObservedScore(ratings[key]));
  const warnings = [];

  if (attributeCompleteness < 90 && expectedAttributes.length) {
    warnings.push(`The player profile is ${round(attributeCompleteness)}% complete; the projection uses the recorded profile and widens uncertainty around ungraded fields.`);
  }
  if (effectiveMatches < sampleTarget) {
    warnings.push(`${effectiveMatches} effective match equivalents are recorded; additional matches will strengthen trend calibration and tighten the likely range.`);
  }
  if (sources.sources.length < 2) {
    warnings.push('The assessed player profile is the primary evidence source; independent match or scout observations would add corroboration.');
  }
  if (agreement.score < 50) {
    warnings.push('Cross-source agreement is still developing; the player profile remains the baseline assessment.');
  }

  return {
    score: round(score),
    label,
    status: hardFailures.length ? 'Profile incomplete' : label,
    ageGroup,
    agePhase: agePhase?.label || null,
    profileLed: true,
    attributeCompleteness: round(attributeCompleteness),
    criticalFieldCoverage: round(criticalFieldCoverage),
    effectiveMatchEquivalents: effectiveMatches,
    matchesRecorded: facts.length,
    sampleTarget,
    matchSampleScore: round(sampleScore),
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
      `Assessed player-profile coverage contributes 60% and is ${round(coverageScore)}%.`,
      `Recorded match sample contributes up to 12% and is ${round(sampleScore)}%.`,
      `Evidence recency contributes 10% and is ${round(recencyScore)}%.`,
      `Independent source coverage contributes 8% and is ${round(sources.score)}%.`,
      `Agreement and consistency contribute 10% and are ${round(agreement.score)}%.`,
      'Match volume strengthens confidence and range calibration; it does not determine whether the player can be predicted.'
    ]
  };
}

module.exports = {
  calculateEvidenceConfidence,
  SAMPLE_TARGETS,
  RECENCY_HALF_LIVES
};
