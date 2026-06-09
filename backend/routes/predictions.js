'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { computeOverall, grassrootsTransferValue, calcAge, getPosGroup } = require('../engines/compatibility');

const DISCLAIMER = 'ScoutLink predictions are deterministic estimates based on coach ratings, match facts, physical profile and current player data. They are decision-support outputs, not guarantees.';
const PLAN_LIMITS = {
  Core: { predictions: 120 },
  Plus: { predictions: 600 },
  Elite: { predictions: 1200 },
  Enterprise: { predictions: 99999 }
};

const ATTRS = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
const GK_ATTRS = ['gk_diving','gk_handling','gk_kicking','gk_reflexes','gk_positioning','gk_distribution','gk_communication','gk_sweeping'];

const DEVELOPMENT_PLANS = {
  'Balanced Growth': {
    label: 'Balanced Growth',
    boosts: ATTRS,
    priorityBoost: 0.18,
    supportBoost: 0.08,
    drag: 0
  },
  'Technical Possession': {
    label: 'Technical Possession',
    boosts: ['passing','vision','composure','dribbling','crossing'],
    priorityBoost: 0.34,
    supportBoost: 0.08,
    drag: 0.03
  },
  'Athletic Transition': {
    label: 'Athletic Transition',
    boosts: ['pace','agility','stamina','strength','jumping'],
    priorityBoost: 0.31,
    supportBoost: 0.07,
    drag: 0.04
  },
  'Defensive Intelligence': {
    label: 'Defensive Intelligence',
    boosts: ['defending','tackling','positioning','composure','heading'],
    priorityBoost: 0.33,
    supportBoost: 0.07,
    drag: 0.03
  },
  'Final Third Output': {
    label: 'Final Third Output',
    boosts: ['shooting','positioning','dribbling','crossing','composure'],
    priorityBoost: 0.35,
    supportBoost: 0.06,
    drag: 0.04
  },
  'Goalkeeper Command': {
    label: 'Goalkeeper Command',
    boosts: GK_ATTRS,
    priorityBoost: 0.34,
    supportBoost: 0.08,
    drag: 0.02
  }
};

