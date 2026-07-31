'use strict';

/**
 * Target path: backend/engines/compatibility.js
 * ScoutLink scoring engine v4 team, formation, position and role compatibility.
 *
 * The headline compatibility score is the conservative lower estimate. Missing
 * requirements never receive a positive default. Financial value and evidence
 * volume do not add football-compatibility points.
 */

const {
  SCORING_VERSION,
  POSITION_LABELS,
  POSITION_PROFILES,
  ROLE_PROFILES,
  DEFAULT_ROLE_BY_POSITION,
  STYLE_PROFILES,
  STYLE_ALIASES,
  TEAM_NEED_PROFILES,
  TEAM_NEED_ALIASES,
  DEVELOPMENT_PLANS,
  FORMATION_POSITIONS,
  NATURAL_ALTERNATIVES,
  ADJACENT_CONVERSIONS,
  POSITION_TRANSFER_CEILINGS,
  COMPATIBILITY_BANDS
} = require('./scoringConfig');
const {
  clamp,
  round,
  sum,
  unique,
  getAgeGroup,
  getAgePhase,
  getPrimaryPosition,
  getPositionGroup,
  normalisePosition,
  normalisePositions,
  attributesForGroup,
  collectRatings,
  coverageForWeights,
  generalisedWeightedMean,
  mergeWeightVectors,
  criticalCoverage,
  scoreBand,
  defaultFormatForAge,
  inputFingerprint,
  isObservedScore
} = require('./scoringUtils');
const { calculateEvidenceConfidence } = require('./evidenceConfidence');
const { calculateOverallRating, calculatePositionRating } = require('./overallRating');
const { calculatePredictions } = require('./predictions');

function list(value) {
  if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && item !== '');
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string') return value.split(/[,|]/g).map(item => item.trim()).filter(Boolean);
  return [value];
}

function catalogueKey(value, catalogue, aliases = {}) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (catalogue[raw]) return raw;
  if (aliases[raw] && catalogue[aliases[raw]]) return aliases[raw];
  const lower = raw.toLowerCase();
  if (catalogue[lower]) return lower;
  const underscored = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (catalogue[underscored]) return underscored;
  const aliasEntry = Object.entries(aliases).find(([key]) => key.toLowerCase() === lower);
  if (aliasEntry && catalogue[aliasEntry[1]]) return aliasEntry[1];
  return Object.entries(catalogue).find(([, item]) => {
    return String(item.label || '').trim().toLowerCase() === lower;
  })?.[0] || null;
}

function formationName(value) {
  const text = String(value || '').trim().replace(/[–—]/g, '-').replace(/\s+/g, '');
  return text || null;
}

function formatName(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  const match = text.match(/^(3|5|7|9|11)(?:v|x)(3|5|7|9|11)$/);
  return match && match[1] === match[2] ? `${match[1]}v${match[2]}` : null;
}

function resolveRole(values, targetPosition) {
  const candidates = list(values)
    .map(value => catalogueKey(value, ROLE_PROFILES))
    .filter(Boolean);
  const compatible = candidates.find(key => ROLE_PROFILES[key].positions.includes(targetPosition));
  return {
    key: compatible || candidates[0] || null,
    compatible: Boolean(compatible),
    candidates
  };
}

function resolveStyle(value) {
  return catalogueKey(value, STYLE_PROFILES, STYLE_ALIASES);
}

function resolveNeeds(values) {
  return unique(list(values)
    .map(value => catalogueKey(value, TEAM_NEED_PROFILES, TEAM_NEED_ALIASES))
    .filter(Boolean))
    .slice(0, 3);
}

function resolveDevelopmentPlan(value) {
  return catalogueKey(value, DEVELOPMENT_PLANS);
}

