'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { computeOverall, grassrootsTransferValue, calcAge, getPosGroup } = require('../engines/compatibility');

const DISCLAIMER = 'Predictions are illustrative estimates based on current coach-entered data. They are not guarantees of development. ScoutLink does not warrant the accuracy of any prediction. Scouts should use predictions as one of many data points and not as the sole basis for recruitment decisions.';

// -- Prediction Type 1: Attribute Development Trajectory --
function attributeTrajectory(player, trainingFocus, seasons = 3) {
  const age = calcAge(player.date_of_birth) ?? 12;
  const ATTRS = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
  
  // Growth rates by training focus and age band
  const growthByFocus = {
    'Technical Development': {
      attrs: ['composure','passing','dribbling','vision'],
      rates: { young: 0.4, mid: 0.3, older: 0.2 }
    },
    'Physical Development': {
      attrs: ['pace','strength','stamina','jumping'],
      rates: { young: 0.35, mid: 0.25, older: 0.1 }
    },
    'Tactical Development': {
      attrs: ['positioning','composure','vision','tackling'],
      rates: { young: 0.3, mid: 0.3, older: 0.3 }
    },
    'Balanced Development': {
      attrs: ATTRS,
      rates: { young: 0.2, mid: 0.2, older: 0.2 }
    }
  };
  
  const focus = growthByFocus[trainingFocus] || growthByFocus['Balanced Development'];
  const rate = age <= 12 ? focus.rates.young : age <= 14 ? focus.rates.mid : focus.rates.older;
  const apps = Number(player.appearances) || 0;
  const confidence = apps >= 5 ? 'high' : apps >= 2 ? 'medium' : 'low';
  
  const current = {};
  ATTRS.forEach(a => { current[a] = Math.min(10, Math.max(0, parseFloat(player[a]) || 5)); });
  
  const trajectory = [];
  let prevLow = {...current};
  let prevHigh = {...current};
  
  for (let yr = 1; yr <= seasons; yr++) {
    const yearLow = {}, yearHigh = {};
    ATTRS.forEach(a => {
      const isFocused = focus.attrs.includes(a);
      const growthRate = isFocused ? rate : rate * 0.3;
      const maxGrowth = growthRate;
      yearHigh[a] = Math.min(9.5, parseFloat((prevHigh[a] + maxGrowth).toFixed(2)));
      yearLow[a] = Math.min(9.5, parseFloat((prevLow[a] + maxGrowth * 0.6).toFixed(2)));
    });
    prevLow = yearLow;
    prevHigh = yearHigh;
    
    // Compute overall for low and high
    const pLow = { ...player, ...yearLow };
    const pHigh = { ...player, ...yearHigh };
    const ovLow = Math.round(computeOverall(pLow));
    const ovHigh = Math.round(computeOverall(pHigh));
    trajectory.push({ year: yr, attributesLow: yearLow, attributesHigh: yearHigh, overallLow: ovLow, overallHigh: ovHigh });
  }
  
  return {
    type: 'Attribute trajectory',
    trainingFocus,
    currentOverall: Math.round(computeOverall(player)),
    currentAttributes: current,
    trajectory,
    confidence,
    lowConfidenceWarning: confidence === 'low' ? 'Limited match data — prediction reliability is low.' : null,
    disclaimer: DISCLAIMER
  };
}

