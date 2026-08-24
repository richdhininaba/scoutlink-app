'use strict';

/**
 * Target path: backend/routes/predictions.js
 * ScoutLink prediction route with profile-first data predictions and optional
 * OpenAI-enhanced football analysis.
 *
 * Credit model:
 *   Data only      = 1 prediction credit (the predictions_log row)
 *   AI enhanced    = 8 prediction credits (1 log row + 7 AI premium credits)
 *
 * AI failure never destroys a valid prediction. ScoutLink returns the fully
 * calculated data-only result and charges only the normal one credit.
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const {
  config,
  utils,
  calculateOverallRating,
  calculatePredictions,
  calculateScenarioPrediction,
  calculatePositionFitPrediction,
  calculateValueAnalysis
} = require('../engines');
const { getScoutUsageSnapshot } = require('../utils/scoutUsage');
const { analysePredictionWithAi } = require('../services/predictionAi');

const DISCLAIMER = 'ScoutLink predictions are bounded decision-support estimates based on the assessed player profile, age group, position/role requirements and available contextual match evidence. They are not guarantees, financial advice, or estimates of biological maturation.';
const DATA_ONLY_CREDIT_COST = 1;
const AI_CREDIT_COST = 8;
const AI_PREMIUM_CREDIT_COST = AI_CREDIT_COST - DATA_ONLY_CREDIT_COST;

function confidenceShape(evidence = {}, predictionConfidence = null) {
  const score = predictionConfidence?.score ?? evidence.score ?? 0;
  const rawLabel = predictionConfidence?.label || evidence.label || 'Profile-led';
  const label = /insufficient/i.test(String(rawLabel)) ? 'Profile-led' : rawLabel;
  const note = (evidence.warnings || [])[0] || 'The assessed player profile is the prediction baseline; match evidence tightens the range and trend calibration.';
  return { score, label, note, explanation: note };
}

function playerName(player = {}) {
  return [player.first_name, player.last_name].filter(Boolean).join(' ') || 'This player';
}

function cleanText(value, max = 1000) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function humanList(values = []) {
  const items = values.filter(Boolean).map(value => String(value));
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function scoreBandText(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'balanced';
  if (value >= 80) return 'high-level';
  if (value >= 70) return 'strong';
  if (value >= 60) return 'usable';
  return 'developing';
}

function profileSignals(player = {}) {
  const group = utils.getPositionGroup(player);
  const ratings = utils.collectRatings(player, utils.attributesForGroup(group));
  const rows = Object.entries(ratings)
    .filter(([, score]) => utils.isObservedScore(score))
    .map(([key, score]) => ({
      key,
      label: config.ATTRIBUTE_DEFINITIONS[key]?.label || key.replace(/_/g, ' '),
      score: Number(score)
    }))
    .sort((a, b) => b.score - a.score);

  return {
    all: rows,
    strengths: rows.slice(0, 4),
    headroom: [...rows].sort((a, b) => a.score - b.score).slice(0, 4)
  };
}

function matchCalibrationSentence(facts = [], prediction = {}) {
  const count = Array.isArray(facts) ? facts.length : 0;
  const trend = prediction?.trend || {};
  const calibratedMatches = Number(trend.matchesUsed || 0);

  if (!count) {
    return 'The outlook is deliberately profile-led: no match record is required to generate it, while future appearances can tighten the likely range and test whether the assessed behaviours repeat under match pressure.';
  }
  if (calibratedMatches < 3) {
    return `${count} recorded match${count === 1 ? '' : 'es'} add context to the assessed profile, but the projection does not depend on that small sample; further appearances will mainly improve trend calibration and narrow uncertainty.`;
  }
  return `${count} recorded match${count === 1 ? '' : 'es'} strengthen the profile-led model, with the recent performance direction currently reading ${String(trend.label || 'stable').toLowerCase()}; that trend calibrates the range rather than replacing the underlying attribute assessment.`;
}

async function loadScout(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('id,scout_team_id,subscription_plan,predictions_remaining,scout_preferences,limit_overrides,plan_end')
    .eq('id', userId)
    .single();

  if (error || !scout) {
    const failure = new Error('Scout not found');
    failure.status = 404;
    throw failure;
  }
  return scout;
}

async function updateRemaining(scout, remaining) {
  if (scout.scout_team_id) {
    const { error } = await supabase
      .from('scouts')
      .update({ predictions_remaining: remaining })
      .eq('scout_team_id', scout.scout_team_id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('scouts')
      .update({ predictions_remaining: remaining })
      .eq('id', scout.id);
    if (error) throw error;
  }
}

async function loadScoutTeam(scout) {
  if (!scout.scout_team_id) return null;
  const { data, error } = await supabase
    .from('scout_teams')
    .select('*')
    .eq('id', scout.scout_team_id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function canonicalType(type) {
  if (type === 'Attribute trajectory') return 'Attribute Development';
  if (type === 'Transfer value trajectory') return 'ROI Analysis';
  if (type === 'Match scenario simulation') return 'Match Scenario Prediction';
  if (type === 'Return on Investment') return 'ROI Analysis';
  if (['Position Fit', 'position_fit', 'Positional ceiling'].includes(type)) return 'Position Fit Projection';
  if (['Value / ROI Projection', 'Value Projection'].includes(type)) return 'ROI Analysis';
  if (['Overall Rating Projection', 'Role Readiness Prediction', 'Compatibility Projection'].includes(type)) return 'Position Fit Projection';
  return type;
}

function developmentPlanKey(input = {}) {
  const requested = String(input.focus || input.trainingFocus || input.developmentPlan || '').trim().toLowerCase();
  if (!requested) return null;
  return Object.entries(config.DEVELOPMENT_PLANS).find(([key, plan]) => {
    return key === requested.replace(/[^a-z0-9]+/g, '_') || plan.label.toLowerCase() === requested;
  })?.[0] || null;
}

function trustedFinancialContext(scoutTeam = null, input = {}) {
  const setup = scoutTeam?.scoring_setup && typeof scoutTeam.scoring_setup === 'object'
    ? scoutTeam.scoring_setup
    : {};
  const annualDevelopmentCost = optionalNumber(input.annualDevelopmentCost);
  const scoutingCost = optionalNumber(input.scoutingCost);
  const explicitDevelopmentCost = optionalNumber(input.developmentCost);

  return {
    marketContext: setup.marketContext || setup.market_context || null,
    salaryContext: setup.salaryContext || setup.salary_context || null,
    acquisitionCost: optionalNumber(input.acquisitionCost),
    annualDevelopmentCost,
    scoutingCost,
    developmentCost: explicitDevelopmentCost !== null
      ? explicitDevelopmentCost
      : annualDevelopmentCost !== null
        ? annualDevelopmentCost * 5 + (scoutingCost || 0)
        : null
  };
}

function attributeDevelopmentResult(player, facts, input, context) {
  const plan = developmentPlanKey(input);
  const overall = calculateOverallRating(player, facts, context);
  const prediction = calculatePredictions(player, facts, {
    ...context,
    overallAnalysis: overall,
    developmentPlan: plan
  });
  const value = calculateValueAnalysis(player, facts, {
    ...context,
    overallAnalysis: overall,
    predictionAnalysis: prediction
  });
  const currentRatings = utils.collectRatings(player, utils.attributesForGroup(utils.getPositionGroup(player)));
  const projectedBySeason = prediction.projectedOverallBySeason || [];
  const valueBySeason = value.futureProjection || [];
  const attributeBySeason = prediction.attributeDevelopment?.projections || [];

  const seasons = projectedBySeason.map(item => {
    const financial = valueBySeason.find(row => row.season === item.season) || {};
    const attributes = attributeBySeason.find(row => row.season === item.season) || {};
    return {
      year: item.season,
      overall: item.projectedOverall,
      likelyRange: item.likelyRange,
      footballValueIndex: financial.footballValueIndex ?? null,
      transferValue: financial.currencyValue ?? null,
      transferValueFormatted: financial.currencyValueFormatted ?? null,
      attributes: Object.entries(attributes.projectedAttributes || {}).reduce((mapped, [key, score]) => {
        mapped[key] = utils.round(score / 10);
        return mapped;
      }, {}),
      attributeDeltas: Object.entries(attributes.projectedAttributes || {}).reduce((mapped, [key, score]) => {
        mapped[key] = utils.round((score - Number(currentRatings[key])) / 10);
        return mapped;
      }, {})
    };
  });

  const year3Attributes = attributeBySeason.find(row => row.season === 3)?.projectedAttributes || {};
  const finalSeason = attributeBySeason[attributeBySeason.length - 1] || {};
  const finalAttributes = finalSeason.projectedAttributes || {};
  const leadingFinal = finalSeason.leadingImprovements || [];

  const attributeEffects = Object.entries(currentRatings)
    .filter(([, current]) => utils.isObservedScore(current))
    .map(([key, current]) => {
      const projected = finalAttributes[key] ?? current;
      const year3 = year3Attributes[key] ?? current;
      const isLeading = leadingFinal.some(item => item.key === key);
      return {
        key,
        attribute: config.ATTRIBUTE_DEFINITIONS[key]?.label || key,
        current: utils.round(Number(current) / 10),
        year3: utils.round(Number(year3) / 10),
        year5: utils.round(Number(projected) / 10),
        deltaFiveYear: utils.round((Number(projected) - Number(current)) / 10),
        reason: isLeading
          ? 'This attribute is a leading gain in the selected development plan and has meaningful available headroom.'
          : 'This attribute remains part of the assessed profile and develops more gradually outside the main plan priorities.'
      };
    })
    .sort((a, b) => Math.abs(b.deltaFiveYear) - Math.abs(a.deltaFiveYear));

  const attributeEffectsByKey = attributeEffects.reduce((mapped, item) => {
    mapped[item.key] = item;
    return mapped;
  }, {});
  const confidence = confidenceShape(prediction.evidenceConfidence, prediction.predictionConfidence);
  const priorityNames = (prediction.developmentPriorities || []).slice(0, 3).map(item => item.label || item.key);

  return {
    type: 'Attribute Development',
    focus: prediction.developmentPlan?.label,
    trajectory: prediction.trajectory,
    currentOverall: prediction.currentOverall,
    potentialOverall: prediction.potentialOverall,
    likelyRange: prediction.likelyRange,
    currentTransferValue: {
      value: value.value,
      formatted: value.valueFormatted,
      footballValueIndex: value.footballValueIndex
    },
    currentAttributes: Object.entries(currentRatings).reduce((mapped, [key, score]) => {
      if (score !== null) mapped[key] = utils.round(score / 10);
      return mapped;
    }, {}),
    confidence,
    seasons,
    attributeEffectsByKey,
    attributeEffects,
    tradeOffs: prediction.expectedTradeOffs,
    generatedAttributes: {},
    visualisation: {
      labels: seasons.map(item => `Year ${item.year}`),
      overall: seasons.map(item => item.overall),
      footballValueIndex: seasons.map(item => item.footballValueIndex),
      transferValue: seasons.map(item => item.transferValue)
    },
    recommendation: priorityNames.length
      ? `Prioritise ${humanList(priorityNames)} while checking that the player's strongest current qualities remain stable as role demand increases.`
      : 'Use the projected range as the decision boundary and verify the key development behaviours live.',
    paragraphs: [],
    summary: '',
    predictionDetails: prediction,
    valueAnalysis: value,
    disclaimer: DISCLAIMER
  };
}

function roiResult(player, facts, input, context) {
  const overall = calculateOverallRating(player, facts, context);
  const prediction = calculatePredictions(player, facts, {
    ...context,
    overallAnalysis: overall,
    developmentPlan: developmentPlanKey(input)
  });
  const value = calculateValueAnalysis(player, facts, {
    ...context,
    overallAnalysis: overall,
    predictionAnalysis: prediction
  });
  const acquisitionCost = context.acquisitionCost ?? value.value;
  const projection = (value.futureProjection || []).map(item => {
    const totalCost = acquisitionCost !== null && acquisitionCost !== undefined && context.annualDevelopmentCost !== null
      ? Number(acquisitionCost) + Number(context.scoutingCost || 0) + Number(context.annualDevelopmentCost) * item.season
      : null;
    const roiPercent = item.currencyValue !== null && totalCost !== null && totalCost > 0
      ? utils.round(((item.currencyValue - totalCost) / totalCost) * 100)
      : null;
    return {
      horizon: `Year ${item.season}`,
      year: item.season,
      footballValueIndex: item.footballValueIndex,
      projectedValue: item.currencyValue,
      projectedValueFormatted: item.currencyValueFormatted,
      totalCost,
      totalCostFormatted: totalCost === null || !value.currency ? null : utils.formatCurrency(totalCost, value.currency),
      roiPercent
    };
  });
  const anchored = value.currencyEstimateStatus === 'Anchored estimate';

  return {
    type: 'ROI Analysis',
    financialGoal: input.financialGoal || input.goal || 'Evidence-led value review',
    currentTransferValue: {
      value: value.value,
      formatted: value.valueFormatted,
      footballValueIndex: value.footballValueIndex
    },
    assumptions: {
      acquisitionCost,
      acquisitionCostFormatted: acquisitionCost == null || !value.currency ? null : utils.formatCurrency(acquisitionCost, value.currency),
      annualDevelopmentCost: context.annualDevelopmentCost,
      annualDevelopmentCostFormatted: context.annualDevelopmentCost == null || !value.currency ? null : utils.formatCurrency(context.annualDevelopmentCost, value.currency),
      scoutingCost: context.scoutingCost,
      scoutingCostFormatted: context.scoutingCost == null || !value.currency ? null : utils.formatCurrency(context.scoutingCost, value.currency),
      marketAnchorStatus: value.currencyEstimateStatus
    },
    projection,
    suitability: anchored && value.roiProjection?.roi !== null
      ? 'Anchored scenario available'
      : 'Index-led outlook — verified financial anchors required for currency ROI',
    confidence: confidenceShape(value.valueConfidence || value.evidenceConfidence, prediction.predictionConfidence),
    recommendation: anchored
      ? 'Review the anchored range, development assumptions and governing rules together before using the financial scenario in a recruitment decision.'
      : 'Use the Football Value Index and its drivers for prioritisation; currency value and ROI remain withheld until verified market anchors are supplied.',
    valueDrivers: (value.valueDrivers || []).map(driver => ({ ...driver, value: `${driver.score}/100` })),
    risks: (value.warnings || []).map(warning => ({ label: 'Model limitation', level: value.riskLabel, note: warning })),
    paragraphs: [],
    summary: '',
    visualisation: {
      labels: ['Current', ...projection.map(item => item.horizon)],
      values: [value.value, ...projection.map(item => item.projectedValue)],
      footballValueIndex: [value.footballValueIndex, ...projection.map(item => item.footballValueIndex)]
    },
    valueAnalysis: value,
    predictionDetails: prediction,
    disclaimer: `${DISCLAIMER} Currency and ROI require verified market anchors and regulatory checks.`
  };
}

function scenarioResult(player, facts, input, context) {
  const scenario = calculateScenarioPrediction(player, input.scenarioKey || input.scenario, facts, context);
  const confidence = confidenceShape(scenario.evidenceConfidence);
  const scored = scenario.score !== null && scenario.score !== undefined;

  return {
    type: 'Match Scenario Prediction',
    scenario: scenario.scenarioLabel,
    scenarioLabel: scenario.scenarioLabel,
    scenarioScore: scenario.score,
    score: scenario.score,
    rawScenarioFit: scenario.score,
    likelyRange: scenario.likelyRange,
    risk: scenario.risk,
    recommendation: scenario.recommendation || scenario.noScoreReason || 'Review the selected scenario against the assessed player profile.',
    confidence,
    evidence: scenario.evidence || [],
    predictedBehaviour: scored
      ? `${playerName(player)} projects into the ${scenario.likelyRange.minimum}-${scenario.likelyRange.maximum}/100 band for this repeated tactical demand, with the profile score centred at ${scenario.score}/100.`
      : scenario.noScoreReason || 'Choose a compatible scenario to generate the tactical projection.',
    tacticalNote: scored
      ? 'Use the strongest scenario attributes as the expected behaviours and verify the lowest-rated demand when the same pressure repeats in live play.'
      : 'Choose a compatible scenario before using the tactical output.',
    selectionGuidance: [
      { title: 'Use the likely range', note: 'The point score is the centre of a profile-led range, not a guarantee.' },
      { title: 'Test the weakest demand', note: 'The lowest important scenario attribute is the priority live check.' },
      { title: 'Verify repeatability', note: 'Repeated behaviour under the same tactical pressure is more useful than one isolated action.' }
    ],
    liveProof: [
      'Decision speed when the selected tactical pressure repeats.',
      'Movement and positioning immediately after the first action.',
      'Whether the strongest assessed qualities remain available under fatigue or pressure.'
    ],
    paragraphs: [],
    summary: '',
    scenarios: Object.entries(config.MATCH_SCENARIOS).map(([key, item]) => ({
      key,
      label: item.label,
      gk: Boolean(item.goalkeeperOnly)
    })),
    scenarioDetails: scenario,
    disclaimer: DISCLAIMER
  };
}

function positionFitResult(player, facts, input, context) {
  const target = input.targetPosition || input.position;
  const overall = calculateOverallRating(player, facts, context);
  const prediction = calculatePredictions(player, facts, { ...context, overallAnalysis: overall });
  const positionFit = calculatePositionFitPrediction(player, target, facts, {
    ...context,
    overallAnalysis: overall
  });
  const value = calculateValueAnalysis(player, facts, {
    ...context,
    overallAnalysis: overall,
    predictionAnalysis: prediction
  });
  const targetFuture = prediction.futurePositions?.find(item => item.position === positionFit.targetPosition);
  const targetRoles = Array.isArray(positionFit.roles) && positionFit.roles.length
    ? positionFit.roles
    : (prediction.roleFits || []).filter(item => !positionFit.targetPosition || item.position === positionFit.targetPosition);
  const topRoles = targetRoles.slice(0, 6).map(item => ({
    role: item.roleLabel,
    position: item.position,
    score: item.score,
    status: item.status
  }));
  const bestCurrentScore = overall.positionRatings?.bestCurrentScore ?? overall.overallRating;
  const targetScore = positionFit.score;
  const gap = targetScore === null || targetScore === undefined
    ? null
    : utils.round(targetScore - Number(bestCurrentScore));
  const verdict = targetScore === null || targetScore === undefined
    ? 'Target position required'
    : gap >= -2
      ? 'Natural or near-natural fit'
      : gap >= -8
        ? 'Convertible with a managed development plan'
        : 'High-friction conversion';
  const priorities = (overall.developmentPriorities || []).slice(0, 3).map(item => item.label || item.key);

  return {
    type: 'Position Fit Projection',
    targetPosition: positionFit.targetPosition,
    targetVerdict: verdict,
    bestCurrentPosition: overall.bestCurrentPosition,
    bestCurrentScore,
    bestFuturePosition: prediction.bestProjectedFuturePosition,
    bestFutureScore: prediction.futurePositions?.[0]?.projectedRating ?? prediction.potentialOverall,
    targetScore,
    targetGapVsBest: gap,
    targetLikelyRange: positionFit.likelyRange || null,
    positionRatings: overall.positionRatings?.ratings || {},
    topRoles,
    conversionCandidates: prediction.conversionCandidates || [],
    overallBreakdown: overall,
    valueAnalysis: value,
    confidence: confidenceShape(prediction.evidenceConfidence, prediction.predictionConfidence),
    recommendation: targetScore === null || targetScore === undefined
      ? positionFit.noScoreReason || 'Choose a target position to generate the conversion review.'
      : verdict === 'Natural or near-natural fit'
        ? 'The assessed profile transfers well into the target position; validate the top role behaviours through live observation.'
        : priorities.length
          ? `A managed conversion should prioritise ${humanList(priorities)} while the player is tested in the target role.`
          : 'Use a managed role trial and verify the target-role behaviours live before a recruitment decision.',
    liveProof: [
      `Receiving and decision-making in the spaces demanded by ${positionFit.targetPosition || 'the target position'}.`,
      'Off-ball positioning before, during and immediately after turnovers.',
      'Whether the target-role strengths remain repeatable when pressure and tempo increase.'
    ],
    paragraphs: [],
    summary: '',
    positionFitDetails: positionFit,
    projectedTargetPosition: targetFuture || null,
    predictionDetails: prediction,
    disclaimer: DISCLAIMER
  };
}

function buildResult(type, player, facts, input, context) {
  if (type === 'Attribute Development') return attributeDevelopmentResult(player, facts, input, context);
  if (type === 'ROI Analysis') return roiResult(player, facts, input, context);
  if (type === 'Match Scenario Prediction') return scenarioResult(player, facts, input, context);
  if (type === 'Position Fit Projection') return positionFitResult(player, facts, input, context);

  const prediction = calculatePredictions(player, facts, context);
  return {
    type,
    overallRating: prediction.currentOverall,
    predictionScore: prediction.potentialOverall,
    confidence: confidenceShape(prediction.evidenceConfidence, prediction.predictionConfidence),
    message: 'This prediction type uses the ScoutLink profile-first development output.',
    predictionDetails: prediction,
    summary: '',
    paragraphs: [],
    disclaimer: DISCLAIMER
  };
}

function attributeDataSummary(player, result, facts) {
  const signals = profileSignals(player);
  const strengths = humanList(signals.strengths.slice(0, 3).map(item => item.label));
  const priorities = humanList((result.predictionDetails?.developmentPriorities || []).slice(0, 3).map(item => item.label || item.key));
  const range = result.likelyRange || {};
  const change = Number(result.potentialOverall) - Number(result.currentOverall);
  const movement = (result.attributeEffects || []).filter(item => Number(item.deltaFiveYear) > 0).slice(0, 3);
  const movementText = humanList(movement.map(item => `${item.attribute} (+${item.deltaFiveYear})`));

  return `${playerName(player)} is assessed at ${result.currentOverall}/100 today and projects to ${result.potentialOverall}/100, a ${change >= 0 ? '+' : ''}${utils.round(change)} point profile-led development movement with a likely range of ${range.minimum}-${range.maximum}. The ${result.focus || 'selected development'} plan is supported most clearly by ${strengths || 'the strongest assessed qualities'}, while ${priorities || 'the lowest high-importance attributes'} provide the main development headroom. The largest modelled five-season movements are ${movementText || 'concentrated in the selected plan priorities'}, which is why the outlook is classified as ${String(result.trajectory || 'profile-led stable').toLowerCase()}. ${matchCalibrationSentence(facts, result.predictionDetails)} For recruitment, the point estimate should be read alongside the range: the key question is whether the priority behaviours improve without reducing the qualities that already make the player effective in the current role.`;
}

function positionDataSummary(player, result, facts) {
  const signals = profileSignals(player);
  const strengths = humanList(signals.strengths.slice(0, 3).map(item => item.label));
  const roles = humanList((result.topRoles || []).slice(0, 3).map(item => `${item.role} (${utils.round(item.score)}/100)`));
  const gapText = result.targetGapVsBest == null
    ? 'the target gap is not applicable'
    : `${result.targetGapVsBest > 0 ? '+' : ''}${result.targetGapVsBest} points versus the best current position`;

  return `${playerName(player)} currently profiles strongest at ${result.bestCurrentPosition || 'the recorded primary position'} (${result.bestCurrentScore ?? '—'}/100), while the selected ${result.targetPosition || 'target position'} projects at ${result.targetScore ?? '—'}/100, leaving ${gapText}. That produces a ${String(result.targetVerdict || 'profile-led conversion review').toLowerCase()} verdict rather than a binary position label. The main transferable strengths are ${strengths || 'the highest-rated assessed attributes'}, and the strongest target-role interpretations are ${roles || 'derived from the target-position demands and the recorded profile'}. ${matchCalibrationSentence(facts, result.predictionDetails)} The recruitment decision should therefore focus on transferability: whether the player's existing qualities still solve the same football problems from the target spaces, and whether the most demanding off-ball, receiving and decision-making behaviours remain repeatable when the role changes.`;
}

function scenarioDataSummary(player, result, facts) {
  const evidence = (result.evidence || []).slice().sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const strongest = humanList(evidence.slice(0, 3).map(item => item.label || item.attribute || item.key));
  const weakest = evidence.length ? evidence[evidence.length - 1] : null;
  const range = result.likelyRange || {};

  return `${playerName(player)} scores ${result.scenarioScore ?? '—'}/100 for ${result.scenario || 'the selected match scenario'}, with a likely operating range of ${range.minimum ?? '—'}-${range.maximum ?? '—'} and a current risk label of ${String(result.risk || 'profile-led').toLowerCase()}. The profile is most strongly supported by ${strongest || 'the highest-rated scenario requirements'}, while ${weakest ? `${weakest.label || weakest.attribute || weakest.key} at ${utils.round(weakest.score)}/100` : 'the lowest scenario demand'} is the clearest pressure point to test. The expected behaviour is therefore shaped by the interaction of those strengths rather than by one headline statistic. ${matchCalibrationSentence(facts, result.scenarioDetails)} For recruitment, the live check is repeatability: observe the player when the same tactical demand occurs several times, especially after transitions or mistakes, and confirm that the stronger assessed qualities remain available when the weakest requirement is stressed.`;
}

function roiDataSummary(player, result, facts) {
  const value = result.valueAnalysis || {};
  const current = result.currentTransferValue || {};
  const last = (result.projection || [])[result.projection?.length - 1] || {};
  const drivers = humanList((result.valueDrivers || []).slice(0, 3).map(driver => driver.label || driver.title || driver.key));
  const anchored = value.currencyEstimateStatus === 'Anchored estimate';
  const prediction = result.predictionDetails || {};
  const financialSentence = anchored
    ? `Verified market anchors are present, so the displayed currency and ROI scenario can be reviewed alongside its stated assumptions; those figures remain scenario outputs rather than guaranteed future proceeds.`
    : 'No verified market anchor is present, so ScoutLink deliberately keeps this as an index-led football value outlook and does not invent a transfer fee or ROI.';

  return `${playerName(player)} currently carries a Football Value Index of ${current.footballValueIndex ?? value.footballValueIndex ?? '—'}/100, with the modelled outlook reaching ${last.footballValueIndex ?? '—'}/100 by the final displayed season. The index is being driven primarily by ${drivers || 'current football ability, development trajectory and evidence quality'}, and should be read together with the ${prediction.currentOverall ?? '—'} to ${prediction.potentialOverall ?? '—'} overall development pathway rather than as a standalone price signal. ${matchCalibrationSentence(facts, prediction)} ${financialSentence} For recruitment, the useful question is whether the player's football trajectory and role value justify continued scouting or development investment under the organisation's own verified cost assumptions, while the Football Value Index remains the consistent comparison measure across players.`;
}

function buildDataSummary(type, player, result, facts) {
  if (type === 'Attribute Development') return attributeDataSummary(player, result, facts);
  if (type === 'Position Fit Projection') return positionDataSummary(player, result, facts);
  if (type === 'Match Scenario Prediction') return scenarioDataSummary(player, result, facts);
  if (type === 'ROI Analysis') return roiDataSummary(player, result, facts);

  const prediction = result.predictionDetails || {};
  return `${playerName(player)} has a current ScoutLink assessment of ${prediction.currentOverall ?? result.overallRating ?? '—'}/100 and a profile-led projection of ${prediction.potentialOverall ?? result.predictionScore ?? '—'}/100. The assessed football attributes remain the baseline evidence for the result, while recorded matches strengthen calibration and help tighten the likely range. Use the result as decision support alongside live observation and the specific role demands of the recruitment context.`;
}

function applyDataNarrative(type, player, result, facts) {
  result.summary = buildDataSummary(type, player, result, facts);
  result.paragraphs = [];
  result.analysisMode = 'data';
  result.summarySource = 'ScoutLink data model';
  result.usageCredits = DATA_ONLY_CREDIT_COST;
  return result;
}

function sanitisedAttributes(player = {}) {
  const group = utils.getPositionGroup(player);
  const ratings = utils.collectRatings(player, utils.attributesForGroup(group));
  return Object.entries(ratings)
    .filter(([, score]) => utils.isObservedScore(score))
    .map(([key, score]) => ({
      key,
      label: config.ATTRIBUTE_DEFINITIONS[key]?.label || key,
      score: utils.round(score)
    }));
}

function sanitisedMatchContext(facts = []) {
  const rows = (Array.isArray(facts) ? facts : []).slice(0, 10).map(fact => {
    const score = optionalNumber(fact.performance_score ?? fact.performanceScore);
    return {
      performanceScore: score,
      minutes: optionalNumber(fact.minutes_played ?? fact.minutesPlayed),
      goals: optionalNumber(fact.goals ?? fact.goals_scored) || 0,
      assists: optionalNumber(fact.assists) || 0,
      positionPlayed: cleanText(fact.position_played || fact.positionPlayed || fact.match_position, 20) || null,
      confirmed: fact.confirmed !== false
    };
  });

  return {
    recordedMatches: Array.isArray(facts) ? facts.length : 0,
    recent: rows
  };
}

function resultSnapshotForAi(result = {}) {
  const common = {
    type: result.type,
    dataSummary: result.summary,
    recommendation: result.recommendation,
    confidence: result.confidence
  };

  if (result.type === 'Attribute Development') {
    return {
      ...common,
      currentOverall: result.currentOverall,
      projectedOverall: result.potentialOverall,
      likelyRange: result.likelyRange,
      trajectory: result.trajectory,
      focus: result.focus,
      seasons: result.seasons,
      attributeEffects: result.attributeEffects,
      developmentPriorities: result.predictionDetails?.developmentPriorities,
      tradeOffs: result.tradeOffs
    };
  }
  if (result.type === 'Position Fit Projection') {
    return {
      ...common,
      bestCurrentPosition: result.bestCurrentPosition,
      bestCurrentScore: result.bestCurrentScore,
      targetPosition: result.targetPosition,
      targetScore: result.targetScore,
      targetGapVsBest: result.targetGapVsBest,
      targetVerdict: result.targetVerdict,
      targetLikelyRange: result.targetLikelyRange,
      topRoles: result.topRoles,
      positionRatings: result.positionRatings,
      conversionCandidates: result.conversionCandidates
    };
  }
  if (result.type === 'Match Scenario Prediction') {
    return {
      ...common,
      scenario: result.scenario,
      scenarioScore: result.scenarioScore,
      likelyRange: result.likelyRange,
      risk: result.risk,
      evidence: result.evidence,
      predictedBehaviour: result.predictedBehaviour,
      tacticalNote: result.tacticalNote
    };
  }
  if (result.type === 'ROI Analysis') {
    return {
      ...common,
      footballValue: result.currentTransferValue,
      projection: result.projection,
      suitability: result.suitability,
      assumptions: result.assumptions,
      valueDrivers: result.valueDrivers,
      currencyEstimateStatus: result.valueAnalysis?.currencyEstimateStatus,
      overallDevelopment: {
        currentOverall: result.predictionDetails?.currentOverall,
        potentialOverall: result.predictionDetails?.potentialOverall,
        likelyRange: result.predictionDetails?.likelyRange
      }
    };
  }
  return common;
}

function buildAiPayload(type, player, facts, input, result, scoutTeam) {
  return {
    predictionType: type,
    playerProfile: {
      ageGroup: player.age_group || player.ageGroup || null,
      positionGroup: player.position_group || player.positionGroup || null,
      primaryPosition: player.primary_position || player.primaryPosition || player.specific_position || null,
      alternativePositions: Array.isArray(player.positions) ? player.positions.slice(0, 8) : [],
      preferredFoot: player.preferred_foot || player.foot || null,
      appearances: optionalNumber(player.appearances),
      attributes: sanitisedAttributes(player)
    },
    matchContext: sanitisedMatchContext(facts),
    predictionInput: {
      focus: cleanText(input.focus || input.developmentPlan, 100) || null,
      targetPosition: cleanText(input.targetPosition || input.position, 30) || null,
      targetRole: cleanText(input.targetRole, 100) || null,
      scenario: cleanText(input.scenarioKey || input.scenario, 100) || null,
      financialGoal: cleanText(input.financialGoal || input.goal, 200) || null
    },
    recruitmentContext: {
      formation: scoutTeam?.formation || null,
      playingStyle: scoutTeam?.playing_style || null,
      roleExpectations: Array.isArray(scoutTeam?.role_expectations) ? scoutTeam.role_expectations.slice(0, 8) : [],
      longTermGoals: Array.isArray(scoutTeam?.long_term_goals) ? scoutTeam.long_term_goals.slice(0, 8) : []
    },
    scoutLinkResult: resultSnapshotForAi(result)
  };
}

function normalisedLookup(value) {
  return cleanText(value, 200).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function narrativeFor(items, key, value) {
  const wanted = normalisedLookup(value);
  if (!wanted) return null;
  const exact = (items || []).find(item => normalisedLookup(item?.[key]) === wanted);
  if (exact) return exact.explanation;
  const close = (items || []).find(item => {
    const candidate = normalisedLookup(item?.[key]);
    return candidate && (candidate.includes(wanted) || wanted.includes(candidate));
  });
  return close?.explanation || null;
}

function applyAiAnalysis(result, aiResponse) {
  const analysis = aiResponse.analysis;
  result.summary = cleanText(analysis.summary, 1900);
  result.recommendation = cleanText(analysis.recruitmentImplication, 1000);
  result.paragraphs = [];
  result.analysisMode = 'ai';
  result.summarySource = 'ScoutLink + OpenAI analysis';
  result.usageCredits = AI_CREDIT_COST;
  result.aiStatus = 'enhanced';
  result.aiAnalysis = {
    model: aiResponse.model,
    responseId: aiResponse.responseId,
    keyDrivers: analysis.keyDrivers,
    risks: analysis.risks,
    liveChecks: analysis.liveChecks,
    roleProjection: analysis.roleProjection,
    valueOutlook: analysis.valueOutlook,
    usage: aiResponse.usage || null
  };

  if (result.type === 'Attribute Development') {
    result.attributeEffects = (result.attributeEffects || []).map(effect => {
      const explanation = narrativeFor(analysis.attributeNarratives, 'attribute', effect.attribute);
      return explanation ? { ...effect, reason: explanation, explanation } : effect;
    });
    result.attributeEffectsByKey = (result.attributeEffects || []).reduce((mapped, effect) => {
      mapped[effect.key] = effect;
      return mapped;
    }, {});
    result.liveProof = analysis.liveChecks;
  }

  if (result.type === 'Position Fit Projection') {
    result.topRoles = (result.topRoles || []).map(role => {
      const explanation = narrativeFor(analysis.roleNarratives, 'role', role.role);
      return explanation
        ? { ...role, status: `${role.status || 'Profile projection'}. ${explanation}`, aiExplanation: explanation }
        : role;
    });
    result.roleProjection = analysis.roleProjection;
    result.liveProof = analysis.liveChecks;
  }

  if (result.type === 'Match Scenario Prediction') {
    if (analysis.predictedBehaviour) result.predictedBehaviour = analysis.predictedBehaviour;
    if (analysis.tacticalNote) result.tacticalNote = analysis.tacticalNote;
    result.liveProof = analysis.liveChecks;
  }

  if (result.type === 'ROI Analysis') {
    result.valueDrivers = (result.valueDrivers || []).map(driver => {
      const label = driver.label || driver.title || driver.key;
      const explanation = narrativeFor(analysis.valueDriverNarratives, 'driver', label);
      return explanation ? { ...driver, explanation, note: explanation } : driver;
    });
    result.aiValueOutlook = analysis.valueOutlook;
  }

  return result;
}

function aiFallbackMessage(reason) {
  if (reason === 'credits') {
    return 'AI enhanced prediction needs 8 prediction credits. ScoutLink returned the full data-only prediction and charged 1 credit instead.';
  }
  return 'AI enhancement was unavailable for this run. ScoutLink returned the full data-only prediction and charged only the normal 1 credit.';
}

async function addAiPremiumUsage(scout, logId, type, aiResponse) {
  const { error } = await supabase.from('scout_usage_events').insert({
    scout_id: scout.id,
    scout_team_id: scout.scout_team_id || null,
    event_type: 'prediction_ai_premium',
    quantity: AI_PREMIUM_CREDIT_COST,
    metadata: {
      prediction_log_id: logId,
      prediction_type: type,
      model: aiResponse.model,
      openai_response_id: aiResponse.responseId || null,
      input_tokens: aiResponse.usage?.input_tokens ?? null,
      output_tokens: aiResponse.usage?.output_tokens ?? null,
      total_tokens: aiResponse.usage?.total_tokens ?? null
    }
  });
  if (error) throw error;
}

router.get('/scenarios', requireAuth, requireRole('Scout'), (req, res) => {
  res.json({
    data: Object.entries(config.MATCH_SCENARIOS).map(([key, scenario]) => ({
      key,
      label: scenario.label,
      gk: Boolean(scenario.goalkeeperOnly)
    }))
  });
});

router.post('/run', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { playerId, predictionType, inputParams } = req.body;
    const requestedAnalysisMode = String(req.body.analysisMode || 'data').toLowerCase() === 'ai' ? 'ai' : 'data';

    if (!playerId || !predictionType) {
      return res.status(400).json({ error: 'playerId and predictionType required' });
    }

    const scout = await loadScout(req.user.id);
    const scoutTeam = await loadScoutTeam(scout);
    const usageBefore = await getScoutUsageSnapshot({ scout, team: scoutTeam || {} });
    const remaining = Number(usageBefore.predictions.remaining || 0);

    if (remaining < DATA_ONLY_CREDIT_COST) {
      return res.status(402).json({
        error: 'You have reached your prediction cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.',
        creditsRemaining: 0,
        planLimit: usageBefore.predictions.limit,
        dataOnlyCost: DATA_ONLY_CREDIT_COST,
        aiCost: AI_CREDIT_COST
      });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    if (playerError || !player) return res.status(404).json({ error: 'Player not found' });

    const { data: facts, error: factsError } = await supabase
      .from('match_facts')
      .select('*')
      .eq('player_id', playerId)
      .order('match_date', { ascending: false })
      .limit(30);
    if (factsError) throw factsError;

    const input = inputParams || {};
    const type = canonicalType(predictionType);
    const context = {
      scout,
      scoutTeam,
      team: scoutTeam,
      observations: [],
      ...trustedFinancialContext(scoutTeam, input)
    };

    let result = buildResult(type, player, facts || [], input, context);
    result = applyDataNarrative(type, player, result, facts || []);

    let aiResponse = null;
    let aiFallback = null;
    let creditCost = DATA_ONLY_CREDIT_COST;

    if (requestedAnalysisMode === 'ai') {
      if (remaining < AI_CREDIT_COST) {
        aiFallback = 'credits';
      } else {
        try {
          aiResponse = await analysePredictionWithAi(
            buildAiPayload(type, player, facts || [], input, result, scoutTeam)
          );
          result = applyAiAnalysis(result, aiResponse);
          creditCost = AI_CREDIT_COST;
        } catch (aiError) {
          console.warn('[Predictions AI fallback]', {
            code: aiError.code || null,
            status: aiError.status || null,
            message: aiError.message
          });
          aiFallback = aiError.code || 'ai_unavailable';
        }
      }
    }

    if (requestedAnalysisMode === 'ai' && !aiResponse) {
      result.analysisMode = 'data_fallback';
      result.requestedAnalysisMode = 'ai';
      result.aiStatus = 'fallback';
      result.aiFallbackReason = aiFallbackMessage(aiFallback);
      result.usageCredits = DATA_ONLY_CREDIT_COST;
    } else {
      result.requestedAnalysisMode = requestedAnalysisMode;
    }

    const logInput = {
      ...input,
      analysisModeRequested: requestedAnalysisMode,
      analysisModeUsed: result.analysisMode,
      usageCredits: creditCost
    };

    const { data: log, error: logError } = await supabase.from('predictions_log').insert({
      scout_id: req.user.id,
      scout_team_id: scout.scout_team_id || null,
      player_id: playerId,
      prediction_type: type,
      input_params: logInput,
      result,
      run_at: new Date().toISOString()
    }).select().single();
    if (logError) throw logError;

    if (creditCost === AI_CREDIT_COST) {
      try {
        await addAiPremiumUsage(scout, log.id, type, aiResponse);
      } catch (premiumError) {
        // Best-effort rollback prevents a successful eight-credit AI result
        // from being stored as a one-credit prediction if ledger persistence
        // fails.
        await supabase.from('predictions_log').delete().eq('id', log.id);
        throw premiumError;
      }
    }

    const creditsRemaining = Math.max(0, remaining - creditCost);
    try {
      await updateRemaining(scout, creditsRemaining);
    } catch (remainingError) {
      // predictions_log + the premium usage ledger are authoritative. The
      // legacy predictions_remaining mirror must never turn a successful run
      // into a retryable 500 response and accidentally double-consume usage.
      console.warn('[Predictions remaining mirror]', remainingError.message);
    }

    return res.json({
      result,
      logId: log?.id || null,
      analysisMode: result.analysisMode,
      requestedAnalysisMode,
      creditCost,
      creditsRemaining,
      planLimit: usageBefore.predictions.limit,
      teamUsed: usageBefore.predictions.used + creditCost,
      aiCost: AI_CREDIT_COST,
      dataOnlyCost: DATA_ONLY_CREDIT_COST,
      aiFallback: requestedAnalysisMode === 'ai' && !aiResponse
    });
  } catch (error) {
    console.error('[Predictions run]', error);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

router.get('/', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const scout = await loadScout(req.user.id);
    const scoutTeam = await loadScoutTeam(scout);
    const usage = await getScoutUsageSnapshot({ scout, team: scoutTeam || {} });
    const { data: logs, error } = await supabase.from('predictions_log')
      .select('id, player_id, prediction_type, input_params, result, run_at, players(id,first_name,last_name,team_name,position_group,primary_position,specific_position,overall_rating,age_group)')
      .eq('scout_id', req.user.id)
      .order('run_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    return res.json({
      data: logs || [],
      remaining: usage.predictions.remaining,
      planLimit: usage.predictions.limit,
      teamUsed: usage.predictions.used,
      plan: usage.plan,
      costs: {
        dataOnly: DATA_ONLY_CREDIT_COST,
        aiEnhanced: AI_CREDIT_COST
      }
    });
  } catch (error) {
    console.error('[Predictions list]', error);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
module.exports.buildResult = buildResult;
module.exports.canonicalType = canonicalType;
module.exports.buildDataSummary = buildDataSummary;
module.exports.applyAiAnalysis = applyAiAnalysis;
module.exports.DATA_ONLY_CREDIT_COST = DATA_ONLY_CREDIT_COST;
module.exports.AI_CREDIT_COST = AI_CREDIT_COST;
