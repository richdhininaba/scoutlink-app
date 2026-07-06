'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const {
  computeOverall,
  grassrootsTransferValue,
  calcAge,
  getPosGroup,
  calculatePositionRatings,
  calculateOverallBreakdown,
  calculateValueAnalysis
} = require('../engines/compatibility');
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');

const DISCLAIMER = 'ScoutLink predictions are deterministic estimates based on coach ratings, match facts, physical profile and current player data. They are decision-support outputs, not guarantees.';

const ATTRS = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
const GK_ATTRS = ['gk_diving','gk_handling','gk_kicking','gk_reflexes','gk_positioning','gk_distribution','gk_communication','gk_sweeping'];
const ALL_ATTR_LABELS = {
  pace:'Pace', agility:'Agility', strength:'Strength', stamina:'Stamina', jumping:'Jumping', composure:'Composure',
  shooting:'Shooting', passing:'Passing', dribbling:'Dribbling', defending:'Defending', crossing:'Crossing', vision:'Vision',
  positioning:'Positioning', heading:'Heading', tackling:'Tackling', gk_diving:'Diving', gk_handling:'Handling',
  gk_kicking:'Kicking', gk_reflexes:'Reflexes', gk_positioning:'GK Positioning', gk_distribution:'Distribution',
  gk_communication:'Communication', gk_sweeping:'Sweeping'
};

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

const POSITION_TARGETS = ['GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM','B2B','CAM','LW','RW','CF','ST','SS'];

