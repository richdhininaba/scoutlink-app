'use strict';

/** Target path: backend/engines/overallRating.js */

const {
  SCORING_VERSION,
  ATTRIBUTE_DEFINITIONS,
  POSITION_GROUPS,
  POSITION_PROFILES,
  OVERALL_BANDS
} = require('./scoringConfig');
const {
  clamp,
  round,
  average,
  getAgeGroup,
  getAgePhase,
  getPrimaryPosition,
  getPositionGroup,
  normalisePositions,
  attributesForGroup,
  collectRatings,
  weightedMean,
  criticalCoverage,
  scoreBand,
  normaliseMatchFact,
  recencyWeight,
  inputFingerprint,
  isObservedScore
} = require('./scoringUtils');
const { calculateEvidenceConfidence } = require('./evidenceConfidence');

function weightedRecentPerformance(matchHistory = [], agePhase, now = new Date()) {
  const halfLife = agePhase?.max <= 9 ? 90 : agePhase?.max <= 11 ? 120 : agePhase?.max <= 13 ? 180 : 270;
  let weightedTotal = 0;
  let weightTotal = 0;
  matchHistory.forEach(fact => {
    if (!isObservedScore(fact.performanceScore)) return;
    const weight = recencyWeight(fact.matchDate, halfLife, now) * (fact.confirmed === false ? 0.5 : 1);
    weightedTotal += Number(fact.performanceScore) * weight;
    weightTotal += weight;
  });
  return weightTotal > 0 ? clamp(weightedTotal / weightTotal) : null;
}

function benchmarkMatchSignal(matchHistory = [], positionGroup, benchmarks = {}) {
  if (!matchHistory.length || !benchmarks || typeof benchmarks !== 'object') return null;
  const totalMinutes = matchHistory.reduce((total, fact) => total + Math.max(0, Number(fact.minutes) || 0), 0);
  if (totalMinutes <= 0) return null;
  const per90 = value => (value / totalMinutes) * 90;
  const totals = matchHistory.reduce((acc, fact) => {
    acc.goals += fact.goals;
    acc.assists += fact.assists;
    acc.tackles += fact.tackles;
    acc.interceptions += fact.interceptions;
    acc.saves += fact.saves;
    acc.goalsConceded += fact.goalsConceded;
    return acc;
  }, { goals: 0, assists: 0, tackles: 0, interceptions: 0, saves: 0, goalsConceded: 0 });
  const groupBenchmarks = benchmarks[positionGroup] || benchmarks.default;
  if (!groupBenchmarks) return null;
  const comparisons = [];
  Object.entries(groupBenchmarks).forEach(([metric, benchmark]) => {
    const expected = Number(benchmark);
    if (!Number.isFinite(expected) || expected <= 0 || !Object.prototype.hasOwnProperty.call(totals, metric)) return;
    const actual = per90(totals[metric]);
    const ratio = metric === 'goalsConceded' ? expected / Math.max(actual, 0.1) : actual / expected;
    comparisons.push(clamp(50 + (ratio - 1) * 25, 25, 75));
  });
  return average(comparisons);
}

function calculateMatchPerformance(player = {}, matchHistory = [], options = {}) {
  const facts = (Array.isArray(matchHistory) ? matchHistory : []).map(normaliseMatchFact);
  const agePhase = getAgePhase(player);
  const recentPerformance = weightedRecentPerformance(facts, agePhase, options.now || new Date());
  const benchmarkSignal = benchmarkMatchSignal(facts, getPositionGroup(player), options.matchBenchmarks || {});
  const score = recentPerformance !== null && benchmarkSignal !== null
    ? recentPerformance * 0.82 + benchmarkSignal * 0.18
    : recentPerformance;
  return {
    score: score === null ? null : round(score),
    recentPerformanceScore: recentPerformance === null ? null : round(recentPerformance),
    benchmarkSignal: benchmarkSignal === null ? null : round(benchmarkSignal),
    matchesUsed: facts.filter(fact => isObservedScore(fact.performanceScore)).length,
    note: score === null
      ? 'No match-performance rating is available. Goals, assists and clean sheets are not converted into ability without an age, format, position and competition benchmark.'
      : benchmarkSignal === null
        ? 'Match performance is based on recorded performance ratings; raw event totals are not independently added without a verified benchmark.'
        : 'Match performance combines recent performance ratings with verified position-context benchmarks.'
  };
}