function resolveCompatibilitySetup(player = {}, team = {}, prefs = {}) {
  const ageGroup = getAgeGroup(player);
  const expectedFormat = defaultFormatForAge(ageGroup);
  const explicitFormat = formatName(
    prefs.matchFormat || prefs.match_format || team.match_format || team.matchFormat || team.football_format || team.footballFormat
  );
  const matchFormat = explicitFormat || expectedFormat;
  const formation = formationName(
    prefs.formation || prefs.preferredFormation || team.formation || team.preferred_formation || team.preferredFormation
  );
  const targetPosition = normalisePosition(
    prefs.targetPosition || prefs.target_position || prefs.position || prefs.positionNeeded ||
    team.target_position || team.targetPosition || team.position_needed || team.positionNeeded ||
    team.required_position || team.requiredPosition
  );
  const roleValues = prefs.requiredRole || prefs.required_role || prefs.role || prefs.roleExpectations ||
    team.required_role || team.requiredRole || team.role_expectations || team.roleExpectations;
  const role = resolveRole(roleValues, targetPosition);
  const styleKey = resolveStyle(
    prefs.playingStyle || prefs.playing_style || team.playing_style || team.playingStyle
  );
  const needKeys = resolveNeeds(
    prefs.teamNeeds || prefs.team_needs || prefs.teamWeaknesses || prefs.team_weaknesses ||
    team.team_needs || team.teamNeeds || team.team_weaknesses || team.teamWeaknesses
  );
  const developmentPlan = resolveDevelopmentPlan(
    prefs.developmentPlan || prefs.development_plan || prefs.longTermGoal || prefs.long_term_goal ||
    team.development_plan || team.developmentPlan || list(team.long_term_goals || team.longTermGoals)[0]
  );
  return {
    ageGroup,
    expectedFormat,
    explicitFormat,
    matchFormat,
    formation,
    targetPosition,
    targetPositionLabel: POSITION_LABELS[targetPosition] || null,
    requiredRole: role.key,
    requiredRoleLabel: ROLE_PROFILES[role.key]?.label || null,
    roleCompatibleWithTarget: role.compatible,
    suppliedRoleCandidates: role.candidates,
    playingStyle: styleKey,
    playingStyleLabel: STYLE_PROFILES[styleKey]?.label || null,
    teamNeeds: needKeys,
    teamNeedLabels: needKeys.map(key => TEAM_NEED_PROFILES[key].label),
    developmentPlan,
    developmentPlanLabel: DEVELOPMENT_PLANS[developmentPlan]?.label || null
  };
}

function relationBetween(sourcePosition, targetPosition, declaredPositions = []) {
  const source = normalisePosition(sourcePosition);
  const target = normalisePosition(targetPosition);
  if (!source || !target) return { key: 'incompatible', label: 'Incompatible or missing position', ceiling: 0 };
  if (source === target) return { key: 'exact', label: 'Exact position', ceiling: POSITION_TRANSFER_CEILINGS.exact };
  const sourceGroup = getPositionGroup(source);
  const targetGroup = getPositionGroup(target);
  if (sourceGroup === 'Goalkeeper' || targetGroup === 'Goalkeeper') {
    return { key: 'incompatible', label: 'Goalkeeper/outfield conversion is unsupported', ceiling: 0 };
  }
  const declared = declaredPositions.includes(target);
  const natural = (NATURAL_ALTERNATIVES[source] || []).includes(target) ||
    (NATURAL_ALTERNATIVES[target] || []).includes(source);
  const adjacent = (ADJACENT_CONVERSIONS[source] || []).includes(target) ||
    (ADJACENT_CONVERSIONS[target] || []).includes(source);
  if (declared && sourceGroup === targetGroup) {
    return { key: 'natural', label: natural ? 'Declared natural alternative' : 'Declared same-group alternative', ceiling: POSITION_TRANSFER_CEILINGS.natural };
  }
  if (declared && adjacent) {
    return { key: 'adjacent', label: 'Declared conversion with additional evidence required', ceiling: POSITION_TRANSFER_CEILINGS.adjacent };
  }
  if (!declared && (natural || sourceGroup === targetGroup || adjacent)) {
    return { key: 'speculative', label: 'Speculative conversion; position not declared', ceiling: POSITION_TRANSFER_CEILINGS.speculative };
  }
  return { key: 'incompatible', label: 'Incompatible position requirement', ceiling: POSITION_TRANSFER_CEILINGS.incompatible };
}

