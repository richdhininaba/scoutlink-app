'use strict';

/**
 * Target path: backend/engines/predictions.js
 * ScoutLink scoring engine v4.1 - profile-first development and role projections.
 *
 * A completed ScoutLink player profile is the baseline for every supported
 * prediction. Match evidence improves calibration, trend detection and range
 * width; it never acts as a gate for an otherwise valid assessed profile.
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
  'Foundation Function Match': { headroomFactor: 0.48, maximumGrowth: 16, horizon: 'five-season development scenario' },
  'Emerging Role Match': { headroomFactor: 0.42, maximumGrowth: 14, horizon: 'five-season development scenario' },
  'Tactical Role Compatibility': { headroomFactor: 0.36, maximumGrowth: 12, horizon: 'three-to-five-season projection' },
  'Recruitment Compatibility': { headroomFactor: 0.30, maximumGrowth: 10, horizon: 'one-to-three-season projection' }
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

function profileAverage(player = {}, group = getPositionGroup(player)) {
  const ratings = collectRatings(player, attributesForGroup(group));
  return average(Object.values(ratings).filter(isObservedScore));
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
    minimumCoverage: 0
  });
  const fallback = profileAverage(player, group);

  return {
    score: round(result.score === null ? (fallback ?? 50) : result.score),
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
      label: facts.length ? 'Early sample' : 'Profile-led',
      matchesUsed: facts.length,
      calibrated: false,
      reason: facts.length
        ? 'The assessed player profile drives the projection; the recorded match sample adds context but is too small to create a stable trend adjustment.'
        : 'The assessed player profile drives the projection. Match ratings are optional calibration evidence and are not required to produce an outlook.'
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
    calibrated: true,
    reason: 'Trend is a least-squares direction across recorded contextual performance ratings and calibrates the profile-led projection.'
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
    assumption: 'This is a bounded coaching scenario based on the assessed player profile. Match evidence calibrates confidence; it is not required for the projection.'
  };
}

function roleFitForPosition(player = {}, position, roleKey, evidence = {}) {
  const profile = ROLE_PROFILES[roleKey];
  if (!profile || !profile.positions.includes(position)) return null;

  const targetGroup = getPositionGroup(position);
  const ratings = collectRatings(player, attributesForGroup(targetGroup));
  const result = generalisedWeightedMean(ratings, profile.weights, {
    exponent: -2,
    minimumCoverage: 0
  });
  const currentGroupBaseline = profileAverage(player, getPositionGroup(player));
  const observedSignal = result.score === null ? currentGroupBaseline : result.score;
  if (observedSignal === null || observedSignal === undefined) return null;

  const criticalFieldCoverage = criticalCoverage(ratings, profile.critical);
  const criticalScores = profile.critical
    .filter(key => isObservedScore(ratings[key]))
    .map(key => Number(ratings[key]));
  const weakestCritical = criticalScores.length ? Math.min(...criticalScores) : null;

  let ceiling = 100;
  if (weakestCritical !== null && weakestCritical < 40) ceiling = 55;
  else if (criticalScores.filter(score => score < 60).length >= 2) ceiling = 68;
  else if (weakestCritical !== null && weakestCritical < 60) ceiling = 72;

  const coverageFactor = clamp(Number(result.coverage || 0) / 100, 0, 1);
  const baseline = Number(currentGroupBaseline ?? observedSignal);
  const blended = baseline * (1 - coverageFactor * 0.72) + Number(observedSignal) * (coverageFactor * 0.72);
  const score = round(Math.min(blended, ceiling));
  const evidenceScore = Number(evidence?.score || 65);
  const width = round(5 + ((100 - evidenceScore) * 0.08) + ((100 - Number(result.coverage || 0)) * 0.035));

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
    status: result.coverage >= 65
      ? 'Supported profile projection'
      : 'Profile-derived role projection'
  };
}

function calculateRoleFits(player = {}, overallAnalysis, evidence) {
  const positionRatings = overallAnalysis?.positionRatings?.ratings || {};
  const declared = normalisePositions(player.positions || player.alternative_positions || player.alternativePositions);
  const primary = getPrimaryPosition(player);
  const positions = [...new Set([
    ...Object.keys(positionRatings),
    primary,
    ...declared
  ].filter(Boolean))];
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
      status: 'Input required',
      noScoreReason: 'Choose a supported target position to run this projection.'
    };
  }

  const primaryGroup = getPositionGroup(player);
  const targetGroup = getPositionGroup(position);
  const targetAttributes = attributesForGroup(targetGroup);
  const ratings = collectRatings(player, targetAttributes);
  const targetProfile = POSITION_PROFILES[position] || {};
  const coverage = coverageForWeights(ratings, targetProfile.weights || {});
  const sameGroup = primaryGroup === targetGroup;
  const strictResult = calculatePositionRating(player, position, matchHistory, options);
  const evidence = strictResult?.evidence || calculateEvidenceConfidence(player, matchHistory, {
    ...options,
    expectedAttributes: targetAttributes,
    criticalAttributes: targetProfile.critical || []
  });

  if (strictResult) {
    return {
      targetPosition: position,
      score: strictResult.score,
      status: sameGroup ? 'Supported position-group projection' : 'Supported cross-group projection',
      evidenceCoverage: strictResult.coverage,
      criticalFieldCoverage: strictResult.criticalFieldCoverage,
      scoreCeiling: strictResult.scoreCeiling,
      likelyRange: {
        minimum: round(clamp(strictResult.score - (sameGroup ? 5 : 7))),
        maximum: round(clamp(strictResult.score + (sameGroup ? 4 : 6)))
      },
      roles: (POSITION_ROLES[position] || [])
        .map(roleKey => roleFitForPosition(player, position, roleKey, evidence))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
    };
  }

  // Cross-group and partially covered position projections are still produced
  // from the complete assessed profile. Available target-role attributes add
  // specificity; the current position profile supplies the baseline.
  const targetSignal = generalisedWeightedMean(ratings, targetProfile.weights || {}, {
    exponent: -2,
    minimumCoverage: 0
  });
  const baseline = Number(
    options.overallAnalysis?.overallRating ??
    options.overallRating ??
    profileAverage(player, primaryGroup) ??
    50
  );
  const coverageFactor = clamp(Number(targetSignal.coverage || 0) / 100, 0, 1);
  const signal = Number(targetSignal.score ?? baseline);
  const crossGroupAdjustment = sameGroup ? 0 : -2;
  const score = round(clamp(
    baseline * (1 - coverageFactor * 0.68) +
    signal * (coverageFactor * 0.68) +
    crossGroupAdjustment
  ));
  const width = round(7 + (1 - coverageFactor) * 5 + ((100 - Number(evidence.score || 65)) * 0.04));

  return {
    targetPosition: position,
    score,
    status: sameGroup ? 'Profile-derived position projection' : 'Profile-derived cross-group projection',
    evidenceCoverage: round(coverage),
    criticalFieldCoverage: criticalCoverage(ratings, targetProfile.critical || []),
    scoreCeiling: 100,
    likelyRange: {
      minimum: round(clamp(score - width)),
      maximum: round(clamp(score + width * 0.65))
    },
    roles: (POSITION_ROLES[position] || [])
      .map(roleKey => roleFitForPosition(player, position, roleKey, evidence))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score),
    note: 'This target-position score is profile-derived. Match evidence can tighten the range but is not required for the projection.'
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
      status: 'Input required',
      noScoreReason: 'Choose a supported match scenario to run this prediction.'
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
    minimumCoverage: 0
  });
  const evidence = calculateEvidenceConfidence(player, matchHistory, options);
  const fallback = profileAverage(player, group);
  const score = round(result.score === null ? (fallback ?? 50) : result.score);
  const coveragePenalty = (100 - Number(result.coverage || 0)) * 0.035;
  const width = round(5 + (100 - Number(evidence.score || 65)) * 0.08 + coveragePenalty);

  return {
    scenario: scenarioKey,
    scenarioLabel: scenario.label,
    score,
    likelyRange: {
      minimum: round(clamp(score - width)),
      maximum: round(clamp(score + width * 0.65))
    },
    coverage: result.coverage,
    status: result.coverage >= 60 ? 'Supported profile scenario' : 'Profile-derived scenario',
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
    recommendation: score >= 75
      ? 'The assessed profile supports this scenario; verify the key behaviours live for repeatability.'
      : score >= 60
        ? 'The profile is workable for this scenario with identifiable support needs; verify the weakest demand live.'
        : 'The profile highlights material pressure points in this scenario; prioritise live verification before recruitment decisions.'
  };
}

function trajectoryLabel(trend, foundation, growth) {
  if (trend.label === 'Declining') return 'Mixed recent trend';
  if (trend.label === 'Rising') return 'Rising';
  if (trend.label === 'Profile-led' || trend.label === 'Early sample') {
    if (growth >= 7 || foundation >= 75) return 'Profile-led positive';
    if (foundation < 50) return 'Profile-led development focus';
    return 'Profile-led stable';
  }
  if (foundation >= 75) return 'Positive development indicators';
  if (foundation < 50) return 'Development support required';
  return 'Stable';
}

function predictionConfidenceLabel(score, evidence) {
  const completeness = Number(evidence?.attributeCompleteness || 0);
  const matches = Number(evidence?.effectiveMatchEquivalents || 0);
  const target = Number(evidence?.sampleTarget || 1);

  if (score >= 85 && matches >= target) return 'Verified';
  if (score >= 72) return 'Strong';
  if (completeness >= 85) return 'Profile-led';
  if (score >= 55) return 'Profile-led';
  return 'Developing profile';
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
      noScoreReason: overall.noScoreReason || 'A valid age group and completed primary-position player assessment are required.',
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
  const attributeStrength = Number(overall.attributeScore ?? currentOverall);
  const profileCompleteness = Number(evidence.attributeCompleteness || 0);
  const headroom = Math.max(0, 100 - currentOverall);

  // The player profile supplies the base development signal. Match trend can
  // move the conversion rate only after it has enough observations to be a
  // stable trend, and its impact scales with the match sample.
  const profileStrength = clamp(
    foundation.score * 0.50 +
    attributeStrength * 0.35 +
    profileCompleteness * 0.15
  );
  const sampleCalibration = clamp(
    Number(evidence.effectiveMatchEquivalents || 0) / Math.max(1, Number(evidence.sampleTarget || 1)),
    0,
    1
  );
  const rawTrendAdjustment = trend.slopePerMatch === null
    ? 0
    : clamp((trend.score - 50) / 100, -0.12, 0.12);
  const trendAdjustment = rawTrendAdjustment * (0.35 + sampleCalibration * 0.65);
  const conversionRate = clamp(
    0.30 + (profileStrength / 100) * 0.48 + trendAdjustment,
    0.24,
    0.84
  );
  const potentialGrowth = clamp(
    headroom * rules.headroomFactor * conversionRate,
    0,
    rules.maximumGrowth
  );
  const potentialOverall = round(clamp(currentOverall + potentialGrowth));

  const profileConfidenceFloor = profileCompleteness >= 95 ? 68
    : profileCompleteness >= 85 ? 62
      : profileCompleteness >= 70 ? 55
        : 45;
  const evidenceBackedConfidence = Math.max(Number(evidence.score || 0), profileConfidenceFloor);
  const predictionConfidenceScore = round(Math.min(evidenceBackedConfidence, phase.predictionConfidenceCeiling));
  const uncertaintyWidth = round(
    5 +
    ((100 - predictionConfidenceScore) * 0.10) +
    phase.uncertaintyExtra +
    ((1 - sampleCalibration) * 1.5)
  );
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
      status: getPositionGroup(position) === group ? 'Supported' : 'Profile-calibrated cross-group projection'
    }))
    .sort((a, b) => b.projectedRating - a.projectedRating);
  const bestProjected = futurePositions[0] || null;
  const unsupported = overall.positionRatings?.unsupportedCrossGroupPositions || [];

  const developmentPriorities = (overall.developmentPriorities || []).map(item => ({
    ...item,
    target: item.score < 40
      ? 'Move toward age-appropriate execution'
      : item.score < 60
        ? 'Stabilise at age expectation'
        : 'Turn a usable quality into a role strength'
  }));

  const warnings = [...(overall.warnings || [])]
    .filter(warning => !/insufficient evidence|confidence is insufficient/i.test(String(warning)));

  if (sampleCalibration < 1) {
    warnings.push('This is a profile-led projection. Additional match evidence will tighten the likely range and improve trend calibration rather than determine whether a prediction exists.');
  }
  if (phase.max <= 11) {
    warnings.push('For younger players, this is a development outlook rather than a recruitment guarantee.');
  }
  if (unsupported.length) {
    warnings.push(`Cross-group positions without a full target-position assessment remain profile-derived and carry wider ranges: ${unsupported.join(', ')}.`);
  }

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
    trajectory: trajectoryLabel(trend, foundation.score, potentialGrowth),
    profileLed: true,
    profileStrength: round(profileStrength),
    profileCompleteness: round(profileCompleteness),
    matchCalibration: round(sampleCalibration * 100),
    trend,
    developmentFoundation: foundation,
    predictionConfidence: {
      score: predictionConfidenceScore,
      label: predictionConfidenceLabel(predictionConfidenceScore, evidence),
      ageGroupCeiling: phase.predictionConfidenceCeiling,
      evidenceConfidenceScore: evidence.score,
      profileFloor: profileConfidenceFloor,
      matchCalibration: round(sampleCalibration * 100)
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
      'A focused plan accelerates its priority attributes; unprioritised attributes are modelled with slower growth, not automatic decline.',
      'Role demand, coaching environment, playing time, health and competition level can change the realised outcome.',
      'Match evidence strengthens calibration and confidence but does not replace the completed player assessment as the prediction baseline.'
    ],
    evidenceConfidence: evidence,
    warnings,
    disclaimer: 'This projection is decision support, not a promise. It uses the recorded age group and assessed football profile, and does not estimate maturation, relative-age effects or physical growth.'
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
