'use strict';

/**
 * Target path: backend/engines/playerValue.js
 * ScoutLink scoring engine v4 football value and optional market estimates.
 *
 * Default output is a 0-100 football value index. Currency and salary outputs
 * remain null unless the caller supplies verified, jurisdiction-appropriate
 * market anchors. ScoutLink must not invent a transfer fee or wage for a child.
 */

const { SCORING_VERSION } = require('./scoringConfig');
const {
  clamp,
  round,
  average,
  getAgeGroup,
  getAgePhase,
  getPrimaryPosition,
  getPositionGroup,
  quantile,
  formatCurrency,
  inputFingerprint
} = require('./scoringUtils');
const { calculateOverallRating } = require('./overallRating');
const { calculatePredictions } = require('./predictions');

function normaliseMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function verifiedMarketAnchors(context = {}) {
  const market = context.marketContext || context.market_context || context.market || {};
  if (market.verified !== true) return null;
  const comparableValues = (Array.isArray(market.comparables) ? market.comparables : [])
    .map(item => normaliseMoney(typeof item === 'object' ? item.value : item))
    .filter(value => value !== null && value > 0);
  let minimum = normaliseMoney(market.minimum ?? market.low ?? market.anchors?.minimum);
  let median = normaliseMoney(market.median ?? market.mid ?? market.anchors?.median);
  let maximum = normaliseMoney(market.maximum ?? market.high ?? market.anchors?.maximum);
  if (comparableValues.length >= 3) {
    minimum = minimum ?? quantile(comparableValues, 0.20);
    median = median ?? quantile(comparableValues, 0.50);
    maximum = maximum ?? quantile(comparableValues, 0.80);
  }
  if (![minimum, median, maximum].every(Number.isFinite)) return null;
  if (!(minimum <= median && median <= maximum) || maximum <= 0) return null;
  return {
    minimum,
    median,
    maximum,
    currency: String(market.currency || 'GBP').toUpperCase(),
    source: market.source || 'Verified caller-supplied market anchors',
    verifiedAt: market.verifiedAt || market.verified_at || null,
    jurisdiction: market.jurisdiction || null,
    sampleSize: comparableValues.length || Number(market.sampleSize || market.sample_size || 0) || null
  };
}

function interpolate(points, x) {
  const ordered = [...points].sort((a, b) => a.x - b.x);
  const value = Number(x);
  if (value <= ordered[0].x) return ordered[0].y;
  if (value >= ordered[ordered.length - 1].x) return ordered[ordered.length - 1].y;
  for (let index = 1; index < ordered.length; index += 1) {
    const lower = ordered[index - 1];
    const upper = ordered[index];
    if (value <= upper.x) {
      const progress = (value - lower.x) / (upper.x - lower.x);
      return lower.y + (upper.y - lower.y) * progress;
    }
  }
  return ordered[ordered.length - 1].y;
}

function currencyFromIndex(valueIndex, anchors) {
  if (!anchors) return null;
  const points = [
    { x: 0, y: anchors.minimum * 0.35 },
    { x: 35, y: anchors.minimum },
    { x: 65, y: anchors.median },
    { x: 90, y: anchors.maximum },
    { x: 100, y: anchors.maximum * 1.25 }
  ];
  return Math.max(0, Math.round(interpolate(points, clamp(valueIndex)) / 100) * 100);
}

function roleBreadthScore(prediction = {}, overall = {}) {
  const roleFits = Array.isArray(prediction.roleFits) ? prediction.roleFits : [];
  const strong = roleFits.filter(item => Number(item.score) >= 74);
  if (roleFits.length) {
    const top = roleFits.slice(0, 3).map(item => Number(item.score)).filter(Number.isFinite);
    return round(clamp((average(top) || 50) * 0.82 + Math.min(strong.length, 5) * 3.6));
  }
  const positions = Object.values(overall.positionRatings?.ratings || {}).map(Number).filter(Number.isFinite);
  return positions.length ? round(clamp((average(positions.slice(0, 3)) || 50) + Math.min(positions.length - 1, 3) * 2)) : 50;
}

