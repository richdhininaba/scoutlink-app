'use strict';
/**
 * ScoutLink Analytics Engine v2.1
 * Attributes stored as 0-10 scale in database.
 * Engine works in 0-100 internally by scaling up.
 */

// Position definitions
const FORWARD_POS  = ['ST','LS','RS','LW','RW','CF','SS'];
const MIDFIELD_POS = ['CDM','CM','RCM','LCM','RDM','LDM','LM','RM','CAM','LAM','RAM','DM','AM','B2B'];
const DEFENDER_POS = ['CB','RCB','LCB','RB','LB','RWB','LWB','SW','BPD'];
const GK_POS       = ['GK'];

function normalisePos(p) {
  if (!p) return [];
  if (Array.isArray(p)) return p.map(x => String(x).trim().toUpperCase()).filter(Boolean);
  return String(p).split(/[,\/|]/g).map(x => x.trim().toUpperCase()).filter(Boolean);
}

function getPosGroup(pos) {
  const pp = normalisePos(pos);
  if (!pp.length) return 'Midfielder';
  if (pp.some(p => GK_POS.includes(p)))      return 'Goalkeeper';
  if (pp.some(p => FORWARD_POS.includes(p)))  return 'Forward';
  if (pp.some(p => DEFENDER_POS.includes(p))) return 'Defender';
  return 'Midfielder';
}

function clamp(n, mn=0, mx=100) { return Math.max(mn, Math.min(mx, n)); }

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob); if (isNaN(d)) return null;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

function rangeMidpoint(rangeStr, fallback = 50) {
  if (!rangeStr) return fallback;
  const m = String(rangeStr).match(/(\d+(?:\.\d+)?)[^\d]+(\d+(?:\.\d+)?)/);
  if (!m) return parseFloat(rangeStr) || fallback;
  return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
}

const HEIGHT_MAP = { very_short:160, short:167, average:174, tall:181, very_tall:188 };
const BUILD_MAP  = { very_slight:57, slight:63, lean:68, athletic:74, stocky:80, powerful:87, very_powerful:95 };

function getHeightMid(player) {
  if (player.height_range_cm) return rangeMidpoint(player.height_range_cm, 174);
  if (player.height_category && HEIGHT_MAP[player.height_category]) return HEIGHT_MAP[player.height_category];
  return 174;
}
function getBuildMid(player) {
  if (player.weight_range_kg) return rangeMidpoint(player.weight_range_kg, 74);
  if (player.build_category && BUILD_MAP[player.build_category]) return BUILD_MAP[player.build_category];
  return 74;
}

// Get attribute value, auto-scaling 0-10 -> 0-100
function attr(player, key, fallback = 50) {
  const v = parseFloat(player[key]);
  if (isNaN(v)) return fallback;
  // If value is on 0-10 scale (stored as <=10), scale up to 0-100
  return v <= 10 ? v * 10 : v;
}

function norm(val, min=0, max=100) {
  return clamp((val - min) / (max - min), 0, 1);
}

