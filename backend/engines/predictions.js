'use strict';

/**
 * Target path: backend/engines/predictions.js
 * ScoutLink scoring engine v4 development and role projections.
 *
 * This is a bounded football-development projection, not a promise of future
 * performance. It uses age group only. It never infers exact age, relative-age
 * status, maturation or growth from height, weight or build.
 */

const {
  SCORING_VERSION,
  ATTRIBUTE_DEFINITIONS,
  POSITION_GROUPS,
  POSITION_PROFILES,
  POSITION_ROLES,
  ROLE_PROFILES,
  DEVELOPMENT_PLANS,
  MATCH_SCENARIOS,
  MATCH_SCENARIO_ALIASES
} = require('./scoringConfig');
const {
  clamp,
  round,
  average,
  normaliseAgeGroup,
  getAgeGroup,
  getAgePhase,
  getPrimaryPosition,
  getPositionGroup,
  normalisePosition,
  normalisePositions,
  attributesForGroup,
  collectRatings,
  coverageForWeights,
  weightedMean,
  generalisedWeightedMean,
  criticalCoverage,
  normaliseMatchFact,
  inputFingerprint,
  isObservedScore
} = require('./scoringUtils');
const {
  calculateOverallRating,
  calculatePositionRating
} = require('./overallRating');
const { calculateEvidenceConfidence } = require('./evidenceConfidence');

const PHASE_PROJECTION_RULES = Object.freeze({
  'Foundation Function Match': { headroomFactor: 0.46, maximumGrowth: 16, horizon: 'five-season development scenario' },
  'Emerging Role Match': { headroomFactor: 0.40, maximumGrowth: 14, horizon: 'five-season development scenario' },
  'Tactical Role Compatibility': { headroomFactor: 0.34, maximumGrowth: 12, horizon: 'three-to-five-season projection' },
  'Recruitment Compatibility': { headroomFactor: 0.28, maximumGrowth: 10, horizon: 'one-to-three-season projection' }
});

function normaliseKey(value, catalogue = {}) {
  const raw = String(value || '').trim().toLowerCase();
  if (catalogue[raw]) return raw;
  const underscored = raw.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (catalogue[underscored]) return underscored;
  return Object.entries(catalogue).find(([, item]) => {
    return String(item.label || '').trim().toLowerCase() === raw;
  })?.[0] || null;
}

function developmentFoundation(player = {}, ratings = collectRatings(player)) {
  const group = getPositionGroup(player);
  const weights = group === 'Goalkeeper'
    ? {
        gk_decision_making: 6,
        gk_composure: 5,
        gk_distribution: 3,
        gk_sweeping: 2,
        gk_agility_explosiveness: 2
      }
    : {
        coachability: 7,
        response_to_mistakes: 6,
        decision_making: 5,
        awareness: 4,
        composure: 4,
        first_touch: 2
      };
  const result = generalisedWeightedMean(ratings, weights, {
    exponent: -1,
    minimumCoverage: 55
  });
  return {
    score: result.score === null ? 50 : round(result.score),
    coverage: result.coverage,
    missing: result.missing
  };
}

function performanceTrend(matchHistory = []) {
  const facts = (Array.isArray(matchHistory) ? matchHistory : [])
    .map(normaliseMatchFact)
    .filter(fact => isObservedScore(fact.performanceScore))
    .sort((a, b) => {
      const first = a.matchDate ? new Date(a.matchDate).getTime() : 0;
      const second = b.matchDate ? new Date(b.matchDate).getTime() : 0;
      return first - second;
    });
  if (facts.length < 3) {
    return {
      score: 50,
      slopePerMatch: null,
      label: 'Unestablished',
      matchesUsed: facts.length,
      reason: 'At least three contextual performance ratings are required to estimate a trend.'
    };
  }

  const count = facts.length;
  const xMean = (count - 1) / 2;
  const yMean = average(facts.map(fact => fact.performanceScore));
  let numerator = 0;
  let denominator = 0;
  facts.forEach((fact, index) => {
    numerator += (index - xMean) * (fact.performanceScore - yMean);
    denominator += (index - xMean) ** 2;
  });
  const slope = denominator ? numerator / denominator : 0;
  const score = clamp(50 + clamp(slope, -5, 5) * 8);
  return {
    score: round(score),
    slopePerMatch: round(slope, 2),
    label: slope >= 1.25 ? 'Rising' : slope <= -1.25 ? 'Declining' : 'Stable',
    matchesUsed: count,
    reason: 'Trend is a least-squares direction across recorded contextual performance ratings; raw goals and assists are not treated as a development trend.'
  };
}