function calculateFootballValueIndex(overall = {}, prediction = {}) {
  if (overall.overallRating === null || overall.overallRating === undefined ||
      prediction.potentialOverall === null || prediction.potentialOverall === undefined) return null;
  const current = Number(overall.overallRating);
  const potential = Number(prediction.potentialOverall);
  if (!Number.isFinite(current) || !Number.isFinite(potential)) return null;
  const roleBreadth = roleBreadthScore(prediction, overall);
  const trajectory = Number(prediction.trend?.score);
  const trajectoryScore = Number.isFinite(trajectory) ? trajectory : 50;
  const valueIndex = clamp(
    current * 0.50 +
    potential * 0.30 +
    roleBreadth * 0.10 +
    trajectoryScore * 0.10
  );
  return {
    score: round(valueIndex),
    components: {
      currentAbility: { score: round(current) },
      developmentProjection: { score: round(potential) },
      supportedRoleBreadth: { score: roleBreadth },
      evidenceTrend: { score: round(trajectoryScore) }
    }
  };
}

function valueBand(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return null;
  if (score >= 85) return 'Exceptional football value profile';
  if (score >= 75) return 'Strong football value profile';
  if (score >= 65) return 'Credible football value profile';
  if (score >= 55) return 'Developmental football value profile';
  return 'Early or limited football value profile';
}

function affordabilityAssessment(value, context = {}, currency) {
  const team = context.team || context.scoutTeam || {};
  const budget = normaliseMoney(context.budget ?? team.recruitment_budget ?? team.recruitmentBudget ?? team.budget);
  if (!Number.isFinite(value) || budget === null) {
    return {
      status: 'Not assessed',
      budget,
      currency: currency || null,
      reason: 'A verified currency estimate and team budget are both required.'
    };
  }
  const ratio = budget > 0 ? value / budget : Infinity;
  return {
    status: ratio <= 0.50 ? 'Comfortably affordable' : ratio <= 0.85 ? 'Affordable' : ratio <= 1 ? 'At budget limit' : 'Above stated budget',
    budget,
    currency,
    valueToBudgetRatio: Number.isFinite(ratio) ? round(ratio, 3) : null
  };
}

function verifiedSalaryAnchors(context = {}) {
  const salary = context.salaryContext || context.salary_context || context.marketContext?.salary || {};
  if (salary.verified !== true || salary.contractEligible !== true) return null;
  const minimum = normaliseMoney(salary.weeklyMinimum ?? salary.minimum ?? salary.low);
  const median = normaliseMoney(salary.weeklyMedian ?? salary.median ?? salary.mid);
  const maximum = normaliseMoney(salary.weeklyMaximum ?? salary.maximum ?? salary.high);
  if (![minimum, median, maximum].every(Number.isFinite)) return null;
  if (!(minimum <= median && median <= maximum)) return null;
  return {
    minimum,
    median,
    maximum,
    currency: String(salary.currency || context.marketContext?.currency || 'GBP').toUpperCase(),
    source: salary.source || 'Verified caller-supplied salary anchors',
    jurisdiction: salary.jurisdiction || null
  };
}

function calculateSalaryEstimate(valueIndex, context = {}) {
  const anchors = verifiedSalaryAnchors(context);
  if (!anchors || valueIndex === null || valueIndex === undefined || !Number.isFinite(Number(valueIndex))) {
    return {
      weeklyGross: null,
      weeklyFormatted: null,
      likelyRange: null,
      status: 'Not estimated',
      reason: 'Salary requires verified anchors, legal contract eligibility and jurisdiction context.'
    };
  }
  const point = Math.round(interpolate([
    { x: 0, y: anchors.minimum },
    { x: 65, y: anchors.median },
    { x: 100, y: anchors.maximum }
  ], clamp(valueIndex)));
  return {
    weeklyGross: point,
    weeklyFormatted: `${formatCurrency(point, anchors.currency)}/week`,
    likelyRange: {
      minimum: anchors.minimum,
      maximum: anchors.maximum,
      minimumFormatted: `${formatCurrency(anchors.minimum, anchors.currency)}/week`,
      maximumFormatted: `${formatCurrency(anchors.maximum, anchors.currency)}/week`
    },
    currency: anchors.currency,
    status: 'Anchored estimate',
    source: anchors.source,
    jurisdiction: anchors.jurisdiction
  };
}