function categoryBreakdown(ratings, profile) {
  const categories = ['technical', 'tacticalCognitive', 'physical', 'mentalDevelopmental'];
  return categories.reduce((result, category) => {
    const weights = Object.entries(profile.weights).reduce((mapped, [key, weight]) => {
      if (ATTRIBUTE_DEFINITIONS[key]?.category === category) mapped[key] = weight;
      return mapped;
    }, {});
    result[category] = weightedMean(ratings, weights, { minimumCoverage: 40 }).score;
    return result;
  }, {});
}

function applyCriticalFloors(score, ratings, criticalAttributes) {
  const observedCritical = criticalAttributes
    .map(key => ({ key, score: Number(ratings[key]) }))
    .filter((item, index) => isObservedScore(ratings[criticalAttributes[index]]));
  const below40 = observedCritical.filter(item => item.score < 40);
  const below60 = observedCritical.filter(item => item.score < 60);
  let ceiling = 100;
  const reasons = [];
  if (below40.length) {
    ceiling = Math.min(ceiling, 55);
    reasons.push(`A critical attribute below 40/100 caps the rating at 55: ${below40.map(item => item.key).join(', ')}.`);
  } else if (below60.length >= 2) {
    ceiling = Math.min(ceiling, 68);
    reasons.push(`Two or more critical attributes below 60/100 cap the rating at 68: ${below60.map(item => item.key).join(', ')}.`);
  } else if (below60.length === 1) {
    ceiling = Math.min(ceiling, 72);
    reasons.push(`A critical attribute below 60/100 caps the rating at 72: ${below60[0].key}.`);
  }
  return { score: Math.min(score, ceiling), ceiling, reasons };
}

function rankAttributes(ratings, profile) {
  return Object.entries(profile.weights)
    .map(([key, importance]) => ({
      key,
      label: ATTRIBUTE_DEFINITIONS[key]?.label || key,
      score: isObservedScore(ratings[key]) ? round(ratings[key]) : null,
      importance: Number(importance) || 0
    }))
    .filter(item => item.score !== null);
}

function calculatePositionRating(player = {}, position, matchHistory = [], options = {}) {
  const profile = POSITION_PROFILES[position];
  if (!profile) return null;
  const targetGroup = getPositionGroup(position);
  const requiredAttributes = attributesForGroup(targetGroup);
  const ratings = collectRatings(player, requiredAttributes);
  const result = weightedMean(ratings, profile.weights, { minimumCoverage: 60 });
  const criticalFieldCoverage = criticalCoverage(ratings, profile.critical);
  if (result.score === null || criticalFieldCoverage < 60) return null;
  const matchPerformance = calculateMatchPerformance(player, matchHistory, options);
  const phase = getAgePhase(player);
  const evidence = calculateEvidenceConfidence(player, matchHistory, {
    ...options,
    expectedAttributes: requiredAttributes,
    criticalAttributes: profile.critical
  });
  const sampleFactor = clamp(evidence.effectiveMatchEquivalents / Math.max(1, evidence.sampleTarget), 0, 1);
  const matchWeight = matchPerformance.score === null ? 0 : (phase?.maxMatchWeight || 0.15) * sampleFactor;
  const blended = result.score * (1 - matchWeight) + (matchPerformance.score || 0) * matchWeight;
  const floorResult = applyCriticalFloors(blended, ratings, profile.critical);
  return {
    position,
    score: round(floorResult.score),
    attributeScore: round(result.score),
    matchPerformanceScore: matchPerformance.score,
    matchWeight: round(matchWeight * 100),
    coverage: result.coverage,
    criticalFieldCoverage,
    scoreCeiling: floorResult.ceiling,
    floorReasons: floorResult.reasons,
    ratings,
    evidence
  };
}

function hasCrossGroupAssessment(player, targetGroup) {
  const required = attributesForGroup(targetGroup);
  const ratings = collectRatings(player, required);
  const observed = required.filter(key => isObservedScore(ratings[key])).length;
  return required.length > 0 && observed / required.length >= 0.60;
}