// -- Prediction Type 2: Maturation & Relative Age --
function maturationRisk(player) {
  const dob = player.date_of_birth;
  const age = calcAge(dob) ?? 12;
  let birthQuarter = null, quarterLabel = null, quarterMessage = null;
  
  if (dob) {
    const d = new Date(dob);
    const month = d.getMonth() + 1; // 1-12
    // FA season: Q1=Sep-Nov, Q2=Dec-Feb, Q3=Mar-May, Q4=Jun-Aug
    if (month >= 9 && month <= 11) { birthQuarter = 'Q1'; quarterLabel = 'September to November'; }
    else if (month === 12 || month <= 2) { birthQuarter = 'Q2'; quarterLabel = 'December to February'; }
    else if (month >= 3 && month <= 5) { birthQuarter = 'Q3'; quarterLabel = 'March to May'; }
    else { birthQuarter = 'Q4'; quarterLabel = 'June to August'; }
    
    if (birthQuarter === 'Q1' || birthQuarter === 'Q2') {
      quarterMessage = 'Relative age advantage — this player may appear more advanced due to being born earlier in the selection year. Their current ratings may partly reflect physical maturity rather than pure footballing ability. Recommend watching over at least two full seasons before committing.';
    } else if (birthQuarter === 'Q3') {
      quarterMessage = 'Neutral relative age position.';
    } else {
      quarterMessage = 'Late birth quarter — research from English academies shows Q4 players are often undervalued at grassroots level but have higher long-term development potential. This player may be a late developer worth monitoring closely.';
    }
  }
  
  let maturationWarning = null;
  if (age >= 11 && age <= 14) {
    maturationWarning = 'Physical maturation phase — strength and pace scores may not reflect final physical ceiling. This player may be approaching or in their peak height velocity phase.';
  }
  
  return {
    type: 'Maturation and relative age risk',
    birthQuarter, quarterLabel, quarterMessage, maturationWarning,
    age,
    disclaimer: DISCLAIMER
  };
}

// -- Prediction Type 3: Positional Ceiling --
function positionalCeiling(player) {
  const overall = computeOverall(player);
  const apps = Number(player.appearances) || 0;
  let ceiling, reliable;
  
  if (overall < 50) {
    ceiling = 'Current trajectory suggests continued development at grassroots community level. Significant improvement needed across multiple attributes to progress further.';
  } else if (overall < 65) {
    ceiling = 'Shows potential for regional grassroots competition. Consistency of performance across more appearances needed before any meaningful projection can be made.';
  } else if (overall < 75) {
    ceiling = 'Profile is consistent with players who progress to county level or structured academy trials at lower league clubs. No guarantees — continued development and coach guidance are essential.';
  } else if (overall < 85) {
    ceiling = 'Attribute profile is in range of players who attract attention from lower league academy scouts. This is a preliminary indicator only and requires a minimum of 10 appearances to be considered reliable.';
  } else {
    ceiling = 'Elite grassroots profile. However fewer than 5% of players at this rating in our system progress to professional academies. This projection requires strong evidence across at least 10 appearances and consistent coach ratings before it carries meaningful weight.';
  }
  
  reliable = apps >= 10;
  const reliabilityNote = apps < 3 ? 'Very limited match data — ceiling estimate is speculative.' : apps < 10 ? 'Growing data set — ceiling estimate is indicative only.' : 'Data set supports a more reliable estimate.';
  
  return {
    type: 'Positional ceiling estimate',
    overallRating: Math.round(overall),
    ceiling, reliable, reliabilityNote, appearances: apps,
    disclaimer: DISCLAIMER
  };
}

// -- Prediction Type 4: Match Scenario Simulation --
function matchSimulation(player, opponentStrength, scoutTeam) {
  const { compatibilityScore } = require('../engines/compatibility');
  
  const multipliers = {
    'Weaker opposition': { technical: 1.1, physical: 1.05 },
    'Similar standard opposition': { technical: 1.0, physical: 1.0 },
    'Stronger opposition': { technical: 0.85, physical: 0.80 }
  };
  const mults = multipliers[opponentStrength] || multipliers['Similar standard opposition'];
  
  const TECHNICAL_ATTRS = ['composure','shooting','passing','dribbling','crossing','vision'];
  const PHYSICAL_ATTRS = ['pace','agility','strength','stamina','jumping'];
  
  const simPlayer = { ...player };
  TECHNICAL_ATTRS.forEach(a => { if (simPlayer[a] !== undefined) simPlayer[a] = Math.min(10, parseFloat(simPlayer[a]) * mults.technical); });
  PHYSICAL_ATTRS.forEach(a => { if (simPlayer[a] !== undefined) simPlayer[a] = Math.min(10, parseFloat(simPlayer[a]) * mults.physical); });
  
  const baseline = compatibilityScore(player, scoutTeam || {});
  const simulated = compatibilityScore(simPlayer, scoutTeam || {});
  const delta = Math.round((simulated.score - baseline.score) * 10) / 10;
  
  return {
    type: 'Match scenario simulation',
    opponentStrength,
    baselineCompatibility: Math.round(baseline.score * 10) / 10,
    simulatedCompatibility: Math.round(simulated.score * 10) / 10,
    delta: delta,
    deltaLabel: delta > 0 ? '+' + delta + ' vs baseline' : delta + ' vs baseline',
    note: 'This simulation uses simplified modifiers and does not account for individual tactical or psychological factors.',
    disclaimer: DISCLAIMER
  };
}