function chooseDevelopmentPlan(player = {}, requestedPlan) {
  const selected = normaliseKey(requestedPlan, DEVELOPMENT_PLANS);
  if (selected) return selected;
  const group = getPositionGroup(player);
  if (group === 'Goalkeeper') return 'goalkeeper_command';
  if (group === 'Defender') return 'defensive_intelligence';
  if (group === 'Midfielder') return 'technical_possession';
  if (group === 'Attacker') return 'final_third_output';
  return 'balanced';
}

function projectedAttributeRatings(player = {}, season, planKey, potentialGrowth) {
  const group = getPositionGroup(player);
  const keys = attributesForGroup(group);
  const current = collectRatings(player, keys);
  const plan = DEVELOPMENT_PLANS[planKey] || DEVELOPMENT_PLANS.balanced;
  const progress = (1 - Math.exp(-0.55 * season)) / (1 - Math.exp(-0.55 * 5));
  return keys.reduce((projected, key) => {
    if (!isObservedScore(current[key])) return projected;
    const score = Number(current[key]);
    const isPriority = plan.priority.includes(key);
    const focus = isPriority ? plan.intensity : 0.34;
    const attributeGrowth = Math.min(
      100 - score,
      potentialGrowth * progress * focus * (0.65 + ((100 - score) / 100) * 0.35)
    );
    projected[key] = round(score + Math.max(0, attributeGrowth));
    return projected;
  }, {});
}

function calculateAttributeDevelopment(player = {}, options = {}) {
  const ageGroup = getAgeGroup(player);
  const phase = getAgePhase(ageGroup);
  const planKey = chooseDevelopmentPlan(player, options.developmentPlan || options.plan);
  const plan = DEVELOPMENT_PLANS[planKey] || DEVELOPMENT_PLANS.balanced;
  const seasons = clamp(Number(options.seasons || 5), 1, 5);
  const potentialGrowth = clamp(Number(options.potentialGrowth || 0), 0, 20);
  const current = collectRatings(player, attributesForGroup(getPositionGroup(player)));
  const projections = [];

  for (let season = 1; season <= seasons; season += 1) {
    const projected = projectedAttributeRatings(player, season, planKey, potentialGrowth);
    const improvements = Object.keys(projected)
      .map(key => ({
        key,
        label: ATTRIBUTE_DEFINITIONS[key]?.label || key,
        current: round(current[key]),
        projected: projected[key],
        change: round(projected[key] - current[key]),
        priority: plan.priority.includes(key)
      }))
      .filter(item => item.change > 0)
      .sort((a, b) => b.change - a.change);
    projections.push({
      season,
      projectedAttributes: projected,
      leadingImprovements: improvements.slice(0, 6)
    });
  }

  return {
    plan: planKey,
    planLabel: plan.label,
    seasons,
    ageGroup,
    agePhase: phase?.label || null,
    projections,
    assumption: 'This is a bounded coaching scenario. It assumes suitable training and availability and does not infer biological growth or maturation.'
  };
}

function roleFitForPosition(player = {}, position, roleKey, evidence) {
  const profile = ROLE_PROFILES[roleKey];
  if (!profile || !profile.positions.includes(position)) return null;
  const ratings = collectRatings(player, attributesForGroup(getPositionGroup(position)));
  const result = generalisedWeightedMean(ratings, profile.weights, {
    exponent: -2,
    minimumCoverage: 65
  });
  const criticalFieldCoverage = criticalCoverage(ratings, profile.critical);
  if (result.score === null || criticalFieldCoverage < 60) return null;
  const criticalScores = profile.critical
    .filter(key => isObservedScore(ratings[key]))
    .map(key => Number(ratings[key]));
  const weakestCritical = criticalScores.length ? Math.min(...criticalScores) : null;
  let ceiling = 100;
  if (weakestCritical !== null && weakestCritical < 40) ceiling = 55;
  else if (criticalScores.filter(score => score < 60).length >= 2) ceiling = 68;
  else if (weakestCritical !== null && weakestCritical < 60) ceiling = 72;
  const score = round(Math.min(result.score, ceiling));
  const width = round(3 + ((100 - Number(evidence?.score || 0)) * 0.10));
  return {
    position,
    role: roleKey,
    roleLabel: profile.label,
    score,
    likelyRange: {
      minimum: round(clamp(score - width)),
      maximum: round(clamp(score + width * 0.65))
    },
    coverage: result.coverage,
    criticalFieldCoverage,
    scoreCeiling: ceiling,
    status: evidence?.score >= 70 ? 'Verified assessment' : 'Provisional assessment'
  };
}