function calculateFutureValueProjection(prediction = {}, baseIndex, anchors) {
  const currentOverall = Number(prediction.currentOverall);
  return (prediction.projectedOverallBySeason || []).map(item => {
    const overallChange = Number(item.projectedOverall) - currentOverall;
    const projectedIndex = round(clamp(baseIndex + overallChange * 0.68));
    const currencyValue = currencyFromIndex(projectedIndex, anchors);
    return {
      season: item.season,
      projectedOverall: item.projectedOverall,
      footballValueIndex: projectedIndex,
      currencyValue,
      currencyValueFormatted: currencyValue === null ? null : formatCurrency(currencyValue, anchors.currency),
      status: anchors ? 'Anchored scenario' : 'Index-only scenario'
    };
  });
}

function calculateRoi(value, futureProjection = [], context = {}) {
  const developmentCost = normaliseMoney(context.developmentCost ?? context.development_cost);
  const acquisitionCost = normaliseMoney(context.acquisitionCost ?? context.acquisition_cost ?? value);
  const finalValue = futureProjection[futureProjection.length - 1]?.currencyValue;
  if (![developmentCost, acquisitionCost, finalValue].every(Number.isFinite)) {
    return {
      roi: null,
      netValue: null,
      status: 'Not assessed',
      reason: 'ROI requires an anchored future value plus explicit acquisition and development costs.'
    };
  }
  const invested = acquisitionCost + developmentCost;
  const netValue = finalValue - invested;
  return {
    roi: invested > 0 ? round((netValue / invested) * 100) : null,
    netValue: Math.round(netValue),
    invested: Math.round(invested),
    status: 'Scenario estimate'
  };
}

function calculateValueAnalysis(player = {}, matchHistory = [], context = {}) {
  const options = context.options || context;
  const overall = context.overallAnalysis || calculateOverallRating(player, matchHistory, options);
  const prediction = context.predictionAnalysis || calculatePredictions(player, matchHistory, {
    ...options,
    overallAnalysis: overall
  });
  const ageGroup = getAgeGroup(player);
  const phase = getAgePhase(ageGroup);
  const indexResult = calculateFootballValueIndex(overall, prediction);
  if (!indexResult) {
    return {
      scoringVersion: SCORING_VERSION,
      footballValueIndex: null,
      value: null,
      valueFormatted: null,
      transferValue: null,
      noScoreReason: overall.noScoreReason || prediction.noScoreReason || 'Current ability and development projection are required.',
      warnings: [...(overall.warnings || []), ...(prediction.warnings || [])]
    };
  }

  const evidence = prediction.evidenceConfidence || overall.evidenceConfidence || { score: 0, label: 'Insufficient' };
  const predictionRangeWidth = prediction.likelyRange
    ? (Number(prediction.likelyRange.maximum) - Number(prediction.likelyRange.minimum)) / 2
    : 10;
  const indexWidth = round(4 + (100 - evidence.score) * 0.13 + predictionRangeWidth * 0.22);
  const indexRange = {
    minimum: round(clamp(indexResult.score - indexWidth)),
    maximum: round(clamp(indexResult.score + indexWidth * 0.72))
  };
  const anchors = verifiedMarketAnchors(context);
  const value = currencyFromIndex(indexResult.score, anchors);
  const valueRange = anchors ? {
    minimum: currencyFromIndex(indexRange.minimum, anchors),
    maximum: currencyFromIndex(indexRange.maximum, anchors)
  } : null;
  const salary = calculateSalaryEstimate(indexResult.score, context);
  const futureProjection = calculateFutureValueProjection(prediction, indexResult.score, anchors);
  const roi = calculateRoi(value, futureProjection, context);
  const affordability = affordabilityAssessment(value, context, anchors?.currency);

  const riskLabel = evidence.score < 50
    ? 'High evidence uncertainty'
    : prediction.predictionConfidence?.score < 70
      ? 'High development uncertainty'
      : evidence.score < 70
        ? 'Moderate evidence uncertainty'
        : 'Lower evidence uncertainty';
  const warnings = [];
  if (!anchors) warnings.push('No currency amount is shown because verified market or compensation anchors were not supplied.');
  if (!verifiedSalaryAnchors(context)) warnings.push('No salary is shown because verified salary anchors and legal contract eligibility were not supplied.');
  if (phase?.max <= 11) warnings.push('For U7-U11 players, use the index as a development prioritisation aid, not a tradable market valuation.');
  warnings.push('Any recruitment payment, training compensation, solidarity payment, registration or employment must be checked against the governing rules and jurisdiction.');

  const valueDrivers = [
    { key: 'current_ability', label: 'Current position-specific ability', score: indexResult.components.currentAbility.score, contributionWeight: 50 },
    { key: 'development_projection', label: 'Bounded development projection', score: indexResult.components.developmentProjection.score, contributionWeight: 30 },
    { key: 'supported_role_breadth', label: 'Supported role breadth', score: indexResult.components.supportedRoleBreadth.score, contributionWeight: 10 },
    { key: 'evidence_trend', label: 'Contextual evidence trend', score: indexResult.components.evidenceTrend.score, contributionWeight: 10 }
  ]
    .sort((a, b) => (b.score * b.contributionWeight) - (a.score * a.contributionWeight))
    .map(({ contributionWeight, ...driver }) => driver);

  return {
    scoringVersion: SCORING_VERSION,
    calculatedAt: (options.now || new Date()).toISOString(),
    inputFingerprint: inputFingerprint({
      ageGroup,
      primaryPosition: getPrimaryPosition(player),
      overall: overall.overallRating,
      potential: prediction.potentialOverall,
      marketAnchors: anchors
    }),
    footballValueIndex: indexResult.score,
    footballValueIndexRange: indexRange,
    footballValueLabel: valueBand(indexResult.score),
    value,
    valueFormatted: value === null ? null : formatCurrency(value, anchors.currency),
    transferValue: value,
    transferValueFormatted: value === null ? null : formatCurrency(value, anchors.currency),
    displayValue: value === null ? 'Not estimated' : formatCurrency(value, anchors.currency),
    likelyRange: valueRange ? {
      ...valueRange,
      minimumFormatted: formatCurrency(valueRange.minimum, anchors.currency),
      maximumFormatted: formatCurrency(valueRange.maximum, anchors.currency)
    } : null,
    currency: anchors?.currency || null,
    currencyEstimateStatus: anchors ? 'Anchored estimate' : 'Not estimated',
    marketAnchors: anchors,
    valueConfidence: {
      score: round(Math.min(evidence.score, prediction.predictionConfidence?.score ?? evidence.score)),
      label: evidence.label,
      riskLabel
    },
    riskLabel,
    valueDrivers,
    components: indexResult.components,
    primaryPosition: overall.bestCurrentPosition || getPrimaryPosition(player),
    positionGroup: getPositionGroup(player),
    ageGroup,
    agePhase: phase?.label || null,
    futureProjection,
    roiProjection: roi,
    affordability,
    predictedSalary: salary,
    warnings,
    explanation: 'The default 0-100 football value index combines current ability (50%), bounded development projection (30%), supported role breadth (10%) and contextual evidence trend (10%). Evidence confidence widens the range; it does not add value points. Currency is calculated only from verified caller-supplied anchors.'
  };
}