function formationSlotFit(targetPosition, slots = []) {
  if (!targetPosition || !slots.length) return { score: null, slot: null, relation: 'missing' };
  const ranked = slots.map(slot => {
    if (slot === targetPosition) return { score: 100, slot, relation: 'exact slot' };
    const sameGroup = getPositionGroup(slot) === getPositionGroup(targetPosition);
    const natural = (NATURAL_ALTERNATIVES[targetPosition] || []).includes(slot) ||
      (NATURAL_ALTERNATIVES[slot] || []).includes(targetPosition);
    const adjacent = (ADJACENT_CONVERSIONS[targetPosition] || []).includes(slot) ||
      (ADJACENT_CONVERSIONS[slot] || []).includes(targetPosition);
    if (natural) return { score: 92, slot, relation: 'natural slot translation' };
    if (sameGroup) return { score: 84, slot, relation: 'same-group slot translation' };
    if (adjacent) return { score: 76, slot, relation: 'adjacent slot conversion' };
    return { score: 0, slot, relation: 'incompatible slot' };
  }).sort((a, b) => b.score - a.score);
  return ranked[0];
}

function filterWeights(weights = {}, allowedAttributes = []) {
  const allowed = new Set(allowedAttributes);
  return Object.entries(weights).reduce((result, [key, weight]) => {
    if (allowed.has(key) && Number(weight) > 0) result[key] = weight;
    return result;
  }, {});
}

function componentFit(ratings, weights, minimumCoverage = 60) {
  if (!weights || !Object.keys(weights).length) return null;
  const result = generalisedWeightedMean(ratings, weights, {
    exponent: -2,
    minimumCoverage
  });
  return {
    score: result.score === null ? null : round(result.score),
    coverage: result.coverage,
    missing: result.missing,
    observedAttributes: result.used.map(item => item.key)
  };
}

function criticalCeiling(ratings, critical = []) {
  const observed = critical
    .filter(key => isObservedScore(ratings[key]))
    .map(key => ({ key, score: Number(ratings[key]) }));
  const below40 = observed.filter(item => item.score < 40);
  const below60 = observed.filter(item => item.score < 60);
  const at100 = observed.filter(item => item.score >= 100);
  let ceiling = 100;
  const reasons = [];
  if (below40.length) {
    ceiling = 55;
    reasons.push(`A critical role requirement below 40/100 caps compatibility at 55: ${below40.map(item => item.key).join(', ')}.`);
  } else if (below60.length >= 2) {
    ceiling = 68;
    reasons.push(`Two or more critical role requirements below 60/100 cap compatibility at 68: ${below60.map(item => item.key).join(', ')}.`);
  } else if (below60.length === 1) {
    ceiling = 72;
    reasons.push(`A critical role requirement below 60/100 caps compatibility at 72: ${below60[0].key}.`);
  }
  if (below60.length) reasons.push('Compatibility cannot reach 85 until every critical role requirement is at least age-appropriate.');
  if (observed.length && observed.some(item => item.score < 80)) reasons.push('Compatibility cannot reach 90 unless every critical role requirement is strong or exceptional.');
  if (observed.length && at100.length < Math.min(2, observed.length)) reasons.push('A 90+ result also requires exceptional evidence in at least two critical requirements.');
  return { ceiling, reasons, observed, below60, at100 };
}

function noScore(setup, failures, warnings = [], extra = {}) {
  return {
    scoringVersion: SCORING_VERSION,
    finalScore: null,
    score: null,
    conservativeScore: null,
    estimatedScore: null,
    likelyRange: null,
    label: 'No score',
    recommendation: 'Resolve the missing or incompatible setup before using compatibility.',
    noScoreReason: failures.join(' '),
    hardFailures: failures,
    criticalIssues: failures,
    warnings,
    setup,
    financialFit: null,
    matchEvidenceFit: null,
    ...extra
  };
}