function calculateRoleFits(player = {}, overallAnalysis, evidence) {
  const positionRatings = overallAnalysis?.positionRatings?.ratings || {};
  const positions = Object.keys(positionRatings);
  const fits = [];
  positions.forEach(position => {
    (POSITION_ROLES[position] || []).forEach(roleKey => {
      const fit = roleFitForPosition(player, position, roleKey, evidence);
      if (fit) fits.push(fit);
    });
  });
  return fits.sort((a, b) => b.score - a.score);
}

function calculatePositionFitPrediction(player = {}, targetPosition, matchHistory = [], options = {}) {
  const position = normalisePosition(targetPosition);
  if (!position) {
    return {
      targetPosition: null,
      score: null,
      status: 'Insufficient evidence',
      noScoreReason: 'A supported target position is required.'
    };
  }
  const primaryGroup = getPositionGroup(player);
  const targetGroup = getPositionGroup(position);
  const targetAttributes = attributesForGroup(targetGroup);
  const ratings = collectRatings(player, targetAttributes);
  const coverage = coverageForWeights(ratings, POSITION_PROFILES[position]?.weights || {});
  const sameGroup = primaryGroup === targetGroup;
  const declared = normalisePositions(player.positions || player.alternative_positions || player.alternativePositions);
  if (!sameGroup && (!declared.includes(position) || coverage < 60)) {
    return {
      targetPosition: position,
      score: null,
      status: 'Insufficient evidence',
      evidenceCoverage: round(coverage),
      noScoreReason: 'A cross-group projection requires the position to be declared and at least 60% of its additional assessment to be completed.'
    };
  }
  const result = calculatePositionRating(player, position, matchHistory, options);
  if (!result) {
    return {
      targetPosition: position,
      score: null,
      status: 'Insufficient evidence',
      evidenceCoverage: round(coverage),
      noScoreReason: 'The target position does not have enough critical evidence for a rating.'
    };
  }
  return {
    targetPosition: position,
    score: result.score,
    status: sameGroup ? 'Supported position-group projection' : 'Verified cross-group assessment',
    evidenceCoverage: result.coverage,
    criticalFieldCoverage: result.criticalFieldCoverage,
    scoreCeiling: result.scoreCeiling,
    roles: (POSITION_ROLES[position] || [])
      .map(roleKey => roleFitForPosition(player, position, roleKey, result.evidence))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
  };
}