const MATCH_SCENARIOS = [
  { key:'protect_lead', label:'Protecting a one-goal lead under pressure', attrs:['defending','positioning','tackling','stamina','composure'], behaviour:'should prioritise defensive spacing, simple possession and low-risk clearances' },
  { key:'chasing_game', label:'Chasing the game with 15 minutes left', attrs:['shooting','vision','passing','dribbling','stamina'], behaviour:'should look for aggressive forward actions and quick combination play' },
  { key:'high_press', label:'High press against a possession team', attrs:['stamina','pace','defending','positioning','composure'], behaviour:'should contribute through repeat pressing, cover shadows and transition reactions' },
  { key:'low_block', label:'Breaking down a compact low block', attrs:['vision','passing','dribbling','crossing','composure'], behaviour:'should help create overloads and avoid forcing low-value actions' },
  { key:'wide_duel', label:'Repeated wide 1v1 duels', attrs:['pace','agility','dribbling','tackling','stamina'], behaviour:'should manage repeated isolation moments on either side of the ball' },
  { key:'aerial_battle', label:'Direct opponent with heavy aerial pressure', attrs:['jumping','heading','strength','positioning','composure'], behaviour:'should compete physically and protect second balls' },
  { key:'counter_attack', label:'Counter-attacking from deep', attrs:['pace','passing','dribbling','vision','stamina'], behaviour:'should accelerate attacks and choose progressive passes early' },
  { key:'build_back', label:'Building play from the back', attrs:['passing','vision','composure','positioning','defending'], behaviour:'should offer safe angles and progress play under pressure' },
  { key:'set_piece_attack', label:'Attacking set pieces late in the game', attrs:['heading','jumping','strength','positioning','composure'], behaviour:'should offer box threat and disciplined second-phase reactions' },
  { key:'set_piece_defence', label:'Defending set pieces against a taller team', attrs:['heading','jumping','strength','defending','positioning'], behaviour:'should maintain marking discipline and first-contact intensity' },
  { key:'fatigue_phase', label:'Managing a high-tempo final 20 minutes', attrs:['stamina','composure','passing','positioning','strength'], behaviour:'should maintain decision quality as physical load increases' },
  { key:'physical_midfield', label:'Playing through a physical midfield battle', attrs:['strength','stamina','composure','passing','tackling'], behaviour:'should survive contact and retain useful possession' },
  { key:'transition_defence', label:'Defending fast transitions after losing possession', attrs:['pace','stamina','defending','positioning','tackling'], behaviour:'should recover quickly and delay opponents' },
  { key:'creative_10', label:'Operating as the main creative outlet', attrs:['vision','passing','dribbling','composure','shooting'], behaviour:'should create chances while balancing risk' },
  { key:'striker_isolated', label:'Playing as an isolated striker', attrs:['strength','heading','shooting','positioning','composure'], behaviour:'should retain possession, attack crosses and finish limited chances' },
  { key:'gk_crosses', label:'Goalkeeper facing repeated crosses', gk:true, attrs:['gk_handling','gk_positioning','gk_communication','gk_reflexes','jumping'], behaviour:'should command the six-yard area and organise blockers' },
  { key:'gk_penalties', label:'Goalkeeper in a penalty shootout', gk:true, attrs:['gk_reflexes','gk_diving','composure','gk_positioning','gk_communication'], behaviour:'should stay composed and maximise reaction windows' },
  { key:'gk_sweeper', label:'Goalkeeper sweeping behind a high line', gk:true, attrs:['gk_sweeping','gk_positioning','pace','composure','gk_kicking'], behaviour:'should read depth early and clear danger outside the box' },
  { key:'gk_distribution', label:'Goalkeeper asked to start attacks short and long', gk:true, attrs:['gk_distribution','gk_kicking','gk_communication','composure','vision'], behaviour:'should vary distribution and avoid predictable restarts' },
  { key:'gk_shot_volume', label:'Goalkeeper facing high shot volume', gk:true, attrs:['gk_reflexes','gk_diving','gk_handling','stamina','composure'], behaviour:'should sustain concentration and manage rebounds' }
];

function planLimit(plan) {
  return (PLAN_LIMITS[plan] || PLAN_LIMITS.Core).predictions;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

function attr10(player, key) {
  const v = Number(player[key]);
  if (!Number.isFinite(v) || v <= 0) return 5;
  return v > 10 ? clamp(v / 10, 0, 10) : clamp(v, 0, 10);
}

function attr100(player, key) {
  return attr10(player, key) * 10;
}

function formatCurrency(value) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  return 'GBP ' + n.toLocaleString('en-GB');
}

function transferValue(player) {
  try {
    const tv = grassrootsTransferValue ? grassrootsTransferValue(player) : null;
    if (tv && typeof tv.value === 'number') return { value: tv.value, formatted: tv.valueFormatted || formatCurrency(tv.value) };
  } catch(e) {}
  const value = Number(player.transfer_value) || 0;
  return { value, formatted: formatCurrency(value) };
}

function dataConfidence(player, facts) {
  const matches = facts.length || Number(player.appearances) || 0;
  if (matches >= 10) return { score: 90, label: 'High', note: '10 or more recorded matches support this prediction.' };
  if (matches >= 5) return { score: 72, label: 'Medium', note: '5 to 9 recorded matches support an indicative prediction.' };
  if (matches >= 1) return { score: 48, label: 'Low', note: 'This is based on fewer than 5 recorded matches. Add more fixtures and match facts to improve confidence.' };
  return { score: 32, label: 'Very Low', note: 'No match facts are available yet. Treat the output as an early profile estimate.' };
}

function ageMultiplier(player) {
  const age = calcAge(player.date_of_birth) || Number(player.age) || 13;
  if (age <= 10) return 1.22;
  if (age <= 12) return 1.12;
  if (age <= 14) return 1.0;
  if (age <= 16) return 0.88;
  return 0.72;
}