// -- Prediction Type 5: Transfer Value Trajectory --
function transferValueTrajectory(player) {
  const focus = 'Balanced Development';
  const traj = attributeTrajectory(player, focus, 3);
  const years = traj.trajectory.map(yr => {
    const pLow = { ...player };
    const pHigh = { ...player };
    Object.assign(pLow, yr.attributesLow);
    Object.assign(pHigh, yr.attributesHigh);
    pLow.overall_rating = yr.overallLow;
    pHigh.overall_rating = yr.overallHigh;
    const tvLow = grassrootsTransferValue ? grassrootsTransferValue(pLow) : { value: 0, valueFormatted: '—' };
    const tvHigh = grassrootsTransferValue ? grassrootsTransferValue(pHigh) : { value: 0, valueFormatted: '—' };
    const tvCurrent = grassrootsTransferValue ? grassrootsTransferValue({ ...player, overall_rating: yr.year === 1 ? computeOverall(player) : yr.overallLow }) : { value: 0 };
    return { year: yr.year, currentValue: tvCurrent.valueFormatted, projectedLow: tvLow.valueFormatted, projectedHigh: tvHigh.valueFormatted };
  });
  
  const currentTv = grassrootsTransferValue ? grassrootsTransferValue(player) : { value: 0, valueFormatted: '—' };
  
  return {
    type: 'Transfer value trajectory',
    currentValue: currentTv.valueFormatted,
    trajectory: years,
    note: 'Transfer values at grassroots U6-U16 level are indicative only and reflect development potential rather than market transactions.',
    disclaimer: DISCLAIMER
  };
}

// -- Prediction Type 6: Consistency Score --
async function consistencyScore(playerId) {
  const { data: facts } = await supabase.from('match_facts')
    .select('pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling')
    .eq('player_id', playerId)
    .order('match_date', { ascending: false })
    .limit(5);
  
  if (!facts || facts.length < 3) {
    return {
      type: 'Consistency and reliability score',
      insufficient: true,
      message: 'Insufficient data — at least 3 match records are needed to calculate consistency.',
      disclaimer: DISCLAIMER
    };
  }
  
  const ATTRS = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
  const sds = ATTRS.map(a => {
    const vals = facts.map(f => parseFloat(f[a])).filter(v => !isNaN(v));
    if (vals.length < 2) return 0;
    const mean = vals.reduce((s,v)=>s+v,0)/vals.length;
    const variance = vals.reduce((s,v)=>s+Math.pow(v-mean,2),0)/vals.length;
    return Math.sqrt(variance);
  });
  
  const avgSd = sds.reduce((s,v)=>s+v,0) / sds.length;
  let label, message;
  if (avgSd < 0.5) {
    label = 'High consistency';
    message = 'High consistency — coach ratings are stable across recent matches, increasing confidence in the player profile.';
  } else if (avgSd <= 1.5) {
    label = 'Moderate consistency';
    message = 'Moderate consistency — some variation in ratings across recent matches. Profile should be interpreted with care.';
  } else {
    label = 'Low consistency';
    message = 'Low consistency — significant variation in ratings across matches. This may indicate a developing player with high performance variability, or inconsistent data entry. Treat this profile with caution.';
  }
  
  return {
    type: 'Consistency and reliability score',
    label, message,
    avgStdDev: Math.round(avgSd * 100) / 100,
    matchesAnalysed: facts.length,
    disclaimer: DISCLAIMER
  };
}

