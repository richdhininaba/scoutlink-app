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

function values(value) {
  if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && item !== '');
  return value === null || value === undefined || value === '' ? [] : [value];
}

function firstMaterial(...candidates) {
  for (const candidate of candidates) {
    const material = values(candidate).find(item => String(item || '').trim());
    if (material !== undefined) return material;
  }
  return null;
}

function canonicalStyle(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalised = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (config.STYLE_PROFILES[normalised]) return normalised;
  if (config.STYLE_ALIASES[normalised]) return config.STYLE_ALIASES[normalised];
  if (/tiki|possession/.test(normalised)) return 'possession';
  if (/build/.test(normalised)) return 'build_up_from_back';
  if (/counter/.test(normalised)) return 'counter_attack';
  if (/high.*press|pressing/.test(normalised)) return 'high_press';
  if (/low.*block/.test(normalised)) return 'low_block';
  if (/direct/.test(normalised)) return 'direct_play';
  if (/wing|wide/.test(normalised)) return 'wing_play';
  if (/vertical|transition/.test(normalised)) return 'vertical_play';
  if (/compact/.test(normalised)) return 'compact_defence';
  return null;
}

function canonicalNeed(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalised = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (config.TEAM_NEED_PROFILES[normalised]) return normalised;
  if (config.TEAM_NEED_ALIASES[normalised]) return config.TEAM_NEED_ALIASES[normalised];
  if (/goal|finish|scor|offensive/.test(normalised)) return 'goal_output';
  if (/chance|creativ|final_pass/.test(normalised)) return 'chance_creation';
  if (/progress|carry|build/.test(normalised)) return 'ball_progression';
  if (/retain|retention|pressure|technical/.test(normalised)) return 'pressure_resistance';
  if (/one.*one|tackle|defensive_base/.test(normalised)) return 'defensive_one_v_one';
  if (/defensive.*transition|recovery/.test(normalised)) return 'defensive_transition';
  if (/aerial|physical_presence/.test(normalised)) return 'aerial_security';
  if (/press/.test(normalised)) return 'press_effectiveness';
  if (/goalkeeper.*distribution|distribution/.test(normalised)) return 'goalkeeper_distribution';
  if (/goalkeeper.*command|commanding_goalkeeper/.test(normalised)) return 'goalkeeper_command';
  if (/wide|pace|speed/.test(normalised)) return 'wide_threat';
  return null;
}

function canonicalDevelopmentPlan(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'balanced';
  const normalised = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (config.DEVELOPMENT_PLANS[normalised]) return normalised;
  if (/goalkeeper|keeper/.test(normalised)) return 'goalkeeper_command';
  if (/final|goal|attack/.test(normalised)) return 'final_third_output';
  if (/defen|tactical/.test(normalised)) return 'defensive_intelligence';
  if (/athletic|physical|transition/.test(normalised)) return 'athletic_transition';
  if (/technical|possession/.test(normalised)) return 'technical_possession';
  return 'balanced';
}

function canonicalRole(value, targetPosition) {
  const candidates = values(value);
  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const direct = config.ROLE_PROFILES[key];
    if (direct && direct.positions.includes(targetPosition)) return key;
    const byLabel = Object.entries(config.ROLE_PROFILES).find(([, profile]) => {
      return profile.positions.includes(targetPosition) &&
        String(profile.label || '').trim().toLowerCase() === raw.toLowerCase();
    });
    if (byLabel) return byLabel[0];
  }
  return config.DEFAULT_ROLE_BY_POSITION[targetPosition] ||
    (config.POSITION_ROLES[targetPosition] || [])[0] || null;
}