function projectedValue(player, overall) {
  const next = { ...player, overall_rating: overall };
  return transferValue(next);
}

function attributeDevelopment(player, facts, inputParams = {}) {
  const requested = inputParams.focus || inputParams.trainingFocus || 'Balanced Growth';
  const plan = DEVELOPMENT_PLANS[requested] || DEVELOPMENT_PLANS['Balanced Growth'];
  const confidence = dataConfidence(player, facts);
  const ageFactor = ageMultiplier(player);
  const currentAttrs = {};
  const profileAttrs = getPosGroup(player.position_group || player.primary_position) === 'Goalkeeper' ? ATTRS.concat(GK_ATTRS) : ATTRS;
  profileAttrs.forEach(a => { currentAttrs[a] = Math.round(attr10(player, a) * 10) / 10; });

  const seasons = [];
  let state = { ...currentAttrs };
  for (let year = 1; year <= 5; year++) {
    const nextAttrs = {};
    profileAttrs.forEach(a => {
      const isPriority = plan.boosts.includes(a);
      const growth = (isPriority ? plan.priorityBoost : plan.supportBoost) * ageFactor * (confidence.score / 75);
      const drag = !isPriority && plan.drag ? plan.drag : 0;
      nextAttrs[a] = Math.round(Math.max(1, Math.min(9.8, (state[a] || 5) + growth - drag)) * 10) / 10;
    });
    state = nextAttrs;
    const simulated = { ...player, ...nextAttrs };
    const overall = Math.round(computeOverall(simulated));
    const value = projectedValue(simulated, overall);
    seasons.push({
      year,
      overall,
      transferValue: value.value,
      transferValueFormatted: value.formatted,
      rankingImpact: overall >= 85 ? 'Elite academy watchlist range' : overall >= 75 ? 'Strong regional academy range' : overall >= 65 ? 'County and trial-ready range' : 'Developing grassroots range',
      attributes: nextAttrs
    });
  }

  return {
    type: 'Attribute Development',
    focus: plan.label,
    currentOverall: Math.round(computeOverall(player)),
    currentTransferValue: transferValue(player),
    confidence,
    seasons,
    attributeEffects: plan.boosts.map(a => ({ attribute: a, direction: 'up', reason: 'Primary focus attribute in this plan.' })),
    tradeOffs: profileAttrs.filter(a => !plan.boosts.includes(a)).slice(0, 5).map(a => ({ attribute: a, direction: plan.drag ? 'slight down pressure' : 'stable', reason: 'Not a primary focus area.' })),
    visualisation: { labels: seasons.map(s => 'Year ' + s.year), overall: seasons.map(s => s.overall), transferValue: seasons.map(s => s.transferValue) },
    summary: 'This plan projects how a structured focus could change attributes, overall ranking and estimated transfer value over five football years.',
    disclaimer: DISCLAIMER
  };
}