function calculatePositionRatings(player = {}, matchHistory = [], options = {}) {
  const primaryPosition = getPrimaryPosition(player);
  const primaryGroup = getPositionGroup(primaryPosition);
  const declaredPositions = normalisePositions(player.positions || player.alternative_positions || player.alternativePositions);
  const candidates = Object.values(POSITION_GROUPS).flat().filter(position => {
    const targetGroup = getPositionGroup(position);
    if (targetGroup === primaryGroup) return true;
    if (!declaredPositions.includes(position)) return false;
    return hasCrossGroupAssessment(player, targetGroup);
  });

  const results = candidates
    .map(position => calculatePositionRating(player, position, matchHistory, options))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const ratings = results.reduce((mapped, result) => {
    mapped[result.position] = result.score;
    return mapped;
  }, {});
  const sameGroup = results.filter(result => getPositionGroup(result.position) === primaryGroup);
  const bestCurrent = sameGroup[0] || results[0] || null;
  return {
    ratings,
    sorted: results.map(result => ({ role: result.position, position: result.position, score: result.score, group: getPositionGroup(result.position) })),
    bestCurrentPosition: bestCurrent?.position || primaryPosition,
    bestCurrentScore: bestCurrent?.score ?? null,
    primaryPosition,
    positionGroup: primaryGroup,
    unsupportedCrossGroupPositions: declaredPositions.filter(position => getPositionGroup(position) !== primaryGroup && !hasCrossGroupAssessment(player, getPositionGroup(position))),
    conversionCandidates: results
      .filter(result => result.position !== primaryPosition && result.score >= ((bestCurrent?.score || 0) - 6))
      .slice(0, 4)
      .map(result => ({
        role: result.position,
        position: result.position,
        score: result.score,
        reason: getPositionGroup(result.position) === primaryGroup
          ? 'Supported alternative in the same position group.'
          : 'Cross-group rating is shown because the required additional attributes were assessed.'
      }))
  };
}