function calculateScenarioPrediction(player = {}, scenarioInput, matchHistory = [], options = {}) {
  const suppliedKey = String(scenarioInput || '').trim();
  const scenarioKey = normaliseKey(MATCH_SCENARIO_ALIASES[suppliedKey] || suppliedKey, MATCH_SCENARIOS);
  const scenario = MATCH_SCENARIOS[scenarioKey];
  if (!scenario) {
    return {
      scenario: null,
      score: null,
      status: 'No score',
      noScoreReason: 'A supported match scenario is required.'
    };
  }
  const group = getPositionGroup(player);
  if (scenario.goalkeeperOnly && group !== 'Goalkeeper') {
    return {
      scenario: scenarioKey,
      scenarioLabel: scenario.label,
      score: null,
      status: 'Incompatible',
      noScoreReason: 'This scenario is goalkeeper-only.'
    };
  }
  const ratings = collectRatings(player, attributesForGroup(group));
  const result = generalisedWeightedMean(ratings, scenario.weights, {
    exponent: -2,
    minimumCoverage: 60
  });
  const evidence = calculateEvidenceConfidence(player, matchHistory, options);
  if (result.score === null) {
    return {
      scenario: scenarioKey,
      scenarioLabel: scenario.label,
      score: null,
      status: 'Insufficient evidence',
      coverage: result.coverage,
      missingAttributes: result.missing
    };
  }
  const score = round(result.score);
  const width = round(4 + (100 - evidence.score) * 0.11);
  return {
    scenario: scenarioKey,
    scenarioLabel: scenario.label,
    score,
    likelyRange: {
      minimum: round(clamp(score - width)),
      maximum: round(clamp(score + width * 0.65))
    },
    coverage: result.coverage,
    evidence: result.used.map(item => ({
      key: item.key,
      attribute: item.key,
      label: ATTRIBUTE_DEFINITIONS[item.key]?.label || item.key,
      score: round(item.score),
      importance: item.weight
    })),
    missingAttributes: result.missing,
    evidenceConfidence: evidence,
    risk: score >= 75 ? 'Lower current role risk' : score >= 60 ? 'Moderate current role risk' : 'High current role risk',
    recommendation: score >= 75 ? 'Suitable for expert review in this scenario.' : score >= 60 ? 'Use with support and verify live.' : 'Do not prioritise for this scenario without further evidence.'
  };
}

function trajectoryLabel(trend, foundation) {
  if (trend.label === 'Declining') return 'Mixed or declining recent evidence';
  if (trend.label === 'Rising') return 'Rising';
  if (foundation >= 75) return 'Positive development indicators';
  if (foundation < 50) return 'Development support required';
  return 'Stable';
}