function roiAnalysis(player, facts, inputParams = {}) {
  const goal = inputParams.financialGoal || inputParams.goal || 'Balanced value growth';
  const development = attributeDevelopment(player, facts, { focus: inputParams.focus || 'Balanced Growth' });
  const current = transferValue(player).value || 0;
  const year3 = development.seasons[2]?.transferValue || current;
  const year5 = development.seasons[4]?.transferValue || year3;
  const acquisitionCost = Number(inputParams.acquisitionCost) || Math.round(current * 0.18);
  const annualDevelopmentCost = Number(inputParams.annualDevelopmentCost) || 2500;
  const scoutingCost = Number(inputParams.scoutingCost) || 750;
  const totalCost3 = acquisitionCost + scoutingCost + annualDevelopmentCost * 3;
  const totalCost5 = acquisitionCost + scoutingCost + annualDevelopmentCost * 5;
  const roi3 = totalCost3 > 0 ? Math.round(((year3 - totalCost3) / totalCost3) * 100) : 0;
  const roi5 = totalCost5 > 0 ? Math.round(((year5 - totalCost5) / totalCost5) * 100) : 0;
  const confidence = dataConfidence(player, facts);
  const suitability = roi5 >= 80 && confidence.score >= 60 ? 'Strong financial fit' : roi5 >= 25 ? 'Monitor and negotiate carefully' : 'High-risk financial fit';

  return {
    type: 'ROI Analysis',
    financialGoal: goal,
    currentTransferValue: transferValue(player),
    assumptions: {
      acquisitionCost,
      acquisitionCostFormatted: formatCurrency(acquisitionCost),
      annualDevelopmentCost,
      annualDevelopmentCostFormatted: formatCurrency(annualDevelopmentCost),
      scoutingCost,
      scoutingCostFormatted: formatCurrency(scoutingCost)
    },
    projection: [
      { horizon: '3 years', projectedValue: year3, projectedValueFormatted: formatCurrency(year3), totalCost: totalCost3, totalCostFormatted: formatCurrency(totalCost3), roiPercent: roi3 },
      { horizon: '5 years', projectedValue: year5, projectedValueFormatted: formatCurrency(year5), totalCost: totalCost5, totalCostFormatted: formatCurrency(totalCost5), roiPercent: roi5 }
    ],
    suitability,
    confidence,
    recommendation: suitability === 'Strong financial fit' ? 'Financially attractive if the scouting objective is resale growth or academy pathway depth.' : suitability === 'Monitor and negotiate carefully' ? 'Worth monitoring, but acquisition and development costs should be controlled.' : 'Do not treat this as a priority financial target until more evidence improves the value case.',
    visualisation: { labels:['Current','Year 3','Year 5'], values:[current, year3, year5], costs:[0, totalCost3, totalCost5] },
    disclaimer: DISCLAIMER
  };
}

function scenarioPrediction(player, facts, inputParams = {}) {
  const scenario = MATCH_SCENARIOS.find(s => s.key === inputParams.scenarioKey || s.label === inputParams.scenario) || MATCH_SCENARIOS[0];
  const isGk = getPosGroup(player.position_group || player.primary_position) === 'Goalkeeper';
  const relevantAttrs = scenario.gk && !isGk ? ['positioning','composure','jumping','heading','strength'] : scenario.attrs;
  const score = Math.round(relevantAttrs.reduce((sum, a) => sum + attr100(player, a), 0) / relevantAttrs.length);
  const confidence = dataConfidence(player, facts);
  const adjusted = Math.round(score * 0.82 + confidence.score * 0.18);
  const recommendation = adjusted >= 75 ? 'Flourish' : adjusted >= 58 ? 'Usable with support' : 'Avoid as a repeated tactical demand';
  const risk = adjusted >= 75 ? 'Low' : adjusted >= 58 ? 'Medium' : 'High';

  return {
    type: 'Match Scenario Prediction',
    scenario: scenario.label,
    predictedBehaviour: 'In this scenario the player ' + scenario.behaviour + '.',
    scenarioScore: adjusted,
    rawScenarioFit: score,
    risk,
    recommendation,
    confidence,
    evidence: relevantAttrs.map(a => ({ attribute: a, score: Math.round(attr100(player, a)) })),
    tacticalNote: recommendation === 'Flourish' ? 'This profile fits the scenario well enough to be a positive selection trigger.' : recommendation === 'Usable with support' ? 'The player can be used here if the team shape protects their weaker evidence areas.' : 'Avoid building a game model that repeatedly exposes this scenario for this player.',
    visualisation: { labels: relevantAttrs, values: relevantAttrs.map(a => Math.round(attr100(player, a))) },
    scenarios: MATCH_SCENARIOS.map(s => ({ key: s.key, label: s.label, gk: !!s.gk })),
    disclaimer: DISCLAIMER
  };
}

function fallbackPrediction(player, facts, predictionType) {
  const confidence = dataConfidence(player, facts);
  const overall = Math.round(computeOverall(player));
  return {
    type: predictionType,
    overallRating: overall,
    confidence,
    message: 'This legacy prediction is shown using the current ScoutLink evidence model. Use Attribute Development, ROI Analysis or Match Scenario Prediction for the enhanced view.',
    disclaimer: DISCLAIMER
  };
}