function calculateCompatibility(player = {}, team = {}, prefs = {}, matchHistory = [], context = {}) {
  const options = { ...context, ...context.options };
  const setup = resolveCompatibilitySetup(player, team, prefs);
  const primaryPosition = getPrimaryPosition(player);
  const primaryGroup = getPositionGroup(primaryPosition);
  const declaredPositions = unique([
    primaryPosition,
    ...normalisePositions(player.positions),
    ...normalisePositions(player.alternative_positions || player.alternativePositions)
  ].filter(Boolean));
  const positionStatus = relationBetween(primaryPosition, setup.targetPosition, declaredPositions);
  const failures = [];
  const warnings = [];

  if (!setup.ageGroup) failures.push('Age group must be U7 to U16.');
  if (!primaryPosition) failures.push('A supported primary position is required.');
  if (!setup.targetPosition) failures.push('The scout must supply a supported target position.');
  if (!setup.matchFormat) failures.push('A football format is required.');
  if (setup.explicitFormat && setup.expectedFormat && setup.explicitFormat !== setup.expectedFormat) {
    warnings.push(`${setup.ageGroup} defaults to ${setup.expectedFormat}; the supplied ${setup.explicitFormat} team format is being used for this calculation.`);
  }
  if (!setup.formation) failures.push('A formation is required for a team-specific compatibility score.');
  const formationSlots = FORMATION_POSITIONS[setup.matchFormat]?.[setup.formation] || null;
  if (setup.formation && !formationSlots) {
    failures.push(`Formation ${setup.formation} is not configured for ${setup.matchFormat}.`);
  }
  if (!setup.requiredRole) failures.push('A supported required role is needed; ScoutLink does not assign a neutral default role.');
  if (setup.requiredRole && !setup.roleCompatibleWithTarget) {
    failures.push(`${ROLE_PROFILES[setup.requiredRole]?.label || setup.requiredRole} is not configured for ${setup.targetPosition || 'the target position'}.`);
  }
  if (positionStatus.key === 'speculative') {
    failures.push(`${setup.targetPosition} is not a declared playing position. Add it as an alternative and complete any missing group assessment before scoring role fit.`);
  }
  if (positionStatus.key === 'incompatible') failures.push(positionStatus.label + '.');

  const slotFit = formationSlots ? formationSlotFit(setup.targetPosition, formationSlots) : { score: null, slot: null, relation: 'missing' };
  if (formationSlots && (!slotFit.score || slotFit.score < 70)) {
    failures.push(`${setup.targetPosition} has no compatible slot in ${setup.formation}.`);
  }

  const targetGroup = getPositionGroup(setup.targetPosition);
  const targetAttributes = attributesForGroup(targetGroup);
  const ratings = collectRatings(player, targetAttributes);
  const targetProfile = POSITION_PROFILES[setup.targetPosition];
  const targetCoverage = targetProfile ? coverageForWeights(ratings, targetProfile.weights) : 0;
  const roleProfile = ROLE_PROFILES[setup.requiredRole];
  const roleCriticalCoverage = roleProfile ? criticalCoverage(ratings, roleProfile.critical) : 0;
  if (positionStatus.key === 'adjacent' && targetCoverage < 60) {
    failures.push('The declared cross-group position has less than 60% of its required additional assessment.');
  }
  if (roleProfile && coverageForWeights(ratings, roleProfile.weights) < 65) {
    failures.push('Fewer than 65% of the required-role weighted attributes have been observed.');
  }
  if (roleProfile && roleCriticalCoverage < 60) {
    failures.push('More than 40% of the critical role attributes are unobserved.');
  }

  if (failures.length) {
    return noScore(setup, unique(failures), warnings, {
      primaryPosition,
      primaryGroup,
      positionStatus: positionStatus.label,
      positionStatusKey: positionStatus.key,
      formationPositionFit: slotFit.score,
      targetAssessmentCoverage: round(targetCoverage),
      roleCriticalCoverage
    });
  }

  const evidence = context.evidenceConfidence || calculateEvidenceConfidence(player, matchHistory, {
    ...options,
    expectedAttributes: targetAttributes,
    criticalAttributes: roleProfile.critical
  });
  if (evidence.hardFailures?.length) {
    return noScore(setup, evidence.hardFailures, evidence.warnings, {
      primaryPosition,
      primaryGroup,
      positionStatus: positionStatus.label,
      positionStatusKey: positionStatus.key,
      formationPositionFit: slotFit.score,
      evidenceConfidence: evidence
    });
  }

  const allowed = targetAttributes;
  const roleWeights = filterWeights(roleProfile.weights, allowed);
  const styleProfile = STYLE_PROFILES[setup.playingStyle] || null;
  const styleWeights = styleProfile ? filterWeights(styleProfile.weights, allowed) : {};
  const needWeights = mergeWeightVectors(setup.teamNeeds.map(key => ({
    weights: filterWeights(TEAM_NEED_PROFILES[key].weights, allowed),
    multiplier: 1
  })));
  const roleFit = componentFit(ratings, roleWeights, 65);
  const styleFit = styleProfile ? componentFit(ratings, styleWeights, 55) : null;
  const needFit = setup.teamNeeds.length ? componentFit(ratings, needWeights, 55) : null;
  if (!roleFit || roleFit.score === null) {
    return noScore(setup, ['The required-role evidence cannot produce a valid score.'], evidence.warnings, {
      evidenceConfidence: evidence
    });
  }

  const overall = context.overallAnalysis || calculateOverallRating(player, matchHistory, options);
  const prediction = context.predictionAnalysis || calculatePredictions(player, matchHistory, {
    ...options,
    overallAnalysis: overall,
    evidenceConfidence: evidence,
    developmentPlan: setup.developmentPlan
  });
  const foundation = Number(prediction.developmentFoundation?.score);
  const potential = Number(prediction.potentialOverall);
  const developmentPathwayFit = Number.isFinite(foundation) && Number.isFinite(potential)
    ? round(foundation * 0.70 + potential * 0.30)
    : Number.isFinite(foundation) ? round(foundation) : Number.isFinite(potential) ? round(potential) : 50;

  const phase = getAgePhase(setup.ageGroup);
  const configured = phase.componentWeights;
  const activeWeights = {
    formation: configured.formation,
    role: configured.role,
    style: styleFit?.score === null || styleFit === null ? 0 : configured.style,
    need: needFit?.score === null || needFit === null ? 0 : configured.need,
    development: configured.development
  };
  const activeTotal = sum(Object.values(activeWeights));
  const normalisedWeights = Object.entries(activeWeights).reduce((mapped, [key, value]) => {
    mapped[key] = activeTotal > 0 ? value / activeTotal : 0;
    return mapped;
  }, {});
  const capabilityWeights = mergeWeightVectors([
    { weights: roleWeights, multiplier: normalisedWeights.role },
    { weights: styleWeights, multiplier: normalisedWeights.style },
    { weights: needWeights, multiplier: normalisedWeights.need }
  ]);
  const capabilityFit = componentFit(ratings, capabilityWeights, 60);
  if (!capabilityFit || capabilityFit.score === null) {
    return noScore(setup, ['The merged role, style and team-need evidence is incomplete.'], evidence.warnings, {
      evidenceConfidence: evidence
    });
  }

  const capabilityShare = normalisedWeights.role + normalisedWeights.style + normalisedWeights.need;
  let estimatedScore =
    slotFit.score * normalisedWeights.formation +
    capabilityFit.score * capabilityShare +
    developmentPathwayFit * normalisedWeights.development;

  const critical = criticalCeiling(ratings, roleProfile.critical);
  let ceiling = Math.min(positionStatus.ceiling, critical.ceiling);
  const ceilingReasons = [...critical.reasons];
  if (!styleProfile) {
    ceiling = Math.min(ceiling, 92);
    warnings.push('Playing style was not supplied; style fit is omitted and the score ceiling is 92.');
    ceilingReasons.push('Missing playing style caps compatibility at 92.');
  }
  if (!setup.teamNeeds.length) {
    ceiling = Math.min(ceiling, 94);
    warnings.push('No explicit team need was supplied; team-need fit is omitted and the score ceiling is 94.');
    ceilingReasons.push('Missing team need caps compatibility at 94.');
  }
  if (setup.teamNeeds.length && (!needFit || needFit.score === null)) {
    ceiling = Math.min(ceiling, 84);
    warnings.push('The stated team need does not have enough relevant observed attributes.');
  }
  if (estimatedScore >= 90 && (critical.observed.some(item => item.score < 80) || critical.at100.length < Math.min(2, critical.observed.length))) {
    ceiling = Math.min(ceiling, 89);
  } else if (estimatedScore >= 85 && critical.below60.length) {
    ceiling = Math.min(ceiling, 84);
  }
  estimatedScore = round(Math.min(clamp(estimatedScore), ceiling));

  const uncertaintyWidth = round(3 + (100 - evidence.score) * 0.12 + phase.uncertaintyExtra);
  const conservativeScore = round(Math.min(estimatedScore, clamp(estimatedScore - uncertaintyWidth), ceiling));
  const likelyRange = {
    minimum: conservativeScore,
    maximum: round(Math.min(ceiling, clamp(estimatedScore + uncertaintyWidth * 0.68)))
  };
  const band = scoreBand(conservativeScore, COMPATIBILITY_BANDS);
  const criticalWeaknesses = critical.observed
    .filter(item => item.score < 60)
    .map(item => ({ key: item.key, score: item.score }));
  const risks = [...warnings, ...evidence.warnings, ...criticalWeaknesses.map(item => `Critical role requirement below age expectation: ${item.key}.`)];
  const targetPositionRating = calculatePositionRating(player, setup.targetPosition, matchHistory, options);

  return {
    scoringVersion: SCORING_VERSION,
    calculatedAt: (options.now || new Date()).toISOString(),
    inputFingerprint: inputFingerprint({ setup, ratings, evidenceScore: evidence.score }),
    finalScore: conservativeScore,
    score: conservativeScore,
    conservativeScore,
    estimatedScore,
    likelyRange,
    label: band?.label || null,
    recommendation: band?.recommendation || null,
    recommendedUse: band?.recommendation || null,
    formationPositionFit: round(slotFit.score),
    formationSlot: slotFit.slot,
    formationSlotRelation: slotFit.relation,
    roleFit: roleFit.score,
    tacticalStyleFit: styleFit?.score ?? null,
    needFit: needFit?.score ?? null,
    teamNeedFit: needFit?.score ?? null,
    developmentPathwayFit,
    capabilityFit: capabilityFit.score,
    targetPositionRating: targetPositionRating?.score ?? null,
    positionStatus: positionStatus.label,
    positionStatusKey: positionStatus.key,
    scoreCeiling: ceiling,
    ceilingReasons: unique(ceilingReasons),
    criticalIssues: criticalWeaknesses,
    criticalWeaknesses,
    targetAssessmentCoverage: round(targetCoverage),
    roleCriticalCoverage,
    evidenceConfidence: evidence,
    confidenceFit: evidence.score,
    matchEvidenceFit: null,
    financialFit: null,
    componentDetails: {
      role: roleFit,
      style: styleFit,
      teamNeed: needFit,
      mergedCapability: capabilityFit
    },
    setup,
    risks: unique(risks),
    warnings: unique(warnings),
    explanation: 'Compatibility is team- and role-specific. Formation fit is combined with one merged capability demand vector built from the required role, supplied playing style and stated team need, plus a small age-phase development-pathway component. The headline is the conservative lower estimate; evidence confidence controls uncertainty rather than adding points.'
  };
}