function grassrootsTransferValue(player = {}, matchHistory = [], context = {}) {
  const analysis = calculateValueAnalysis(player, matchHistory, context);
  return {
    value: analysis.value,
    valueFormatted: analysis.valueFormatted,
    footballValueIndex: analysis.footballValueIndex,
    breakdown: analysis.components,
    status: analysis.currencyEstimateStatus,
    warnings: analysis.warnings
  };
}

function transferValue(player = {}, team = {}, compatibility = null, matchHistory = [], context = {}) {
  const marketContext = context.marketContext || team.market_context || team.marketContext;
  const analysis = calculateValueAnalysis(player, matchHistory, {
    ...context,
    team,
    compatibility,
    marketContext
  });
  return {
    value: analysis.value,
    valueFormatted: analysis.valueFormatted,
    footballValueIndex: analysis.footballValueIndex,
    breakdown: analysis.components,
    status: analysis.currencyEstimateStatus,
    warning: analysis.warnings?.[0] || null
  };
}

function predictedSalary(player = {}, team = {}, matchHistory = [], context = {}) {
  const analysis = calculateValueAnalysis(player, matchHistory, {
    ...context,
    team,
    marketContext: context.marketContext || team.market_context || team.marketContext,
    salaryContext: context.salaryContext || team.salary_context || team.salaryContext
  });
  return {
    ...analysis.predictedSalary,
    transferValue: analysis.value,
    footballValueIndex: analysis.footballValueIndex
  };
}

module.exports = {
  calculateValueAnalysis,
  calculateFootballValueIndex,
  grassrootsTransferValue,
  transferValue,
  predictedSalary,
  verifiedMarketAnchors,
  verifiedSalaryAnchors,
  currencyFromIndex
};