function avg(values, fallback = 50) {
  const clean = values.map(Number).filter(v => Number.isFinite(v));
  if (!clean.length) return fallback;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

// Position-weighted overall rating (returns 0-100) with age maturity modifier
// Sections 3 & 4: position-aware weighted formula
function computeOverall(player) {
const group = getPosGroup(player.positions || player.primary_position || player.specific_position);
const a = (key, fb=5) => {
  const v = parseFloat(player[key]);
  if (isNaN(v)) return fb * 10; // fallback on 0-100 scale
  return v <= 10 ? v * 10 : v; // normalise 0-10 to 0-100
};

let base;
if (group === 'Goalkeeper') {
  base = clamp(
    a('gk_diving') * 0.20 + a('gk_reflexes') * 0.22 + a('gk_handling') * 0.18 +
    a('gk_positioning') * 0.15 + a('gk_kicking') * 0.10 +
    a('gk_distribution') * 0.08 + a('gk_communication') * 0.04 + a('gk_sweeping') * 0.03
  );
  // Fallback: use outfield attrs if GK-specific not set
  const hasGK = ['gk_diving','gk_reflexes','gk_handling','gk_positioning','gk_kicking','gk_distribution','gk_communication','gk_sweeping'].some(k => parseFloat(player[k]) > 0);
  if (!hasGK) {
    base = clamp(a('positioning')*0.20+a('composure')*0.18+a('jumping')*0.16+a('strength')*0.14+a('stamina')*0.12+a('passing')*0.10+a('vision')*0.10);
  }
} else if (group === 'Forward') {
  // Spec: pace 14, shooting 18, dribbling 14, positioning 12, composure 10, agility 10, crossing 8, vision 8, passing 6
  base = clamp(
    a('pace')*0.14 + a('shooting')*0.18 + a('dribbling')*0.14 + a('positioning')*0.12 +
    a('composure')*0.10 + a('agility')*0.10 + a('crossing')*0.08 + a('vision')*0.08 + a('passing')*0.06
  );
} else if (group === 'Midfielder') {
  // Spec: passing 18, vision 16, composure 14, dribbling 12, positioning 12, stamina 10, agility 10, crossing 8
  base = clamp(
    a('passing')*0.18 + a('vision')*0.16 + a('composure')*0.14 + a('dribbling')*0.12 +
    a('positioning')*0.12 + a('stamina')*0.10 + a('agility')*0.10 + a('crossing')*0.08
  );
} else {
  // Defender: defending 20, positioning 18, tackling 16, strength 12, stamina 12, heading 10, composure 8, pace 4
  base = clamp(
    a('defending')*0.20 + a('positioning')*0.18 + a('tackling')*0.16 + a('strength')*0.12 +
    a('stamina')*0.12 + a('heading')*0.10 + a('composure')*0.08 + a('pace')*0.04
  );
}

// Age maturity modifier per Section 3
const age = calcAge(player.date_of_birth);
let ageModifier = 1.0;
if (age !== null) {
  if (age <= 9) ageModifier = 0.85;
  else if (age <= 12) ageModifier = 0.90;
  else if (age <= 14) ageModifier = 0.95;
  // 15-16: 1.0 (no change)
}

return clamp(Math.round(base * ageModifier));
}

function physicalFitBonus(player, group) {
  const h = getHeightMid(player);
  const b = getBuildMid(player);
  let bonus = 0;
  if (group === 'Goalkeeper') {
    bonus += h >= 185 ? 5 : h >= 180 ? 3 : h >= 175 ? 0 : -3;
    bonus += b >= 78 ? 2 : 0;
  } else if (group === 'Defender') {
    bonus += h >= 180 ? 4 : h >= 175 ? 2 : 0;
    bonus += b >= 74 ? 2 : 0;
  } else if (group === 'Forward') {
    bonus += h >= 170 && h <= 182 ? 2 : 0;
  }
  return clamp(bonus, -5, 8);
}

// ── TEAM WEAKNESSES ──────────────────────────────────────────────────────────
// Parse structured weakness tags from playing_style field
// Weakness tags: slow_buildup, poor_set_pieces, weak_left_flank, weak_right_flank,
// high_defensive_line, poor_second_ball, physical_vulnerability, pace_exploitable,
// poor_aerial, weak_transitions, poor_gk_distribution, lack_creativity
function parseWeaknesses(playingStyle) {
  if (!playingStyle) return [];
  const known = [
    'slow_buildup','poor_set_pieces','weak_left_flank','weak_right_flank',
    'high_defensive_line','poor_second_ball','physical_vulnerability','pace_exploitable',
    'poor_aerial','weak_transitions','poor_gk_distribution','lack_creativity'
  ];
  const found = [];
  const lower = playingStyle.toLowerCase();
  // Direct tag matches
  known.forEach(tag => { if (lower.includes(tag.replace(/_/g,' ')) || lower.includes(tag)) found.push(tag); });
  return found;
}

// Weakness-to-player-attribute mapping
// A team weakness increases a player's compatibility if they can exploit it
const WEAKNESS_BOOST = {
  slow_buildup:          { attrs:['pace','dribbling'], boost: 4 },
  poor_set_pieces:       { attrs:['heading','positioning'], boost: 3 },
  weak_left_flank:       { attrs:['pace','crossing'], boost: 3, foot:'Left' },
  weak_right_flank:      { attrs:['pace','crossing'], boost: 3, foot:'Right' },
  high_defensive_line:   { attrs:['pace','shooting'], boost: 5 },
  poor_second_ball:      { attrs:['strength','stamina'], boost: 3 },
  physical_vulnerability:{ attrs:['strength','jumping'], boost: 4 },
  pace_exploitable:      { attrs:['pace','agility'], boost: 5 },
  poor_aerial:           { attrs:['heading','jumping'], boost: 4 },
  weak_transitions:      { attrs:['stamina','vision'], boost: 3 },
  poor_gk_distribution:  { attrs:['pressing','stamina'], boost: 3 },
  lack_creativity:       { attrs:['vision','passing'], boost: 4 },
};

function computeWeaknessBoost(player, weaknesses) {
  if (!weaknesses || !weaknesses.length) return 0;
  let total = 0;
  const playerFoot = (player.foot || '').toLowerCase();
  weaknesses.forEach(w => {
    const def = WEAKNESS_BOOST[w];
    if (!def) return;
    // Check foot match for flank weaknesses
    if (def.foot) {
      if (def.foot.toLowerCase() !== playerFoot && playerFoot !== 'both') return;
    }
    // Average the relevant attributes
    const attrVals = def.attrs.map(k => attr(player, k, 50));
    const avg = attrVals.reduce((s,v) => s + v, 0) / attrVals.length;
    // Boost proportional to player strength in that area
    total += (avg / 100) * def.boost;
  });
  return Math.min(total, 15); // Cap total weakness boost at 15
}

// ── COMPATIBILITY SCORE ──────────────────────────────────────────────────────
function weaknessFitScore(player, weaknesses) {
  const W = {
    'Insufficient Game Pace and Speed': ['pace','agility','stamina'],
    'Physical Fragility and Injury Risk': ['stamina','strength','composure'],
    'Lack of Physical Presence': ['strength','jumping','heading'],
    'Weak Defensive Base': ['defending','positioning','tackling'],
    'Poor Defensive Output': ['tackling','defending','positioning'],
    'Low Team Chemistry and Leadership': ['vision','passing','composure'],
    'Technical Deficiencies Under Pressure': ['composure','dribbling','passing'],
    'Tactical Awareness Gaps': ['positioning','composure','vision'],
    'Poor Goal Output': ['shooting','positioning','crossing']
  };
  const selected = Array.isArray(weaknesses) ? weaknesses : [];
  if (!selected.length) return 60;
  return avg(selected.map(w => avg((W[w] || []).map(k => attr(player, k, 50)), 55)), 60);
}

function roleFitScore(player, roles) {
  const R = {
    'Aerial Dominance': ['jumping','heading','strength'],
    'Vision and Creativity': ['vision','passing','dribbling','composure'],
    'Speed and Agility': ['pace','agility','stamina'],
    'Tactical Intelligence': ['positioning','vision','composure'],
    'Ball Retention Under Pressure': ['composure','dribbling','passing'],
    'Physical Resilience Work Rate': ['stamina','strength','defending'],
    'Defensive Impact': ['defending','tackling','positioning','stamina'],
    'Offensive Impact': ['shooting','dribbling','pace','crossing'],
    'Progression and Carrying': ['dribbling','pace','agility','vision'],
    'Leadership and Communication': ['vision','passing','composure']
  };
  const selected = Array.isArray(roles) ? roles : [];
  if (!selected.length) return 62;
  return avg(selected.map(r => avg((R[r] || []).map(k => attr(player, k, 50)), 58)), 62);
}

function playingStyleScore(player, style) {
  const S = {
    'Possession-Based Play': ['passing','composure','vision','dribbling'],
    'Counter-Attacking': ['pace','stamina','dribbling','composure'],
    'High Press': ['stamina','pace','defending','composure'],
    'Low Block': ['defending','positioning','tackling','stamina'],
    'Direct Play': ['pace','strength','heading','shooting'],
    'Wing Play': ['pace','crossing','dribbling','agility'],
    'Tiki-Taka': ['passing','vision','composure','dribbling'],
    'Gegenpressing': ['stamina','pace','defending','passing'],
    'Build-Up from the Back': ['passing','composure','vision','defending'],
    'Long Ball': ['heading','strength','jumping','pace'],
    'Total Football': ['vision','passing','stamina','dribbling'],
    'Compact Defence': ['defending','positioning','tackling'],
    'Vertical Play': ['pace','dribbling','shooting','stamina']
  };
  return style && S[style] ? avg(S[style].map(k => attr(player, k, 50)), 60) : 60;
}

function formationScore(player, formation) {
  if (!formation) return 60;
  const group = getPosGroup(player.positions || player.primary_position || player.specific_position);
  const map = {
    '4-4-2': { Goalkeeper: 60, Defender: 72, Midfielder: 70, Forward: 68 },
    '4-3-3': { Goalkeeper: 60, Defender: 66, Midfielder: 68, Forward: 78 },
    '3-5-2': { Goalkeeper: 60, Defender: 62, Midfielder: 80, Forward: 70 },
    '5-3-2': { Goalkeeper: 60, Defender: 82, Midfielder: 64, Forward: 66 },
    '4-2-3-1': { Goalkeeper: 60, Defender: 68, Midfielder: 78, Forward: 66 },
    '4-1-4-1': { Goalkeeper: 60, Defender: 68, Midfielder: 78, Forward: 60 },
    '4-5-1': { Goalkeeper: 60, Defender: 70, Midfielder: 82, Forward: 58 },
    '3-4-3': { Goalkeeper: 60, Defender: 58, Midfielder: 72, Forward: 78 },
    '5-4-1': { Goalkeeper: 60, Defender: 82, Midfielder: 72, Forward: 56 }
  };
  return (map[formation] && map[formation][group]) || 62;
}

function longTermGoalScore(player, goals) {
  const age = calcAge(player.date_of_birth) ?? 15;
  const G = {
    'Physical Growth Potential': age <= 12 ? 88 : age <= 14 ? 78 : age <= 16 ? 66 : 50,
    'Tactical Role Maturity': avg(['positioning','composure','vision'].map(k => attr(player, k, 50))),
    'Leadership and Coachability': avg(['composure','vision','passing'].map(k => attr(player, k, 50))),
    'Injury Risk and Physical Resilience': avg(['stamina','strength','composure'].map(k => attr(player, k, 50))),
    'Positional Depth Advantage': Array.isArray(player.positions) && player.positions.length > 1 ? 82 : 58,
    'Goal Contribution Potential': avg(['shooting','positioning','crossing','passing'].map(k => attr(player, k, 50))),
    'Financial Viability': avg([computeOverall(player), age <= 16 ? 82 : 64])
  };
  const selected = Array.isArray(goals) ? goals : [];
  if (!selected.length) return 60;
  return avg(selected.map(g => G[g] || 60), 60);
}

function matchEvidenceScore(player, matchHistory = []) {
  const apps = Number(player.appearances) || 0;
  const group = getPosGroup(player.positions || player.primary_position || player.specific_position);
  const matches = Array.isArray(matchHistory) ? matchHistory : [];
  const recentPerf = matches.length ? avg(matches.slice(0, 5).map(m => {
    const n = Number(m.performance_score);
    return Number.isFinite(n) ? (n <= 10 ? n * 10 : n) : null;
  }).filter(v => v !== null), 50) : 50;
  let output = 50;
  if (apps > 0) {
    const goals = Number(player.goals) || 0;
    const assists = Number(player.assists) || 0;
    const cleanSheets = Number(player.clean_sheets) || 0;
    const cards = (Number(player.yellow_cards) || 0) + (Number(player.red_cards) || 0) * 2;
    if (group === 'Forward') output = clamp(50 + (goals / apps) * 38 + (assists / apps) * 18 - (cards / apps) * 8);
    else if (group === 'Midfielder') output = clamp(50 + (assists / apps) * 32 + (goals / apps) * 16 - (cards / apps) * 8);
    else if (group === 'Goalkeeper') output = clamp(50 + (cleanSheets / apps) * 42 - (cards / apps) * 6);
    else output = clamp(50 + (cleanSheets / apps) * 30 + (assists / apps) * 10 - (cards / apps) * 8);
  }
  return avg([recentPerf, output], 50);
}

function dataConfidenceScore(player, matchHistory = []) {
  const apps = Math.max(Number(player.appearances) || 0, Array.isArray(matchHistory) ? matchHistory.length : 0);
  if (apps === 0) return 35;
  if (apps < 3) return 48;
  if (apps < 5) return 60;
  if (apps < 10) return 75;
  return 90;
}

function compatibilityScore(player, team, prefs = {}, matchHistory = []) {
  const group = getPosGroup(player.positions || player.primary_position);
  const age   = calcAge(player.date_of_birth) ?? 17;
  const overall = computeOverall(player);

  const teamWeaknesses = Array.isArray(team?.team_weaknesses) ? team.team_weaknesses : (prefs.teamWeaknesses || []);
  const roleExpectations = Array.isArray(team?.role_expectations) ? team.role_expectations : (prefs.roleExpectations || []);
  const longTermGoals = Array.isArray(team?.long_term_goals) ? team.long_term_goals : (prefs.longTermGoals || []);
  const style = team?.playing_style || prefs.playingStyle || '';
  const formation = team?.formation || prefs.formation || '';

  const technical = overall;
  const tactical = avg([
    weaknessFitScore(player, teamWeaknesses),
    roleFitScore(player, roleExpectations),
    playingStyleScore(player, style),
    formationScore(player, formation),
    longTermGoalScore(player, longTermGoals)
  ], 60);

  let ageFit;
  if (age <= 12)      ageFit = 74;
  else if (age <= 14) ageFit = 88;
  else if (age <= 18) ageFit = 100;
  else if (age <= 21) ageFit = 92;
  else if (age <= 24) ageFit = 78;
  else if (age <= 27) ageFit = 62;
  else if (age <= 30) ageFit = 44;
  else ageFit = 25;

  const physScore = clamp(avg([
    attr(player, 'pace', 50),
    attr(player, 'agility', 50),
    attr(player, 'strength', 50),
    attr(player, 'stamina', 50),
    70 + physicalFitBonus(player, group)
  ], 60));

  const statsScore = matchEvidenceScore(player, matchHistory);
  const confidence = dataConfidenceScore(player, matchHistory);

  let prefScore = 70;
  if (prefs.preferredPositions && prefs.preferredPositions.length) {
    const pp = normalisePos(player.positions || player.primary_position);
    const match = prefs.preferredPositions.some(p => pp.includes(p.toUpperCase()));
    prefScore = match ? 95 : 40;
  }
  if (prefs.ageGroups && prefs.ageGroups.length && player.age_group) {
    prefScore = avg([prefScore, prefs.ageGroups.includes(player.age_group) ? 95 : 45]);
  }

  const weaknesses = parseWeaknesses(team?.playing_style);
  const weaknessBonus = computeWeaknessBoost(player, weaknesses);

  const rawScore = clamp(
    technical * 0.30 + tactical * 0.25 + physScore * 0.15 +
    statsScore * 0.15 + ageFit * 0.08 + prefScore * 0.04 + confidence * 0.03
  );
  const score = clamp(rawScore + weaknessBonus);

  return {
    score: Math.round(score * 10) / 10,
    breakdown: {
      technical: Math.round(technical * 10) / 10,
      tacticalFit: Math.round(tactical * 10) / 10,
      physicalProfile: Math.round(physScore * 10) / 10,
      matchImpact: Math.round(statsScore * 10) / 10,
      ageDevelopmentFit: Math.round(ageFit * 10) / 10,
      preferenceFit: Math.round(prefScore * 10) / 10,
      dataConfidence: Math.round(confidence * 10) / 10,
      weaknessFit: Math.round(weaknessFitScore(player, teamWeaknesses) * 10) / 10,
      roleFit: Math.round(roleFitScore(player, roleExpectations) * 10) / 10,
      styleFit: Math.round(playingStyleScore(player, style) * 10) / 10,
      formationFit: Math.round(formationScore(player, formation) * 10) / 10,
      goalsFit: Math.round(longTermGoalScore(player, longTermGoals) * 10) / 10,
      weaknessBonus: Math.round(weaknessBonus * 10) / 10,
      weaknesses,
      group,
      overall: Math.round(overall * 10) / 10,
      age,
      appearances: Number(player.appearances) || 0
    }
  };
}

// ── PREDICTION SCORE ─────────────────────────────────────────────────────────
function predictionScore(player, matchHistory = []) {
  const age     = calcAge(player.date_of_birth) ?? 17;
  const group   = getPosGroup(player.positions || player.primary_position);
  const overall = computeOverall(player);

  let ageMulti;
  if (age <= 14)      ageMulti = 1.38;
  else if (age <= 16) ageMulti = 1.30;
  else if (age <= 18) ageMulti = 1.22;
  else if (age <= 20) ageMulti = 1.14;
  else if (age <= 22) ageMulti = 1.07;
  else if (age <= 24) ageMulti = 1.02;
  else ageMulti = 0.93;

  let formTrend = 0;
  if (matchHistory.length >= 3) {
    const recent = [...matchHistory].sort((a,b) => new Date(b.match_date)-new Date(a.match_date)).slice(0,5);
    const avg = recent.reduce((s,m) => s + (Number(m.performance_score)||50), 0) / recent.length;
    formTrend = (avg - 50) * 0.28;
  }

  const physBonus = physicalFitBonus(player, group) * 0.5;
  const rawPot = clamp(overall * ageMulti + formTrend + physBonus);

  const peakAge = group === 'Goalkeeper' ? 29 : group === 'Defender' ? 27 : group === 'Midfielder' ? 27 : 25;
  const trajectory = formTrend > 4 ? 'rising' : formTrend < -4 ? 'declining' : 'stable';

  return {
    score: Math.round(rawPot * 10) / 10, peakAge, trajectory,
    currentOverall:  Math.round(overall*10)/10,
    potentialOverall: Math.round(rawPot*10)/10,
    formTrend: Math.round(formTrend*10)/10,
  };
}

// ── TRANSFER VALUE ────────────────────────────────────────────────────────────
const TIER_BASE = { 1:50000000,2:15000000,3:5000000,4:1500000,5:500000,6:150000,7:40000,8:15000,9:5000,10:1000 };

function transferValue(player, team, compatibility = 50) {
  const age   = calcAge(player.date_of_birth) ?? 17;
  const group = getPosGroup(player.positions || player.primary_position);
  const tier  = Math.min(10, Math.max(1, Number(team?.tier) || 5));
  const base  = TIER_BASE[tier] || 50000;
  const overall = computeOverall(player);

  let ratingF;
  if (overall >= 90)      ratingF = 1.0;
  else if (overall >= 80) ratingF = 0.4 + (overall-80)/10*0.6;
  else if (overall >= 70) ratingF = 0.10 + (overall-70)/10*0.3;
  else if (overall >= 60) ratingF = 0.02 + (overall-60)/10*0.08;
  else ratingF = (overall/60)*0.02;

  let ageFactor;
  if (age <= 14)      ageFactor = 0.45;
  else if (age <= 16) ageFactor = 0.80;
  else if (age <= 18) ageFactor = 1.15;
  else if (age <= 21) ageFactor = 1.25;
  else if (age <= 24) ageFactor = 1.18;
  else if (age <= 27) ageFactor = 1.00;
  else if (age <= 30) ageFactor = 0.72;
  else if (age <= 33) ageFactor = 0.42;
  else ageFactor = 0.18;

  const gkPremium   = group === 'Goalkeeper' ? 1.06 : 1.0;
  const compatFactor= 0.80 + (compatibility/100)*0.40;
  const raw = base * ratingF * ageFactor * gkPremium * compatFactor;
  const val = Math.round(raw/500)*500;
  const fmt = val >= 1000000 ? '£'+(val/1000000).toFixed(2)+'M' : val >= 1000 ? '£'+(val/1000).toFixed(0)+'K' : '£'+val;
  return { value: val, valueFormatted: fmt,
    breakdown: { base, ratingF: Math.round(ratingF*1000)/1000, ageFactor, gkPremium,
      compatFactor: Math.round(compatFactor*1000)/1000, overall: Math.round(overall*10)/10, age, group, tier }
  };
}

// ── PREDICTED SALARY ─────────────────────────────────────────────────────────
function predictedSalary(player, team) {
  const tv = transferValue(player, team, 50);
  const weekly = Math.round((tv.value * 0.0018) / 100) * 100;
  const fmt = weekly >= 1000 ? '£'+(weekly/1000).toFixed(1)+'K/week' : '£'+weekly+'/week';
  return { weeklyGross: weekly, weeklyFormatted: fmt, transferValue: tv.value };
}

// ── FULL ANALYSIS ─────────────────────────────────────────────────────────────
function analysePlayer(player, team, matchHistory = [], scoutPrefs = {}) {
  const compat  = compatibilityScore(player, team, scoutPrefs, matchHistory);
  const predict = predictionScore(player, matchHistory);
  const value   = transferValue(player, team, compat.score);
  const salary  = predictedSalary(player, team);
  return {
    compatibilityScore:      compat.score,
    compatibilityBreakdown:  compat.breakdown,
    predictionScore:         predict.score,
    predictionDetails:       predict,
    transferValue:           value.value,
    transferValueFormatted:  value.valueFormatted,
    transferValueBreakdown:  value.breakdown,
    predictedSalaryWeekly:   salary.weeklyGross,
    predictedSalaryFormatted:salary.weeklyFormatted,
  };
}


// Grassroots transfer value (Section 4) — U6-U16 specific ranges
function grassrootsTransferValue(player) {
const group = getPosGroup(player.positions || player.primary_position || player.specific_position);
const age = calcAge(player.date_of_birth) ?? 12;
const overall = computeOverall(player); // 0-100
const position = String(player.specific_position || player.primary_position || '').toUpperCase();

// Base values by position. Attacking roles carry a higher scarcity premium.
const BASE = { Forward: 78000, Midfielder: 62000, Defender: 52000, Goalkeeper: 48000 };
if (['ST','CF','LW','RW','CAM'].includes(position)) BASE[group] = Math.max(BASE[group] || 0, 82000);
if (['CB','LCB','RCB','CDM'].includes(position)) BASE[group] = Math.max(BASE[group] || 0, 56000);
const base = BASE[group] || 52000;

const KEY_ATTRS = {
  Forward: ['shooting','positioning','pace','dribbling','composure'],
  Midfielder: ['passing','vision','composure','stamina','dribbling'],
  Defender: ['defending','tackling','positioning','heading','strength'],
  Goalkeeper: ['gk_reflexes','gk_handling','gk_positioning','gk_distribution','composure']
};
const keyAttrs = KEY_ATTRS[group] || KEY_ATTRS.Midfielder;
const positionalScore = avg(keyAttrs.map(k => attr(player, k, 50)), overall);
const creativity = avg([attr(player,'passing',50), attr(player,'vision',50), attr(player,'dribbling',50)], 50);
const outputScore = group === 'Forward'
  ? avg([attr(player,'shooting',50), attr(player,'positioning',50), attr(player,'pace',50)], 50)
  : group === 'Midfielder'
    ? creativity
    : group === 'Defender'
      ? avg([attr(player,'defending',50), attr(player,'tackling',50), attr(player,'heading',50)], 50)
      : avg([attr(player,'gk_reflexes',50), attr(player,'gk_handling',50), attr(player,'gk_distribution',50)], 50);

// Rating multiplier
let ratingMult;
if (overall >= 96) ratingMult = 1.5;
else if (overall >= 86) ratingMult = 1.3;
else if (overall >= 76) ratingMult = 1.1;
else if (overall >= 61) ratingMult = 0.9;
else if (overall >= 41) ratingMult = 0.7;
else ratingMult = 0.4;
ratingMult *= 0.85 + (positionalScore / 100) * 0.28 + (outputScore / 100) * 0.12;

// Age runway bonus
let ageBonus = 1.0;
if (age <= 9) ageBonus = 1.12;
else if (age <= 12) ageBonus = 1.08;
else if (age <= 14) ageBonus = 1.04;
else if (age >= 16) ageBonus = 0.92;

// Appearances confidence
const apps = Number(player.appearances) || 0;
let appsMult;
if (apps === 0) appsMult = 0.5;
else if (apps <= 4) appsMult = 0.7;
else if (apps <= 9) appsMult = 0.85;
else appsMult = 1.0;

let value = base * ratingMult * ageBonus * appsMult;
value = Math.max(5000, Math.min(200000, value));
value = Math.round(value / 1000) * 1000;
const fmt = value >= 1000 ? '\u00a3' + (value/1000).toFixed(0) + 'K' : '\u00a3' + value;
return { value, valueFormatted: fmt, breakdown: { base, group, position, overall: Math.round(overall), positionalScore: Math.round(positionalScore), outputScore: Math.round(outputScore), age, appsMult, ageBonus } };
}

module.exports = { compatibilityScore, predictionScore, transferValue, predictedSalary,
  analysePlayer, computeOverall, grassrootsTransferValue, getPosGroup, calcAge, getHeightMid, getBuildMid, parseWeaknesses };