function compatibilityScore(player = {}, team = {}, prefs = {}, matchHistory = [], context = {}) {
  const result = calculateCompatibility(player, team, prefs, matchHistory, context);
  return {
    score: result.conservativeScore,
    breakdown: {
      tacticalFit: result.capabilityFit,
      ageDevelopmentFit: result.developmentPathwayFit,
      preferenceFit: result.roleFit,
      dataConfidence: result.evidenceConfidence?.score ?? null,
      needFit: result.needFit,
      roleFit: result.roleFit,
      tacticalStyleFit: result.tacticalStyleFit,
      formationPositionFit: result.formationPositionFit,
      developmentPathwayFit: result.developmentPathwayFit,
      matchEvidenceFit: null,
      financialFit: null,
      confidenceFit: result.evidenceConfidence?.score ?? null,
      label: result.label,
      likelyRange: result.likelyRange,
      positionStatus: result.positionStatus,
      scoreCeiling: result.scoreCeiling,
      risks: result.risks,
      recommendedUse: result.recommendation,
      setup: result.setup,
      compatibility: result
    }
  };
}

/*
 * Temporary route adapters. Existing ScoutLink routes currently import these
 * names from compatibility.js. Keeping the adapters here lets the calculation
 * files be split before the routes are migrated to require('./engines').
 */