async function loadScout(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('id,scout_team_id,subscription_plan,predictions_remaining,scout_preferences')
    .eq('id', userId)
    .single();
  if (error || !scout) {
    const e = new Error('Scout not found');
    e.status = 404;
    throw e;
  }
  return scout;
}

async function countTeamPredictions(scout) {
  let q = supabase.from('predictions_log').select('id', { count:'exact', head:true });
  if (scout.scout_team_id) q = q.eq('scout_team_id', scout.scout_team_id);
  else q = q.eq('scout_id', scout.id);
  const { count, error } = await q;
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

function canonicalType(type) {
  if (type === 'Attribute trajectory') return 'Attribute Development';
  if (type === 'Transfer value trajectory') return 'ROI Analysis';
  if (type === 'Match scenario simulation') return 'Match Scenario Prediction';
  if (type === 'Return on Investment') return 'ROI Analysis';
  return type;
}

router.get('/scenarios', requireAuth, requireRole('Scout'), (req, res) => {
  res.json({ data: MATCH_SCENARIOS.map(s => ({ key: s.key, label: s.label, gk: !!s.gk })) });
});

router.post('/run', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { playerId, predictionType, inputParams } = req.body;
    if (!playerId || !predictionType) return res.status(400).json({ error: 'playerId and predictionType required' });

    const scout = await loadScout(req.user.id);
    const limit = planLimit(scout.subscription_plan || 'Core');
    const used = await countTeamPredictions(scout);
    const remaining = Math.max(0, limit - used);
    if (remaining <= 0) {
      return res.status(402).json({ error: 'You have reached your prediction cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.', creditsRemaining: 0, planLimit: limit });
    }

    const { data: player, error: playerErr } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (playerErr || !player) return res.status(404).json({ error: 'Player not found' });
    const { data: facts } = await supabase.from('match_facts').select('*').eq('player_id', playerId).order('match_date', { ascending: false }).limit(10);
    const type = canonicalType(predictionType);
    const ip = inputParams || {};
    let result;
    if (type === 'Attribute Development') result = attributeDevelopment(player, facts || [], ip);
    else if (type === 'ROI Analysis') result = roiAnalysis(player, facts || [], ip);
    else if (type === 'Match Scenario Prediction') result = scenarioPrediction(player, facts || [], ip);
    else result = fallbackPrediction(player, facts || [], type);

    const { data: log, error: logErr } = await supabase.from('predictions_log').insert({
      scout_id: req.user.id,
      scout_team_id: scout.scout_team_id || null,
      player_id: playerId,
      prediction_type: type,
      input_params: ip,
      result,
      run_at: new Date().toISOString()
    }).select().single();
    if (logErr) throw logErr;

    const remainingAfter = Math.max(0, remaining - 1);
    await updateRemaining(scout, remainingAfter);
    res.json({ result, logId: log?.id || null, creditsRemaining: remainingAfter, planLimit: limit, teamUsed: used + 1 });
  } catch(e) {
    console.error('[Predictions run]', e);
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Internal server error' });
  }
});

router.get('/', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const scout = await loadScout(req.user.id);
    const plan = scout.subscription_plan || 'Core';
    const planLimitValue = planLimit(plan);
    const teamUsed = await countTeamPredictions(scout);
    const { data: logs, error } = await supabase.from('predictions_log')
      .select('id, player_id, prediction_type, input_params, result, run_at, players(id,first_name,last_name,team_name,position_group,overall_rating,age_group)')
      .eq('scout_id', req.user.id)
      .order('run_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ data: logs || [], remaining: Math.max(0, planLimitValue - teamUsed), planLimit: planLimitValue, teamUsed, plan });
  } catch(e) {
    console.error('[Predictions list]', e);
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Internal server error' });
  }
});

module.exports = router;
