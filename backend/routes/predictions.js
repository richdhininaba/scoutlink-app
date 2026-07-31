'use strict';

/**
 * Target path: backend/routes/predictions.js
 * Full replacement route using scoring v4 while preserving ScoutLink's auth,
 * usage limits, prediction history and frontend response wrapper.
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
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');

const DISCLAIMER = 'ScoutLink predictions are bounded decision-support estimates based on age-group, position/role assessment and contextual evidence. They are not guarantees, financial advice, or estimates of biological maturation.';

function confidenceShape(evidence = {}, predictionConfidence = null) {
  const score = predictionConfidence?.score ?? evidence.score ?? 0;
  const label = predictionConfidence?.label || evidence.label || 'Insufficient';
  return {
    score,
    label,
    note: (evidence.warnings || [])[0] || 'Evidence confidence changes the likely range, not the underlying football score.'
  };
}

function playerName(player = {}) {
  return [player.first_name, player.last_name].filter(Boolean).join(' ') || 'This player';
}

async function planLimitForScout(scout) {
  if (scout.scout_team_id) {
    const { data: team } = await supabase
      .from('scout_teams')
      .select('subscription_plan,limit_overrides')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (team) {
      return effectiveLimits(
        team.subscription_plan || scout.subscription_plan || 'Core',
        team.limit_overrides || {}
      ).predictions;
    }
  }
  return limitsForPlan(scout.subscription_plan || 'Core').predictions;
}

async function loadScout(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('id,scout_team_id,subscription_plan,predictions_remaining,scout_preferences')
    .eq('id', userId)
    .single();
  if (error || !scout) {
    const failure = new Error('Scout not found');
    failure.status = 404;
    throw failure;
  }
  return scout;
}

async function countTeamPredictions(scout) {
  let query = supabase.from('predictions_log').select('id', { count: 'exact', head: true });
  query = scout.scout_team_id
    ? query.eq('scout_team_id', scout.scout_team_id)
    : query.eq('scout_id', scout.id);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function updateRemaining(scout, remaining) {
  if (scout.scout_team_id) {
    await supabase.from('scouts').update({ predictions_remaining: remaining }).eq('scout_team_id', scout.scout_team_id);
  } else {
    await supabase.from('scouts').update({ predictions_remaining: remaining }).eq('id', scout.id);
  }
}

async function loadScoutTeam(scout) {
  if (!scout.scout_team_id) return null;
  const { data, error } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
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

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  const finalAttributes = attributeBySeason[attributeBySeason.length - 1]?.projectedAttributes || {};
  const attributeEffectsByKey = Object.entries(finalAttributes).reduce((mapped, [key, projected]) => {
    mapped[key] = {
      attribute: config.ATTRIBUTE_DEFINITIONS[key]?.label || key,
      deltaFiveYear: utils.round((projected - Number(currentRatings[key])) / 10),
      reason: (prediction.attributeDevelopment?.projections?.[4]?.leadingImprovements || []).some(item => item.key === key)
        ? 'Priority or leading gain in the selected bounded development scenario.'
        : 'Supported growth is slower outside the plan priorities; no automatic decline is assumed.'
    };
    return mapped;
  }, {});
  const confidence = confidenceShape(prediction.evidenceConfidence, prediction.predictionConfidence);
  return {
    type: 'Attribute Development',
    focus: prediction.developmentPlan?.label,
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
    attributeEffects: Object.values(attributeEffectsByKey),
    tradeOffs: prediction.expectedTradeOffs,
    generatedAttributes: {},
    visualisation: {
      labels: seasons.map(item => `Year ${item.year}`),
      overall: seasons.map(item => item.overall),
      footballValueIndex: seasons.map(item => item.footballValueIndex),
      transferValue: seasons.map(item => item.transferValue)
    },
    paragraphs: [
      `${playerName(player)} has a current overall of ${prediction.currentOverall}/100 and a bounded potential estimate of ${prediction.potentialOverall}/100 (${prediction.likelyRange.minimum}-${prediction.likelyRange.maximum}).`,
      'The season values are coaching scenarios. Age group controls the horizon and uncertainty; it does not award automatic growth points.'
    ],
    summary: `${prediction.developmentPlan?.label || 'Development'} produces a ${prediction.trajectory.toLowerCase()} outlook for ${playerName(player)}.`,
    predictionDetails: prediction,
    valueAnalysis: value,
    disclaimer: DISCLAIMER
  };
}

function roiResult(player, facts, input, context) {
  const overall = calculateOverallRating(player, facts, context);
  const prediction = calculatePredictions(player, facts, { ...context, overallAnalysis: overall, developmentPlan: developmentPlanKey(input) });
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
    currentTransferValue: { value: value.value, formatted: value.valueFormatted, footballValueIndex: value.footballValueIndex },
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
    suitability: anchored && value.roiProjection?.roi !== null ? 'Anchored scenario available' : 'Not assessed — verified financial anchors required',
    confidence: confidenceShape(value.valueConfidence || value.evidenceConfidence, prediction.predictionConfidence),
    recommendation: anchored
      ? 'Review the anchored range, assumptions and governing rules before any financial decision.'
      : 'Use the football value index for prioritisation. Do not display a fee or ROI until verified market anchors are supplied by an authorised source.',
    valueDrivers: value.valueDrivers.map(driver => ({ ...driver, value: `${driver.score}/100` })),
    risks: value.warnings.map(warning => ({ label: 'Model limitation', level: value.riskLabel, note: warning })),
    paragraphs: [value.explanation, value.warnings[0]],
    summary: anchored
      ? `Anchored financial scenario for ${playerName(player)}.`
      : `${playerName(player)} has a football value index of ${value.footballValueIndex}/100; no currency valuation was created.`,
    visualisation: {
      labels: ['Current', ...projection.map(item => item.horizon)],
      values: [value.value, ...projection.map(item => item.projectedValue)],
      footballValueIndex: [value.footballValueIndex, ...projection.map(item => item.footballValueIndex)]
    },
    valueAnalysis: value,
    disclaimer: `${DISCLAIMER} Currency and ROI require verified market anchors and regulatory checks.`
  };
}

function scenarioResult(player, facts, input, context) {
  const scenario = calculateScenarioPrediction(player, input.scenarioKey || input.scenario, facts, context);
  const confidence = confidenceShape(scenario.evidenceConfidence);
  return {
    type: 'Match Scenario Prediction',
    scenario: scenario.scenarioLabel,
    scenarioScore: scenario.score,
    rawScenarioFit: scenario.score,
    likelyRange: scenario.likelyRange,
    risk: scenario.risk,
    recommendation: scenario.recommendation,
    confidence,
    evidence: scenario.evidence || [],
    predictedBehaviour: scenario.score === null
      ? scenario.noScoreReason || 'The scenario cannot be assessed from the current evidence.'
      : `${playerName(player)} is projected within ${scenario.likelyRange.minimum}-${scenario.likelyRange.maximum}/100 for this repeated tactical demand.`,
    tacticalNote: 'Verify decision speed, off-ball response and repeatability through live observation in the same role context.',
    selectionGuidance: [
      { title: 'Use the likely range', note: 'Select from the conservative end when evidence is provisional.' },
      { title: 'Protect the weakest demand', note: 'Do not make one low role requirement the only route to success.' },
      { title: 'Verify repeated behaviour', note: 'One successful action is not evidence of repeatability.' }
    ],
    liveProof: ['Decision speed under realistic pressure.', 'Movement after the first action.', 'Consistency when the tactical demand repeats.'],
    paragraphs: [scenario.recommendation || scenario.noScoreReason, 'The score uses a lower-order mean so a serious scenario weakness cannot be hidden by unrelated strengths.'],
    summary: scenario.score === null ? 'Insufficient evidence for this scenario.' : `${scenario.scenarioLabel}: ${scenario.score}/100 central scenario fit.`,
    scenarios: Object.entries(config.MATCH_SCENARIOS).map(([key, item]) => ({ key, label: item.label, gk: Boolean(item.goalkeeperOnly) })),
    scenarioDetails: scenario,
    disclaimer: DISCLAIMER
  };
}

function positionFitResult(player, facts, input, context) {
  const target = input.targetPosition || input.position;
  const overall = calculateOverallRating(player, facts, context);
  const prediction = calculatePredictions(player, facts, { ...context, overallAnalysis: overall });
  const positionFit = calculatePositionFitPrediction(player, target, facts, context);
  const value = calculateValueAnalysis(player, facts, { ...context, overallAnalysis: overall, predictionAnalysis: prediction });
  const targetFuture = prediction.futurePositions?.find(item => item.position === positionFit.targetPosition);
  const topRoles = (prediction.roleFits || [])
    .filter(item => !positionFit.targetPosition || item.position === positionFit.targetPosition)
    .slice(0, 6)
    .map(item => ({ role: item.roleLabel, position: item.position, score: item.score, status: item.status }));
  const bestCurrentScore = overall.positionRatings?.bestCurrentScore ?? overall.overallRating;
  const targetScore = positionFit.score;
  const gap = targetScore === null || targetScore === undefined ? null : utils.round(targetScore - Number(bestCurrentScore));
  const verdict = positionFit.status === 'Insufficient evidence'
    ? 'Insufficient evidence'
    : gap >= -2 ? 'Natural or near-natural fit' : gap >= -8 ? 'Convertible with a managed development plan' : 'High-friction conversion';
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
    positionRatings: overall.positionRatings?.ratings || {},
    topRoles,
    conversionCandidates: prediction.conversionCandidates || [],
    overallBreakdown: overall,
    valueAnalysis: value,
    confidence: confidenceShape(prediction.evidenceConfidence, prediction.predictionConfidence),
    recommendation: positionFit.noScoreReason || (verdict === 'Natural or near-natural fit'
      ? 'Validate the role through live observation.'
      : 'Use a managed role trial and collect the missing role evidence before recruitment.'),
    paragraphs: [
      `${playerName(player)}'s strongest current position is ${overall.bestCurrentPosition || 'not established'} at ${bestCurrentScore ?? '—'}/100.`,
      positionFit.noScoreReason || `The selected ${positionFit.targetPosition} fit is ${targetScore}/100 and is classified as ${verdict.toLowerCase()}.`
    ],
    summary: positionFit.noScoreReason || `Position fit for ${playerName(player)}: ${positionFit.targetPosition} is ${verdict.toLowerCase()}.`,
    positionFitDetails: positionFit,
    projectedTargetPosition: targetFuture || null,
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
    message: 'This prediction type uses the bounded scoring v4 development output.',
    predictionDetails: prediction,
    disclaimer: DISCLAIMER
  };
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
    if (!playerId || !predictionType) return res.status(400).json({ error: 'playerId and predictionType required' });

    const scout = await loadScout(req.user.id);
    const limit = await planLimitForScout(scout);
    const used = await countTeamPredictions(scout);
    const remaining = Math.max(0, limit - used);
    if (remaining <= 0) {
      return res.status(402).json({
        error: 'You have reached your prediction cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.',
        creditsRemaining: 0,
        planLimit: limit
      });
    }

    const { data: player, error: playerError } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (playerError || !player) return res.status(404).json({ error: 'Player not found' });
    const { data: facts, error: factsError } = await supabase
      .from('match_facts')
      .select('*')
      .eq('player_id', playerId)
      .order('match_date', { ascending: false })
      .limit(30);
    if (factsError) throw factsError;

    const scoutTeam = await loadScoutTeam(scout);
    const input = inputParams || {};
    const type = canonicalType(predictionType);
    const context = {
      scout,
      scoutTeam,
      team: scoutTeam,
      observations: [],
      ...trustedFinancialContext(scoutTeam, input)
    };
    const result = buildResult(type, player, facts || [], input, context);

    const { data: log, error: logError } = await supabase.from('predictions_log').insert({
      scout_id: req.user.id,
      scout_team_id: scout.scout_team_id || null,
      player_id: playerId,
      prediction_type: type,
      input_params: input,
      result,
      run_at: new Date().toISOString()
    }).select().single();
    if (logError) throw logError;

    const remainingAfter = Math.max(0, remaining - 1);
    await updateRemaining(scout, remainingAfter);
    return res.json({ result, logId: log?.id || null, creditsRemaining: remainingAfter, planLimit: limit, teamUsed: used + 1 });
  } catch (error) {
    console.error('[Predictions run]', error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
  }
});

router.get('/', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const scout = await loadScout(req.user.id);
    const plan = scout.subscription_plan || 'Core';
    const planLimit = await planLimitForScout(scout);
    const teamUsed = await countTeamPredictions(scout);
    const { data: logs, error } = await supabase.from('predictions_log')
      .select('id, player_id, prediction_type, input_params, result, run_at, players(id,first_name,last_name,team_name,position_group,primary_position,specific_position,overall_rating,age_group)')
      .eq('scout_id', req.user.id)
      .order('run_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return res.json({ data: logs || [], remaining: Math.max(0, planLimit - teamUsed), planLimit, teamUsed, plan });
  } catch (error) {
    console.error('[Predictions list]', error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
  }
});

module.exports = router;
module.exports.buildResult = buildResult;
module.exports.canonicalType = canonicalType;