// POST /api/predictions/run — run a prediction and log it
router.post('/run', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { playerId, predictionType, inputParams } = req.body;
    if (!playerId || !predictionType) return res.status(400).json({ error: 'playerId and predictionType required' });
    
    // Check credits
    const { data: scout, error: scErr } = await supabase.from('scouts')
      .select('predictions_remaining,subscription_plan').eq('id', req.user.id).single();
    if (scErr || !scout) return res.status(404).json({ error: 'Scout not found' });
    if (scout.predictions_remaining !== null && scout.predictions_remaining <= 0) {
      return res.status(403).json({ error: 'No prediction credits remaining. Please upgrade your plan.' });
    }
    
    // Get player + match facts
    const { data: player, error: plErr } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (plErr || !player) return res.status(404).json({ error: 'Player not found' });
    
    let result;
    const ip = inputParams || {};
    
    switch(predictionType) {
      case 'Attribute trajectory':
        result = attributeTrajectory(player, ip.trainingFocus || 'Balanced Development', ip.seasons || 3);
        break;
      case 'Maturation and relative age risk':
        result = maturationRisk(player);
        break;
      case 'Positional ceiling estimate':
        result = positionalCeiling(player);
        break;
      case 'Match scenario simulation':
        const { data: scoutData } = await supabase.from('scouts').select('scout_team_id').eq('id', req.user.id).single();
        let scoutTeam = {};
        if (scoutData && scoutData.scout_team_id) {
          const { data: st } = await supabase.from('scout_teams').select('*').eq('id', scoutData.scout_team_id).single();
          scoutTeam = st || {};
        }
        result = matchSimulation(player, ip.opponentStrength || 'Similar standard opposition', scoutTeam);
        break;
      case 'Transfer value trajectory':
        result = transferValueTrajectory(player);
        break;
      case 'Consistency and reliability score':
        result = await consistencyScore(playerId);
        break;
      default:
        return res.status(400).json({ error: 'Unknown prediction type: ' + predictionType });
    }
    
    // Deduct 1 credit
    if (scout.predictions_remaining !== null) {
      await supabase.from('scouts').update({ predictions_remaining: scout.predictions_remaining - 1 }).eq('id', req.user.id);
    }
    
    // Log prediction
    const { data: log } = await supabase.from('predictions_log').insert({
      scout_id: req.user.id,
      player_id: playerId,
      prediction_type: predictionType,
      input_params: inputParams || {},
      result,
      run_at: new Date().toISOString()
    }).select().single();
    
    res.json({ result, logId: log ? log.id : null, creditsRemaining: scout.predictions_remaining !== null ? scout.predictions_remaining - 1 : null });
  } catch(e) { console.error('[Predictions run]', e); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/predictions — list predictions for scout grouped by player
router.get('/', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: scout } = await supabase.from('scouts')
      .select('predictions_remaining,subscription_plan').eq('id', req.user.id).single();
    
    const LIMITS = { Core: 120, Plus: 600, Elite: 1200 };
    const plan = scout?.subscription_plan || 'Core';
    const planLimit = LIMITS[plan] || 120;
    
    const { data: logs } = await supabase.from('predictions_log')
      .select('*, players(id,first_name,last_name,team_name,position_group,overall_rating,age_group)')
      .eq('scout_id', req.user.id)
      .order('run_at', { ascending: false })
      .limit(200);
    
    res.json({
      data: logs || [],
      remaining: scout?.predictions_remaining ?? planLimit,
      planLimit,
      plan
    });
  } catch(e) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