async function planLimitForScout(scout) {
  if (scout.scout_team_id) {
    const { data: team } = await supabase
      .from('scout_teams')
      .select('subscription_plan,limit_overrides')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (team) return effectiveLimits(team.subscription_plan || scout.subscription_plan || 'Core', team.limit_overrides || {}).predictions;
  }
  return limitsForPlan(scout.subscription_plan || 'Core').predictions;
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

function playerName(player) {
  return [player.first_name, player.last_name].filter(Boolean).join(' ') || 'this player';
}

function generatedAttributes(attrs) {
  const a = key => (Number(attrs[key]) || 5) * 10;
  return {
    creativity: Math.round((a('passing') * 0.34 + a('vision') * 0.46 + a('dribbling') * 0.20)),
    ball_progression: Math.round((a('dribbling') * 0.36 + a('passing') * 0.30 + a('pace') * 0.20 + a('vision') * 0.14)),
    defensive_reliability: Math.round((a('defending') * 0.42 + a('tackling') * 0.34 + a('positioning') * 0.24)),
    attacking_threat: Math.round((a('shooting') * 0.42 + a('positioning') * 0.25 + a('pace') * 0.18 + a('composure') * 0.15)),
    pressure_resistance: Math.round((a('composure') * 0.45 + a('dribbling') * 0.25 + a('passing') * 0.20 + a('strength') * 0.10))
  };
}

function effectText(delta, focus) {
  if (delta > 0.8) return 'Primary gain from ' + focus + '.';
  if (delta > 0.15) return 'Secondary support from the plan.';
  if (delta < -0.4) return 'Trade-off caused by narrowing training load.';
  return 'Maintained without a material directional change.';
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

function attributeDevelopment(player, facts, inputParams = {}, context = {}) {
  const requested = inputParams.focus || inputParams.trainingFocus || 'Balanced Growth';
  const plan = DEVELOPMENT_PLANS[requested] || DEVELOPMENT_PLANS['Balanced Growth'];
  const confidence = dataConfidence(player, facts);
  const ageFactor = ageMultiplier(player);
  const currentAttrs = {};
  const profileAttrs = getPosGroup(player.position_group || player.primary_position) === 'Goalkeeper' ? ATTRS.concat(GK_ATTRS) : ATTRS;
  profileAttrs.forEach(a => { currentAttrs[a] = Math.round(attr10(player, a) * 10) / 10; });
  const playerLabel = playerName(player);

  const fiveYearDeltas = {};
  const attributeEffectsByKey = {};
  profileAttrs.forEach(a => {
    const isPriority = plan.boosts.includes(a);
    const isGkFocus = requested === 'Goalkeeper Command' && !GK_ATTRS.includes(a);
    let delta = isPriority ? (1.6 + ageFactor * 0.55) : (0.25 + ageFactor * 0.15);
    if (plan.drag && !isPriority) delta -= (plan.drag * 18);
    if (isGkFocus) delta -= 0.55;
    if (requested === 'Defensive Intelligence' && ['shooting','crossing'].includes(a)) delta -= 0.85;
    if (requested === 'Final Third Output' && ['defending','tackling'].includes(a)) delta -= 0.75;
    if (requested === 'Technical Possession' && ['heading','jumping'].includes(a)) delta -= 0.35;
    fiveYearDeltas[a] = Math.round(Math.max(-1.4, Math.min(2.4, delta)) * 10) / 10;
    attributeEffectsByKey[a] = {
      attribute: ALL_ATTR_LABELS[a] || a,
      deltaFiveYear: fiveYearDeltas[a],
      reason: effectText(fiveYearDeltas[a], plan.label)
    };
  });

  const seasons = [];
  for (let year = 1; year <= 5; year++) {
    const nextAttrs = {};
    const attributeDeltas = {};
    profileAttrs.forEach(a => {
      const scaledDelta = fiveYearDeltas[a] * (year / 5) * (0.85 + confidence.score / 300);
      attributeDeltas[a] = Math.round(scaledDelta * 10) / 10;
      nextAttrs[a] = Math.round(Math.max(1, Math.min(10, (currentAttrs[a] || 5) + scaledDelta)) * 10) / 10;
    });
    const simulated = { ...player, ...nextAttrs };
    const overall = Math.round(computeOverall(simulated));
    const value = projectedValue(simulated, overall);
    seasons.push({
      year,
      overall,
      transferValue: value.value,
      transferValueFormatted: value.formatted,
      rankingImpact: overall >= 85 ? 'Elite academy watchlist range' : overall >= 75 ? 'Strong regional academy range' : overall >= 65 ? 'County and trial-ready range' : 'Developing grassroots range',
      attributes: nextAttrs,
      attributeDeltas
    });
  }
  const generated = {};
  seasons.forEach(s => { generated[s.year] = generatedAttributes(s.attributes); });

  return {
    type: 'Attribute Development',
    focus: plan.label,
    currentOverall: Math.round(computeOverall(player)),
    currentTransferValue: transferValue(player),
    currentAttributes: currentAttrs,
    confidence,
    seasons,
    attributeEffectsByKey,
    attributeEffects: Object.keys(attributeEffectsByKey).map(k => attributeEffectsByKey[k]),
    generatedAttributes: generated,
    tradeOffs: profileAttrs.filter(a => fiveYearDeltas[a] < 0).map(a => ({ attribute: a, direction: 'down', reason: attributeEffectsByKey[a].reason })),
    visualisation: { labels: seasons.map(s => 'Year ' + s.year), overall: seasons.map(s => s.overall), transferValue: seasons.map(s => s.transferValue) },
    paragraphs: [
      'Your focus was ' + plan.label + '. For ' + playerLabel + ', ScoutLink projects the biggest movement in ' + plan.boosts.map(a => ALL_ATTR_LABELS[a] || a).slice(0, 4).join(', ') + ', while every coach-rated attribute is still tracked so trade-offs are visible.',
      'The five-year view caps attributes at 10 and blends age runway, current coach ratings, recorded match evidence and position-specific value baselines. Use the year selector to inspect the exact expected attribute movement for years 1 to 5.'
    ],
    summary: 'Your focus was ' + plan.label + ' and this will change ' + playerLabel + "'s individual attributes, projected overall and estimated value over five years.",
    disclaimer: DISCLAIMER
  };
}

function roiAnalysis(player, facts, inputParams = {}, context = {}) {
  const goal = inputParams.financialGoal || inputParams.goal || 'Balanced value growth';
  const development = attributeDevelopment(player, facts, { focus: inputParams.focus || 'Balanced Growth' }, context);
  const current = transferValue(player).value || 0;
  const playerLabel = playerName(player);
  const teamName = context.scoutTeam?.team_name || context.scoutTeam?.club_name || context.scout?.club_name || 'your scout team';
  const acquisitionCost = Number(inputParams.acquisitionCost) || Math.round(current * 0.18);
  const annualDevelopmentCost = Number(inputParams.annualDevelopmentCost) || (goal === 'First-team contribution' ? 3500 : goal === 'Low-cost high ceiling' ? 1800 : 2500);
  const scoutingCost = Number(inputParams.scoutingCost) || 750;
  const projection = development.seasons.map(s => {
    const totalCost = acquisitionCost + scoutingCost + annualDevelopmentCost * s.year;
    const roiPercent = totalCost > 0 ? Math.round(((s.transferValue - totalCost) / totalCost) * 100) : 0;
    return {
      horizon: 'Year ' + s.year,
      year: s.year,
      projectedValue: s.transferValue,
      projectedValueFormatted: formatCurrency(s.transferValue),
      totalCost,
      totalCostFormatted: formatCurrency(totalCost),
      roiPercent
    };
  });
  const year3 = projection[2] || projection[projection.length - 1];
  const year5 = projection[4] || year3;
  const confidence = dataConfidence(player, facts);
  const suitability = year5.roiPercent >= 80 && confidence.score >= 60 ? 'Strong financial fit' : year5.roiPercent >= 25 ? 'Monitor and negotiate carefully' : 'High-risk financial fit';
  const paragraphOne = goal + ' is the financial goal for ' + teamName + '. On current evidence, ' + playerLabel + ' starts at ' + formatCurrency(current) + ' and projects to ' + year5.projectedValueFormatted + ' by ' + year5.horizon.toLowerCase() + ', against a modelled total cost of ' + year5.totalCostFormatted + '.';
  const paragraphTwo = suitability === 'Strong financial fit'
    ? 'This is a positive financial case if the team can maintain development minutes and avoid overpaying at entry. ScoutLink would treat the player as a worthwhile target because upside, position baseline and evidence confidence are pulling in the same direction.'
    : suitability === 'Monitor and negotiate carefully'
      ? 'This is investable only with disciplined acquisition cost. The profile has enough value upside to keep watching, but the margin can disappear quickly if development costs rise or match evidence weakens.'
      : 'This is not a strong financial recommendation right now. The projected upside does not sufficiently clear the cost base, so ScoutLink would keep the player in monitoring rather than pushing for recruitment spend.';

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
    projection,
    suitability,
    confidence,
    recommendation: paragraphTwo,
    paragraphs: [paragraphOne, paragraphTwo],
    summary: 'For ' + teamName + ', the ' + goal.toLowerCase() + ' case for ' + playerLabel + ' is: ' + suitability + '.',
    visualisation: { labels:['Current'].concat(projection.map(p => p.horizon)), values:[current].concat(projection.map(p => p.projectedValue)), costs:[0].concat(projection.map(p => p.totalCost)) },
    disclaimer: DISCLAIMER
  };
}

function scenarioPrediction(player, facts, inputParams = {}, context = {}) {
  const scenario = MATCH_SCENARIOS.find(s => s.key === inputParams.scenarioKey || s.label === inputParams.scenario) || MATCH_SCENARIOS[0];
  const isGk = getPosGroup(player.position_group || player.primary_position) === 'Goalkeeper';
  const playerLabel = playerName(player);
  const teamName = context.scoutTeam?.team_name || context.scout?.club_name || 'your scout team';
  const relevantAttrs = scenario.gk && !isGk ? ['positioning','composure','jumping','heading','strength'] : scenario.attrs;
  const score = Math.round(relevantAttrs.reduce((sum, a) => sum + attr100(player, a), 0) / relevantAttrs.length);
  const confidence = dataConfidence(player, facts);
  const gkPenalty = scenario.gk && isGk ? 6 : 0;
  const adjusted = Math.round(score * 0.84 + confidence.score * 0.16 - gkPenalty);
  const recommendation = adjusted >= 78 ? 'Flourish' : adjusted >= 62 ? 'Usable with support' : 'Avoid as a repeated tactical demand';
  const risk = adjusted >= 75 ? 'Low' : adjusted >= 58 ? 'Medium' : 'High';
  const scenarioPhrase = 'The match scenario was ' + scenario.label + '.';
  const verdict = recommendation === 'Flourish'
    ? playerLabel + ' should flourish here because the strongest evidence areas line up with the repeated actions this scenario demands.'
    : recommendation === 'Usable with support'
      ? playerLabel + ' can be used in this scenario, but ' + teamName + ' should protect the weaker moments through role clarity, nearby support and managed exposure.'
      : playerLabel + ' should not be repeatedly exposed to this scenario yet. The current evidence suggests the risk would outweigh the tactical benefit unless the role is heavily protected.';
  const gkNote = scenario.gk && isGk ? 'Goalkeeper scenarios are scored more strictly because errors in command, handling or positioning are usually high-consequence actions.' : '';

  return {
    type: 'Match Scenario Prediction',
    scenario: scenario.label,
    predictedBehaviour: 'In this scenario ' + playerLabel + ' ' + scenario.behaviour + '.',
    scenarioScore: adjusted,
    rawScenarioFit: score,
    risk,
    recommendation,
    confidence,
    evidence: relevantAttrs.map(a => ({ attribute: a, score: Math.round(attr100(player, a)) })),
    tacticalNote: recommendation === 'Flourish' ? 'This profile fits the scenario well enough to be a positive selection trigger.' : recommendation === 'Usable with support' ? 'The player can be used here if the team shape protects their weaker evidence areas.' : 'Avoid building a game model that repeatedly exposes this scenario for this player.',
    paragraphs: [scenarioPhrase + ' ' + verdict, gkNote || 'ScoutLink blends the player age, position, coach-rated attributes, physical profile and recent match evidence so the output is strict when the evidence is thin and more confident when match facts support the rating.'],
    summary: scenarioPhrase + ' The result was ' + playerLabel + ' will ' + recommendation.toLowerCase() + ' with a scenario score of ' + adjusted + '/100.',
    visualisation: { labels: relevantAttrs, values: relevantAttrs.map(a => Math.round(attr100(player, a))) },
    scenarios: MATCH_SCENARIOS.map(s => ({ key: s.key, label: s.label, gk: !!s.gk })),
    disclaimer: DISCLAIMER
  };
}

function positionFitPrediction(player, facts, inputParams = {}, context = {}) {
  const playerLabel = playerName(player);
  const target = String(inputParams.targetPosition || inputParams.position || '').toUpperCase();
  const targetPosition = POSITION_TARGETS.includes(target) ? target : null;
  const positions = calculatePositionRatings(player, facts || []);
  const overall = calculateOverallBreakdown(player, facts || []);
  const value = calculateValueAnalysis(player, facts || [], context);
  const targetScore = targetPosition ? (positions.ratings[targetPosition] || 0) : positions.bestCurrentScore;
  const bestScore = positions.bestCurrentScore || 0;
  const gap = Math.round((targetScore - bestScore) * 10) / 10;
  const targetVerdict = !targetPosition
    ? 'No target role selected'
    : gap >= -2
      ? 'Natural or near-natural fit'
      : gap >= -8
        ? 'Convertible with a managed development plan'
        : 'High-friction conversion';
  const topRoles = (positions.sorted || []).slice(0, 6);
  const currentLabel = positions.bestCurrentPosition || overall.primaryPosition || 'CM';
  const futureLabel = positions.bestFuturePosition || currentLabel;
  const paragraphOne = playerLabel + "'s strongest current role is " + currentLabel + ' at ' + Math.round(bestScore) + '/100, with a future pathway towards ' + futureLabel + ' if the current development trend is protected.';
  const paragraphTwo = targetPosition
    ? 'The selected target role is ' + targetPosition + '. ScoutLink rates this fit at ' + Math.round(targetScore) + '/100, which makes it a ' + targetVerdict.toLowerCase() + '. The judgement is based on role-weighted coach attributes, physical suitability, match evidence and the player age band rather than a generic position label.'
    : 'No target position was selected, so ScoutLink is showing the strongest role family and nearby conversion roles. Use this to decide whether the player should stay in their current lane or be tested in a related role.';
  return {
    type: 'Position Fit Projection',
    targetPosition,
    targetVerdict,
    bestCurrentPosition: currentLabel,
    bestCurrentScore: Math.round(bestScore),
    bestFuturePosition: futureLabel,
    bestFutureScore: Math.round(positions.bestFutureScore || bestScore),
    targetScore: Math.round(targetScore),
    targetGapVsBest: gap,
    positionRatings: positions.ratings,
    topRoles,
    conversionCandidates: positions.conversionCandidates || [],
    overallBreakdown: overall,
    valueAnalysis: value,
    confidence: { score: overall.dataConfidenceScore, label: overall.dataConfidenceLabel, note: overall.dataConfidenceNote },
    paragraphs: [paragraphOne, paragraphTwo],
    summary: targetPosition
      ? 'Position fit for ' + playerLabel + ': ' + targetPosition + ' is a ' + targetVerdict.toLowerCase() + ' at ' + Math.round(targetScore) + '/100.'
      : 'Position fit for ' + playerLabel + ': best current role is ' + currentLabel + ' and best future role is ' + futureLabel + '.',
    visualisation: { labels: topRoles.map(r => r.role), values: topRoles.map(r => Math.round(r.score)) },
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

async function loadScoutTeam(scout) {
  if (!scout.scout_team_id) return null;
  const { data } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
  return data || null;
}

function canonicalType(type) {
  if (type === 'Attribute trajectory') return 'Attribute Development';
  if (type === 'Transfer value trajectory') return 'ROI Analysis';
  if (type === 'Match scenario simulation') return 'Match Scenario Prediction';
  if (type === 'Return on Investment') return 'ROI Analysis';
  if (type === 'Position Fit' || type === 'position_fit' || type === 'Positional ceiling') return 'Position Fit Projection';
  if (type === 'Value / ROI Projection' || type === 'Value Projection') return 'ROI Analysis';
  if (type === 'Overall Rating Projection' || type === 'Role Readiness Prediction' || type === 'Compatibility Projection') return 'Position Fit Projection';
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
    const limit = await planLimitForScout(scout);
    const used = await countTeamPredictions(scout);
    const remaining = Math.max(0, limit - used);
    if (remaining <= 0) {
      return res.status(402).json({ error: 'You have reached your prediction cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.', creditsRemaining: 0, planLimit: limit });
    }

    const { data: player, error: playerErr } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (playerErr || !player) return res.status(404).json({ error: 'Player not found' });
    const { data: facts } = await supabase.from('match_facts').select('*').eq('player_id', playerId).order('match_date', { ascending: false }).limit(10);
    const scoutTeam = await loadScoutTeam(scout);
    const context = { scout, scoutTeam };
    const type = canonicalType(predictionType);
    const ip = inputParams || {};
    let result;
    if (type === 'Attribute Development') result = attributeDevelopment(player, facts || [], ip, context);
    else if (type === 'ROI Analysis') result = roiAnalysis(player, facts || [], ip, context);
    else if (type === 'Match Scenario Prediction') result = scenarioPrediction(player, facts || [], ip, context);
    else if (type === 'Position Fit Projection') result = positionFitPrediction(player, facts || [], ip, context);
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
    const planLimitValue = await planLimitForScout(scout);
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