function calculateOverallRating(player = {}, matchHistory = [], options = {}) {
  const ageGroup = getAgeGroup(player);
  const primaryPosition = getPrimaryPosition(player);
  const positionGroup = getPositionGroup(primaryPosition);
  const profile = POSITION_PROFILES[primaryPosition];
  const hardFailures = [];
  if (!ageGroup) hardFailures.push('Age group must be U7 to U16.');
  if (!primaryPosition || !profile) hardFailures.push('A supported primary position is required.');
  if ((primaryPosition === 'GK') !== (positionGroup === 'Goalkeeper')) hardFailures.push('Goalkeeper and outfield position data conflict.');

  if (hardFailures.length) {
    return {
      scoringVersion: SCORING_VERSION,
      finalScore: null,
      overallRating: null,
      noScoreReason: hardFailures.join(' '),
      hardFailures,
      primaryPosition,
      positionGroup,
      ageGroup,
      warnings: []
    };
  }

  const requiredAttributes = attributesForGroup(positionGroup);
  const ratings = collectRatings(player, requiredAttributes);
  const attributeResult = weightedMean(ratings, profile.weights, { minimumCoverage: 60 });
  const criticalFieldCoverage = criticalCoverage(ratings, profile.critical);
  const evidence = calculateEvidenceConfidence(player, matchHistory, {
    ...options,
    expectedAttributes: requiredAttributes,
    criticalAttributes: profile.critical
  });
  if (attributeResult.score === null || criticalFieldCoverage < 60) {
    const reason = criticalFieldCoverage < 60
      ? 'More than 40% of the primary-position critical attributes are missing.'
      : 'Fewer than 60% of the weighted primary-position attributes are available.';
    return {
      scoringVersion: SCORING_VERSION,
      finalScore: null,
      overallRating: null,
      noScoreReason: reason,
      hardFailures: [reason],
      primaryPosition,
      positionGroup,
      ageGroup,
      evidenceConfidence: evidence,
      dataConfidenceScore: evidence.score,
      dataConfidenceLabel: evidence.label,
      warnings: evidence.warnings
    };
  }

  const matchPerformance = calculateMatchPerformance(player, matchHistory, options);
  const phase = getAgePhase(ageGroup);
  const sampleFactor = clamp(evidence.effectiveMatchEquivalents / Math.max(1, evidence.sampleTarget), 0, 1);
  const matchWeight = matchPerformance.score === null ? 0 : (phase?.maxMatchWeight || 0.15) * sampleFactor;
  const blendedScore = attributeResult.score * (1 - matchWeight) + (matchPerformance.score || 0) * matchWeight;
  const floorResult = applyCriticalFloors(blendedScore, ratings, profile.critical);
  const finalScore = round(floorResult.score);
  const categories = categoryBreakdown(ratings, profile);
  const ranked = rankAttributes(ratings, profile);
  const strengths = [...ranked].sort((a, b) => (b.score * b.importance) - (a.score * a.importance)).slice(0, 4);
  const criticalWeaknesses = ranked
    .filter(item => profile.critical.includes(item.key) && item.score < 60)
    .sort((a, b) => a.score - b.score);
  const developmentPriorities = [...ranked].sort((a, b) => {
    const aPriority = (100 - a.score) * a.importance;
    const bPriority = (100 - b.score) * b.importance;
    return bPriority - aPriority;
  }).slice(0, 4);
  const band = scoreBand(finalScore, OVERALL_BANDS);
  const positionRatings = calculatePositionRatings(player, matchHistory, options);
  const warnings = [...evidence.warnings, ...floorResult.reasons];
  if (positionRatings.unsupportedCrossGroupPositions.length) {
    warnings.push(`No rating was produced for cross-group positions without the required assessment: ${positionRatings.unsupportedCrossGroupPositions.join(', ')}.`);
  }

  return {
    scoringVersion: SCORING_VERSION,
    calculatedAt: (options.now || new Date()).toISOString(),
    inputFingerprint: inputFingerprint({ ageGroup, primaryPosition, ratings }),
    finalScore,
    overallRating: finalScore,
    currentReadiness: finalScore,
    label: band?.label || null,
    primaryPosition,
    positionGroup,
    bestCurrentPosition: positionRatings.bestCurrentPosition,
    ageGroup,
    agePhase: phase?.label || null,
    attributeScore: round(attributeResult.score),
    weightedAttributeCoverage: attributeResult.coverage,
    criticalFieldCoverage,
    technicalScore: categories.technical === null ? null : round(categories.technical),
    tacticalCognitiveScore: categories.tacticalCognitive === null ? null : round(categories.tacticalCognitive),
    tacticalIQScore: categories.tacticalCognitive === null ? null : round(categories.tacticalCognitive),
    physicalScore: categories.physical === null ? null : round(categories.physical),
    physicalProfileScore: categories.physical === null ? null : round(categories.physical),
    mentalDevelopmentalScore: categories.mentalDevelopmental === null ? null : round(categories.mentalDevelopmental),
    mentalCoachabilityScore: categories.mentalDevelopmental === null ? null : round(categories.mentalDevelopmental),
    matchPerformanceScore: matchPerformance.score,
    matchOutputScore: matchPerformance.score,
    matchWeight: round(matchWeight * 100),
    scoreCeiling: floorResult.ceiling,
    strengths,
    criticalWeaknesses,
    developmentPriorities,
    evidenceConfidence: evidence,
    dataConfidenceScore: evidence.score,
    dataConfidenceLabel: evidence.label,
    dataConfidenceNote: evidence.warnings[0] || 'Evidence confidence is reported separately from ability.',
    evidenceMatches: evidence.matchesRecorded,
    positionRatings,
    matchPerformance,
    disciplineFlag: Number(player.red_cards || 0) > 0 || Number(player.yellow_cards || 0) >= 5
      ? 'Review discipline context manually; cards do not directly lower ability.'
      : null,
    warnings,
    explanation: 'Overall rating is current, position-specific football ability. It combines the coach assessment with a limited amount of contextual match performance; potential, compatibility, financial value, body size and evidence volume do not add ability points.'
  };
}

function computeOverall(player = {}, matchHistory = [], options = {}) {
  return calculateOverallRating(player, matchHistory, options).overallRating;
}

module.exports = {
  calculateOverallRating,
  calculateOverallBreakdown: calculateOverallRating,
  calculatePositionRating,
  calculatePositionRatings,
  calculateMatchPerformance,
  computeOverall
};