function analysePlayer(...args) {
  return require('./index').analysePlayer(...args);
}

function calculateOverallBreakdown(...args) {
  return require('./overallRating').calculateOverallRating(...args);
}

function calculatePositionRatings(...args) {
  return require('./overallRating').calculatePositionRatings(...args);
}

function computeOverall(...args) {
  return require('./overallRating').computeOverall(...args);
}

function predictionScore(...args) {
  const analysis = require('./predictions').calculatePredictions(...args);
  return {
    score: analysis.potentialOverall,
    currentOverall: analysis.currentOverall,
    potentialOverall: analysis.potentialOverall,
    trajectory: analysis.trajectory,
    bestCurrentPosition: analysis.bestCurrentPosition,
    bestFuturePosition: analysis.bestProjectedFuturePosition,
    confidence: analysis.predictionConfidence?.label || null,
    details: analysis
  };
}

function calculateValueAnalysis(...args) {
  return require('./playerValue').calculateValueAnalysis(...args);
}

function grassrootsTransferValue(...args) {
  return require('./playerValue').grassrootsTransferValue(...args);
}

function transferValue(...args) {
  return require('./playerValue').transferValue(...args);
}

function predictedSalary(...args) {
  return require('./playerValue').predictedSalary(...args);
}

function getPosGroup(positionOrPlayer) {
  const group = Array.isArray(positionOrPlayer) || typeof positionOrPlayer === 'string'
    ? getPositionGroup(normalisePositions(positionOrPlayer)[0])
    : getPositionGroup(positionOrPlayer);
  return group === 'Attacker' ? 'Forward' : group;
}