function calculatePredictions(player = {}, matchHistory = [], options = {}) {
  const ageGroup = getAgeGroup(player);
  const phase = getAgePhase(ageGroup);
  const overall = options.overallAnalysis || calculateOverallRating(player, matchHistory, options);
  if (!ageGroup || !phase || overall.overallRating === null || overall.overallRating === undefined) {
    return {
      scoringVersion: SCORING_VERSION,
      predictionScore: null,
      potentialOverall: null,
      noScoreReason: overall.noScoreReason || 'A valid age group and current overall assessment are required.',
      warnings: overall.warnings || []
    };
  }

  const group = getPositionGroup(player);
  const ratings = collectRatings(player, attributesForGroup(group));
  const evidence = options.evidenceConfidence || overall.evidenceConfidence || calculateEvidenceConfidence(player, matchHistory, options);
  const foundation = developmentFoundation(player, ratings);
  const trend = performanceTrend(matchHistory);
  const rules = PHASE_PROJECTION_RULES[phase.label];
  const currentOverall = Number(overall.overallRating);
  const headroom = Math.max(0, 100 - currentOverall);
  const trendAdjustment = clamp((trend.score - 50) / 100, -0.18, 0.18);
  const conversionRate = clamp(0.28 + (foundation.score / 100) * 0.46 + trendAdjustment, 0.18, 0.78);
  const potentialGrowth = clamp(
    headroom * rules.headroomFactor * conversionRate,
    0,
    rules.maximumGrowth
  );
  const potentialOverall = round(clamp(currentOverall + potentialGrowth));
  const predictionConfidenceScore = round(Math.min(evidence.score, phase.predictionConfidenceCeiling));
  const uncertaintyWidth = round(5 + ((100 - predictionConfidenceScore) * 0.12) + phase.uncertaintyExtra);
  const likelyRange = {
    minimum: round(clamp(potentialOverall - uncertaintyWidth)),
    maximum: round(clamp(potentialOverall + uncertaintyWidth * 0.75))
  };

  const roleFits = calculateRoleFits(player, overall, evidence);
  const planKey = chooseDevelopmentPlan(player, options.developmentPlan || options.plan);
  const attributeDevelopment = calculateAttributeDevelopment(player, {
    ...options,
    developmentPlan: planKey,
    potentialGrowth
  });
  const seasonProgress = attributeDevelopment.projections.map(item => {
    const progress = (1 - Math.exp(-0.55 * item.season)) / (1 - Math.exp(-0.55 * 5));
    return {
      season: item.season,
      projectedOverall: round(clamp(currentOverall + potentialGrowth * progress)),
      likelyRange: {
        minimum: round(clamp(currentOverall + potentialGrowth * progress - uncertaintyWidth * (0.45 + item.season * 0.08))),
        maximum: round(clamp(currentOverall + potentialGrowth * progress + uncertaintyWidth * (0.35 + item.season * 0.06)))
      },
      leadingImprovements: item.leadingImprovements
    };
  });

  const positionRatings = overall.positionRatings?.ratings || {};
  const futurePositions = Object.entries(positionRatings)
    .map(([position, score]) => ({
      position,
      currentRating: score,
      projectedRating: round(clamp(Number(score) + potentialGrowth * 0.72)),
      status: getPositionGroup(position) === group ? 'Supported' : 'Cross-group assessment completed'
    }))
    .sort((a, b) => b.projectedRating - a.projectedRating);
  const bestProjected = futurePositions[0] || null;
  const unsupported = overall.positionRatings?.unsupportedCrossGroupPositions || [];

  const developmentPriorities = (overall.developmentPriorities || []).map(item => ({
    ...item,
    target: item.score < 40 ? 'Move toward age-appropriate execution' : item.score < 60 ? 'Stabilise at age expectation' : 'Turn a usable quality into a role strength'
  }));
  const warnings = [...(overall.warnings || [])];
  if (predictionConfidenceScore < 50) warnings.push('Prediction confidence is insufficient; use the range and development priorities, not the point estimate.');
  if (phase.max <= 11) warnings.push('For younger players, this is a development outlook rather than a recruitment forecast.');
  if (unsupported.length) warnings.push(`No cross-group forecast was created without the additional assessment: ${unsupported.join(', ')}.`);

  return {
    scoringVersion: SCORING_VERSION,
    calculatedAt: (options.now || new Date()).toISOString(),
    inputFingerprint: inputFingerprint({ ageGroup, primaryPosition: getPrimaryPosition(player), ratings, matches: matchHistory.length }),
    predictionScore: potentialOverall,
    potentialRating: potentialOverall,
    currentOverall,
    potentialOverall,
    likelyRange,
    label: phase.predictionLabel,
    horizon: rules.horizon,
    trajectory: trajectoryLabel(trend, foundation.score),
    trend,
    developmentFoundation: foundation,
    predictionConfidence: {
      score: predictionConfidenceScore,
      label: predictionConfidenceScore >= 85 ? 'Verified' : predictionConfidenceScore >= 70 ? 'Strong' : predictionConfidenceScore >= 50 ? 'Provisional' : 'Insufficient',
      ageGroupCeiling: phase.predictionConfidenceCeiling,
      evidenceConfidenceScore: evidence.score
    },
    bestCurrentPosition: overall.bestCurrentPosition,
    bestProjectedFuturePosition: bestProjected?.position || overall.bestCurrentPosition,
    futurePositions,
    roleFits,
    conversionCandidates: overall.positionRatings?.conversionCandidates || [],
    unsupportedCrossGroupPositions: unsupported,
    developmentPlan: {
      key: planKey,
      label: DEVELOPMENT_PLANS[planKey]?.label || DEVELOPMENT_PLANS.balanced.label
    },
    attributeDevelopment,
    projectedOverallBySeason: seasonProgress,
    developmentPriorities,
    expectedTradeOffs: [
      'A focused plan accelerates its priority attributes; unprioritised attributes are modelled with slower growth, not decline.',
      'Role demand, coaching environment, playing time, health and competition level can change the outcome.'
    ],
    evidenceConfidence: evidence,
    warnings,
    disclaimer: 'This projection is a decision-support range, not a promise. It uses the recorded age group rather than date of birth and does not estimate maturation, relative-age effects or physical growth.'
  };
}

function predictionScore(player = {}, matchHistory = [], options = {}) {
  return calculatePredictions(player, matchHistory, options).potentialOverall;
}

module.exports = {
  calculatePredictions,
  predictionScore,
  calculateAttributeDevelopment,
  calculateScenarioPrediction,
  calculatePositionFitPrediction,
  calculateRoleFits,
  performanceTrend,
  developmentFoundation,
  PHASE_PROJECTION_RULES
};