function canonicalScoutContext(player = {}, team = {}, scoutPrefs = {}) {
  const teamSetup = team?.scoring_setup && typeof team.scoring_setup === 'object'
    ? team.scoring_setup
    : {};
  const preferenceSetup = scoutPrefs?.setup && typeof scoutPrefs.setup === 'object'
    ? scoutPrefs.setup
    : scoutPrefs?.recruitmentBrief && typeof scoutPrefs.recruitmentBrief === 'object'
      ? scoutPrefs.recruitmentBrief
      : {};

  const playerPosition = utils.getPrimaryPosition(player);
  const explicitTarget = utils.normalisePosition(firstMaterial(
    preferenceSetup.targetPosition,
    preferenceSetup.target_position,
    scoutPrefs.targetPosition,
    scoutPrefs.target_position,
    teamSetup.targetPosition,
    teamSetup.target_position,
    team.target_position
  ));
  const preferredPositions = utils.unique([
    ...utils.normalisePositions(preferenceSetup.preferredPositions || preferenceSetup.preferred_positions || []),
    ...utils.normalisePositions(scoutPrefs.preferredPositions || scoutPrefs.preferred_positions || []),
    ...utils.normalisePositions(teamSetup.preferredPositions || teamSetup.preferred_positions || []),
    ...utils.normalisePositions(team.preferred_positions || [])
  ]);

  /*
   * A single explicit target remains authoritative. A broad list of preferred
   * positions is a recruitment scope, not a reason to make every other player
   * unscorable, so each player is assessed in their recorded primary position.
   */
  const targetPosition = explicitTarget || playerPosition || preferredPositions[0] || null;
  const roleInput = firstMaterial(
    preferenceSetup.requiredRole,
    preferenceSetup.required_role,
    scoutPrefs.requiredRole,
    scoutPrefs.required_role,
    teamSetup.requiredRole,
    teamSetup.required_role,
    values(scoutPrefs.roleExpectations || scoutPrefs.role_expectations),
    values(team.role_expectations)
  );

  const needInputs = [
    ...values(preferenceSetup.teamNeeds || preferenceSetup.team_needs),
    ...values(preferenceSetup.teamWeaknesses || preferenceSetup.team_weaknesses),
    ...values(scoutPrefs.teamNeeds || scoutPrefs.team_needs),
    ...values(scoutPrefs.teamWeaknesses || scoutPrefs.team_weaknesses),
    ...values(teamSetup.teamNeeds || teamSetup.team_needs),
    ...values(team.team_weaknesses),
    ...values(scoutPrefs.longTermGoals || scoutPrefs.long_term_goals),
    ...values(team.long_term_goals)
  ];
  const teamNeeds = utils.unique(needInputs.map(canonicalNeed).filter(Boolean)).slice(0, 3);

  const playingStyle = canonicalStyle(firstMaterial(
    preferenceSetup.playingStyle,
    preferenceSetup.playing_style,
    scoutPrefs.playingStyle,
    scoutPrefs.playing_style,
    teamSetup.playingStyle,
    teamSetup.playing_style,
    team.playing_style
  ));

  const developmentPlan = canonicalDevelopmentPlan(firstMaterial(
    preferenceSetup.developmentPlan,
    preferenceSetup.development_plan,
    scoutPrefs.developmentPlan,
    scoutPrefs.development_plan,
    teamSetup.developmentPlan,
    teamSetup.development_plan,
    values(scoutPrefs.longTermGoals || scoutPrefs.long_term_goals)
  ));

  const formation = firstMaterial(
    preferenceSetup.formation,
    scoutPrefs.formation,
    teamSetup.formation,
    team.formation
  );
  const matchFormat = firstMaterial(
    preferenceSetup.matchFormat,
    preferenceSetup.match_format,
    scoutPrefs.matchFormat,
    scoutPrefs.match_format,
    teamSetup.matchFormat,
    teamSetup.match_format
  );

  const canonicalTeam = {
    ...team,
    ...teamSetup,
    formation: formation || team.formation || null,
    playing_style: playingStyle,
    target_position: targetPosition,
    required_role: canonicalRole(roleInput, targetPosition),
    team_needs: teamNeeds,
    development_plan: developmentPlan
  };
  if (matchFormat) canonicalTeam.match_format = matchFormat;

  const canonicalPrefs = {
    ...scoutPrefs,
    ...preferenceSetup,
    targetPosition,
    target_position: targetPosition,
    preferredPositions,
    preferred_positions: preferredPositions,
    requiredRole: canonicalTeam.required_role,
    required_role: canonicalTeam.required_role,
    playingStyle,
    playing_style: playingStyle,
    teamNeeds,
    team_needs: teamNeeds,
    developmentPlan,
    development_plan: developmentPlan,
    formation: canonicalTeam.formation
  };
  if (matchFormat) {
    canonicalPrefs.matchFormat = matchFormat;
    canonicalPrefs.match_format = matchFormat;
  }

  return {
    team: canonicalTeam,
    prefs: canonicalPrefs,
    targetPosition,
    requiredRole: canonicalTeam.required_role,
    preferredPositions
  };
}

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
  const scoutContext = hasTeamRequirement
    ? canonicalScoutContext(player, team || {}, scoutPrefs || {})
    : null;
  const compatibility = scoutContext?.targetPosition && scoutContext?.requiredRole
    ? compatibilityEngine.calculateCompatibility(
        player,
        scoutContext.team,
        scoutContext.prefs,
        matchHistory,
        {
          ...context,
          ...options,
          overallAnalysis: overallBreakdown,
          predictionAnalysis: predictionDetails,
          evidenceConfidence
        }
      )
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
    compatibilityContext: scoutContext
      ? {
          targetPosition: scoutContext.targetPosition,
          requiredRole: scoutContext.requiredRole,
          preferredPositions: scoutContext.preferredPositions
        }
      : null,

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
  canonicalScoutContext,

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