function ageFromPlayer(player = {}) {
  const match = String(player.age_group || player.ageGroup || '').trim().toUpperCase().match(/^U(\d{1,2})$/);
  return match ? Number(match[1]) : null;
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

function parseWeaknesses(value) {
  return list(value);
}

function sanitizeMatchFacts(matchHistory = []) {
  const { normaliseMatchFact } = require('./scoringUtils');
  return (Array.isArray(matchHistory) ? matchHistory : []).map(normaliseMatchFact);
}

function attr100(player = {}, key, fallback = null) {
  const { getAttributeRating } = require('./scoringUtils');
  const value = getAttributeRating(player, key);
  return value === null ? fallback : value;
}

function attr10(player = {}, key, fallback = null) {
  const value = attr100(player, key, fallback === null ? null : fallback * 10);
  return value === null ? null : round(value / 10);
}

const ATTR_LABELS = Object.freeze(Object.entries(require('./scoringConfig').ATTRIBUTE_DEFINITIONS).reduce((mapped, [key, definition]) => {
  mapped[key] = definition.label;
  return mapped;
}, {}));

const ROLE_WEIGHTS = Object.freeze(Object.entries(require('./scoringConfig').POSITION_PROFILES).reduce((mapped, [position, profile]) => {
  mapped[position] = profile.weights;
  return mapped;
}, {}));

module.exports = {
  calculateCompatibility,
  compatibilityScore,
  resolveCompatibilitySetup,
  relationBetween,
  formationSlotFit,
  analysePlayer,
  calculateOverallBreakdown,
  calculatePositionRatings,
  computeOverall,
  predictionScore,
  calculateValueAnalysis,
  grassrootsTransferValue,
  transferValue,
  predictedSalary,
  getPosGroup,
  ageFromPlayer,
  getHeightMid,
  getBuildMid,
  parseWeaknesses,
  sanitizeMatchFacts,
  attr10,
  attr100,
  ATTR_LABELS,
  ROLE_WEIGHTS
};
