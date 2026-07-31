'use strict';

/**
 * Target path: backend/engines/index.js
 * Single orchestration entry point and backwards-compatible engine exports.
 */

const config = require('./scoringConfig');
const utils = require('./scoringUtils');
const evidenceEngine = require('./evidenceConfidence');
const overallEngine = require('./overallRating');
const predictionEngine = require('./predictions');
const valueEngine = require('./playerValue');
const compatibilityEngine = require('./compatibility');

function analysePlayer(player = {}, team = null, matchHistory = [], scoutPrefs = {}, context = {}) {
  const options = context.options || context;
  const overallBreakdown = overallEngine.calculateOverallRating(player, matchHistory, options);
  const evidenceConfidence = overallBreakdown.evidenceConfidence || evidenceEngine.calculateEvidenceConfidence(player, matchHistory, options);
  const predictionDetails = predictionEngine.calculatePredictions(player, matchHistory, {
    ...options,
    overallAnalysis: overallBreakdown,
    evidenceConfidence,
    developmentPlan: scoutPrefs.developmentPlan || scoutPrefs.development_plan
  });
  const valueAnalysis = valueEngine.calculateValueAnalysis(player, matchHistory, {
    ...context,
    ...options,
    team,
    scoutTeam: team,
    overallAnalysis: overallBreakdown,
    predictionAnalysis: predictionDetails
  });

  const hasTeamRequirement = Boolean(team || Object.keys(scoutPrefs || {}).length);
  const compatibility = hasTeamRequirement
    ? compatibilityEngine.calculateCompatibility(player, team || {}, scoutPrefs, matchHistory, {
        ...context,
        ...options,
        overallAnalysis: overallBreakdown,
        predictionAnalysis: predictionDetails,
        evidenceConfidence
      })
    : null;
  const salary = valueAnalysis.predictedSalary || {
    weeklyGross: null,
    weeklyFormatted: null,
    status: 'Not estimated'
  };

  return {
    scoringVersion: config.SCORING_VERSION,
    calculatedAt: (options.now || new Date()).toISOString(),

    overallRating: overallBreakdown.overallRating,
    overallBreakdown,
    positionRatings: overallBreakdown.positionRatings,

    compatibilityScore: compatibility?.conservativeScore ?? null,
    compatibilityBreakdown: compatibility,
    compatibility,

    predictionScore: predictionDetails.potentialOverall,
    predictionDetails,

    footballValueIndex: valueAnalysis.footballValueIndex,
    footballValueIndexRange: valueAnalysis.footballValueIndexRange,
    transferValue: valueAnalysis.value,
    transferValueFormatted: valueAnalysis.valueFormatted,
    transferValueBreakdown: valueAnalysis.components,
    valueAnalysis,

    predictedSalaryWeekly: salary.weeklyGross,
    predictedSalaryFormatted: salary.weeklyFormatted,
    predictedSalary: salary,

    evidenceConfidence,
    warnings: utils.unique([
      ...(overallBreakdown.warnings || []),
      ...(predictionDetails.warnings || []),
      ...(valueAnalysis.warnings || []),
      ...(compatibility?.warnings || [])
    ])
  };
}

function calculatePlayerAnalysis(player = {}, team = null, matchHistory = [], scoutPrefs = {}, context = {}) {
  return analysePlayer(player, team, matchHistory, scoutPrefs, context);
}

/**
 * Compatibility helpers retained for existing routes while they migrate.
 * They do not participate in any v4 formula.
 */
function getPosGroup(positionOrPlayer) {
  const group = Array.isArray(positionOrPlayer) || typeof positionOrPlayer === 'string'
    ? utils.getPositionGroup(utils.normalisePositions(positionOrPlayer)[0])
    : utils.getPositionGroup(positionOrPlayer);
  return group === 'Attacker' ? 'Forward' : group;
}

function ageFromPlayer(player = {}) {
  return utils.ageNumber(utils.getAgeGroup(player));
}

function rangeMidpoint(value, fallback) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)[^\d]+(\d+(?:\.\d+)?)/);
  if (!match) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  return (Number(match[1]) + Number(match[2])) / 2;
}

function getHeightMid(player = {}) {
  return rangeMidpoint(player.height_range_cm || player.heightRangeCm || player.height_cm, 174);
}

function getBuildMid(player = {}) {
  return rangeMidpoint(player.weight_range_kg || player.weightRangeKg || player.weight_kg, 74);
}

function attr100(player = {}, key, fallback = null) {
  const score = utils.getAttributeRating(player, key);
  return score === null ? fallback : score;
}

function attr10(player = {}, key, fallback = null) {
  const score = attr100(player, key, fallback === null ? null : fallback * 10);
  return score === null ? null : utils.round(score / 10);
}

function parseWeaknesses(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || '').split(/[,|]/g).map(item => item.trim()).filter(Boolean);
}

function sanitizeMatchFacts(matchHistory = []) {
  return (Array.isArray(matchHistory) ? matchHistory : []).map(utils.normaliseMatchFact);
}

const ATTR_LABELS = Object.freeze(Object.entries(config.ATTRIBUTE_DEFINITIONS).reduce((mapped, [key, definition]) => {
  mapped[key] = definition.label;
  return mapped;
}, {}));

const ROLE_WEIGHTS = Object.freeze(Object.entries(config.POSITION_PROFILES).reduce((mapped, [position, profile]) => {
  mapped[position] = profile.weights;
  return mapped;
}, {}));

module.exports = {
  ...compatibilityEngine,
  ...overallEngine,
  ...predictionEngine,
  ...valueEngine,
  ...evidenceEngine,

  // Explicitly last so compatibility.js's temporary lazy adapter cannot
  // override the real orchestrator and recurse back into this module.
  analysePlayer,
  calculatePlayerAnalysis,

  getPosGroup,
  ageFromPlayer,
  getHeightMid,
  getBuildMid,
  parseWeaknesses,
  sanitizeMatchFacts,
  attr10,
  attr100,
  ATTR_LABELS,
  ROLE_WEIGHTS,

  buildAssessmentSchema: config.buildAssessmentSchema,

  config,
  utils
};
