'use strict';

const FORWARD_POS = ['ST', 'LS', 'RS', 'LW', 'RW', 'CF', 'SS'];
const MIDFIELD_POS = ['CDM', 'CM', 'RCM', 'LCM', 'RDM', 'LDM', 'LM', 'RM', 'CAM', 'LAM', 'RAM', 'DM', 'AM', 'B2B'];
const DEFENDER_POS = ['CB', 'RCB', 'LCB', 'RB', 'LB', 'RWB', 'LWB', 'SW', 'BPD'];
const GK_POS = ['GK'];

const OUTFIELD_ATTRS = ['pace', 'agility', 'strength', 'stamina', 'jumping', 'composure', 'shooting', 'passing', 'dribbling', 'defending', 'crossing', 'vision', 'positioning', 'heading', 'tackling'];
const GK_ATTRS = ['gk_diving', 'gk_handling', 'gk_kicking', 'gk_reflexes', 'gk_positioning', 'gk_distribution', 'gk_communication', 'gk_sweeping'];
const ALL_ATTRS = OUTFIELD_ATTRS.concat(GK_ATTRS);

const ATTR_LABELS = {
  pace: 'Pace', agility: 'Agility', strength: 'Strength', stamina: 'Stamina', jumping: 'Jumping',
  composure: 'Composure', shooting: 'Shooting', passing: 'Passing', dribbling: 'Dribbling',
  defending: 'Defending', crossing: 'Crossing', vision: 'Vision', positioning: 'Positioning',
  heading: 'Heading', tackling: 'Tackling', gk_diving: 'GK Diving', gk_handling: 'GK Handling',
  gk_kicking: 'GK Kicking', gk_reflexes: 'GK Reflexes', gk_positioning: 'GK Positioning',
  gk_distribution: 'GK Distribution', gk_communication: 'GK Communication', gk_sweeping: 'GK Sweeping'
};

const ROLE_WEIGHTS = {
  GK: { gk_reflexes: 0.20, gk_diving: 0.16, gk_handling: 0.16, gk_positioning: 0.16, gk_distribution: 0.11, gk_kicking: 0.08, gk_communication: 0.07, gk_sweeping: 0.06 },
  CB: { defending: 0.20, tackling: 0.17, positioning: 0.17, heading: 0.13, strength: 0.12, composure: 0.10, jumping: 0.07, pace: 0.04 },
  BPD: { passing: 0.18, composure: 0.17, defending: 0.15, positioning: 0.14, vision: 0.12, tackling: 0.10, strength: 0.08, pace: 0.06 },
  RB: { pace: 0.16, stamina: 0.15, tackling: 0.14, defending: 0.13, crossing: 0.13, positioning: 0.12, agility: 0.09, passing: 0.08 },
  LB: { pace: 0.16, stamina: 0.15, tackling: 0.14, defending: 0.13, crossing: 0.13, positioning: 0.12, agility: 0.09, passing: 0.08 },
  RWB: { pace: 0.17, stamina: 0.17, crossing: 0.15, dribbling: 0.12, tackling: 0.11, positioning: 0.10, passing: 0.09, agility: 0.09 },
  LWB: { pace: 0.17, stamina: 0.17, crossing: 0.15, dribbling: 0.12, tackling: 0.11, positioning: 0.10, passing: 0.09, agility: 0.09 },
  CDM: { positioning: 0.17, tackling: 0.16, defending: 0.15, passing: 0.14, composure: 0.13, stamina: 0.10, vision: 0.09, strength: 0.06 },
  CM: { passing: 0.18, vision: 0.16, composure: 0.14, positioning: 0.13, stamina: 0.11, dribbling: 0.10, tackling: 0.09, agility: 0.09 },
  B2B: { stamina: 0.17, passing: 0.14, tackling: 0.13, positioning: 0.12, strength: 0.11, dribbling: 0.11, pace: 0.11, composure: 0.11 },
  CAM: { vision: 0.19, passing: 0.16, dribbling: 0.15, composure: 0.13, shooting: 0.12, positioning: 0.10, agility: 0.08, pace: 0.07 },
  LW: { pace: 0.17, dribbling: 0.17, crossing: 0.15, agility: 0.12, shooting: 0.11, positioning: 0.10, composure: 0.09, stamina: 0.09 },
  RW: { pace: 0.17, dribbling: 0.17, crossing: 0.15, agility: 0.12, shooting: 0.11, positioning: 0.10, composure: 0.09, stamina: 0.09 },
  CF: { shooting: 0.17, positioning: 0.16, composure: 0.14, dribbling: 0.13, vision: 0.12, passing: 0.11, strength: 0.09, pace: 0.08 },
  ST: { shooting: 0.20, positioning: 0.18, composure: 0.14, pace: 0.12, strength: 0.11, heading: 0.09, dribbling: 0.08, jumping: 0.08 },
  SS: { dribbling: 0.16, shooting: 0.15, vision: 0.14, passing: 0.13, positioning: 0.13, composure: 0.12, pace: 0.09, agility: 0.08 }
};

const POSITION_GROUP = {
  GK: 'Goalkeeper', CB: 'Defender', BPD: 'Defender', RB: 'Defender', LB: 'Defender', RWB: 'Defender', LWB: 'Defender',
  CDM: 'Midfielder', CM: 'Midfielder', B2B: 'Midfielder', CAM: 'Midfielder',
  LW: 'Forward', RW: 'Forward', CF: 'Forward', ST: 'Forward', SS: 'Forward'
};

const HEIGHT_MAP = { very_short: 160, short: 167, average: 174, tall: 181, very_tall: 188 };
const BUILD_MAP = { very_slight: 57, slight: 63, lean: 68, athletic: 74, stocky: 80, powerful: 87, very_powerful: 95 };

const WEAKNESS_ATTRS = {
  'Insufficient Game Pace and Speed': ['pace', 'agility', 'stamina'],
  'Physical Fragility and Injury Risk': ['stamina', 'strength', 'composure'],
  'Lack of Physical Presence': ['strength', 'jumping', 'heading'],
  'Weak Defensive Base': ['defending', 'positioning', 'tackling'],
  'Poor Defensive Output': ['tackling', 'defending', 'positioning'],
  'Low Team Chemistry and Leadership': ['vision', 'passing', 'composure'],
  'Technical Deficiencies Under Pressure': ['composure', 'dribbling', 'passing'],
  'Tactical Awareness Gaps': ['positioning', 'composure', 'vision'],
  'Poor Goal Output': ['shooting', 'positioning', 'crossing']
};

const WEAKNESS_ALIASES = {
  insufficient_game_pace_and_speed: 'Insufficient Game Pace and Speed',
  physical_fragility_and_injury_risk: 'Physical Fragility and Injury Risk',
  lack_of_physical_presence: 'Lack of Physical Presence',
  weak_defensive_base: 'Weak Defensive Base',
  poor_defensive_output: 'Poor Defensive Output',
  low_team_chemistry_and_leadership: 'Low Team Chemistry and Leadership',
  technical_deficiencies_under_pressure: 'Technical Deficiencies Under Pressure',
  tactical_awareness_gaps: 'Tactical Awareness Gaps',
  poor_goal_output: 'Poor Goal Output',
  poor_set_pieces: 'Poor Goal Output',
  high_defensive_line: 'Weak Defensive Base',
  slow_build_up: 'Tactical Awareness Gaps',
  slow_buildup: 'Tactical Awareness Gaps',
  weak_left_flank: 'Insufficient Game Pace and Speed',
  weak_right_flank: 'Insufficient Game Pace and Speed',
  pace_exploitable: 'Insufficient Game Pace and Speed',
  poor_second_ball: 'Tactical Awareness Gaps',
  physical_vulnerability: 'Lack of Physical Presence',
  poor_aerial: 'Lack of Physical Presence',
  weak_transitions: 'Tactical Awareness Gaps',
  poor_gk_distribution: 'Low Team Chemistry and Leadership',
  lack_creativity: 'Low Team Chemistry and Leadership'
};

const ROLE_EXPECTATION_ATTRS = {
  'Aerial Dominance': ['jumping', 'heading', 'strength', 'positioning'],
  'Vision and Creativity': ['vision', 'passing', 'dribbling', 'composure'],
  'Speed and Agility': ['pace', 'agility', 'stamina'],
  'Tactical Intelligence': ['positioning', 'vision', 'composure'],
  'Ball Retention Under Pressure': ['composure', 'dribbling', 'passing', 'strength'],
  'Physical Resilience Work Rate': ['stamina', 'strength', 'defending'],
  'Defensive Impact': ['defending', 'tackling', 'positioning', 'stamina'],
  'Offensive Impact': ['shooting', 'dribbling', 'pace', 'crossing'],
  'Progression and Carrying': ['dribbling', 'pace', 'agility', 'vision'],
  'Leadership and Communication': ['vision', 'passing', 'composure']
};

const STYLE_ATTRS = {
  'Possession-Based Play': ['passing', 'composure', 'vision', 'dribbling'],
  'Counter-Attacking': ['pace', 'stamina', 'dribbling', 'composure'],
  'High Press': ['stamina', 'pace', 'defending', 'composure'],
  'Low Block': ['defending', 'positioning', 'tackling', 'stamina'],
  'Direct Play': ['pace', 'strength', 'heading', 'shooting'],
  'Wing Play': ['pace', 'crossing', 'dribbling', 'agility'],
  'Tiki-Taka': ['passing', 'vision', 'composure', 'dribbling'],
  'Gegenpressing': ['stamina', 'pace', 'defending', 'passing'],
  'Build-Up from the Back': ['passing', 'composure', 'vision', 'defending'],
  'Long Ball': ['heading', 'strength', 'jumping', 'pace'],
  'Total Football': ['vision', 'passing', 'stamina', 'dribbling'],
  'Compact Defence': ['defending', 'positioning', 'tackling'],
  'Vertical Play': ['pace', 'dribbling', 'shooting', 'stamina']
};

const LONG_TERM_ATTRS = {
  'Physical Growth Potential': ['pace', 'agility', 'strength', 'stamina'],
  'Tactical Role Maturity': ['positioning', 'composure', 'vision'],
  'Leadership and Coachability': ['composure', 'vision', 'passing'],
  'Injury Risk and Physical Resilience': ['stamina', 'strength', 'composure'],
  'Positional Depth Advantage': ['passing', 'vision', 'stamina', 'composure'],
  'Goal Contribution Potential': ['shooting', 'positioning', 'crossing', 'passing'],
  'Financial Viability': ['positioning', 'composure', 'pace', 'passing']
};

function clamp(n, min = 0, max = 100) {
  const value = Number(n);
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(n, places = 1) {
  const f = Math.pow(10, places);
  return Math.round((Number(n) || 0) * f) / f;
}

function normalisePos(p) {
  if (!p) return [];
  if (Array.isArray(p)) return p.map(x => String(x).trim().toUpperCase()).filter(Boolean);
  return String(p).split(/[,\/|]/g).map(x => x.trim().toUpperCase()).filter(Boolean);
}

function getPrimaryPosition(player = {}) {
  return normalisePos(player.positions || player.primary_position || player.specific_position || player.position_group)[0] || String(player.specific_position || player.primary_position || '').toUpperCase() || 'CM';
}

function getPosGroup(pos) {
  const pp = normalisePos(pos);
  if (!pp.length) return 'Midfielder';
  if (pp.some(p => GK_POS.includes(p)) || String(pos || '').toLowerCase().includes('goal')) return 'Goalkeeper';
  if (pp.some(p => FORWARD_POS.includes(p))) return 'Forward';
  if (pp.some(p => DEFENDER_POS.includes(p))) return 'Defender';
  return 'Midfielder';
}

function ageFromPlayer(player = {}) {
  const groupMatch = String(player.age_group || player.ageGroup || '').trim().toUpperCase().match(/^U(\d+)$/);
  if (groupMatch) return Number(groupMatch[1]);
  const storedAge = Number(player.age);
  if (Number.isFinite(storedAge) && storedAge >= 7 && storedAge <= 16) return storedAge;
  return null;
}

function rangeMidpoint(rangeStr, fallback = 50) {
  if (!rangeStr) return fallback;
  const m = String(rangeStr).match(/(\d+(?:\.\d+)?)[^\d]+(\d+(?:\.\d+)?)/);
  if (!m) return parseFloat(rangeStr) || fallback;
  return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
}

function getHeightMid(player = {}) {
  if (player.height_range_cm) return rangeMidpoint(player.height_range_cm, 174);
  if (player.height_category && HEIGHT_MAP[player.height_category]) return HEIGHT_MAP[player.height_category];
  if (player.height_cm) return Number(player.height_cm) || 174;
  return 174;
}

function getBuildMid(player = {}) {
  if (player.weight_range_kg) return rangeMidpoint(player.weight_range_kg, 74);
  if (player.build_category && BUILD_MAP[player.build_category]) return BUILD_MAP[player.build_category];
  if (player.weight_kg) return Number(player.weight_kg) || 74;
  return 74;
}

function attr100(player = {}, key, fallback = 50) {
  const raw = Number(player[key]);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return clamp(raw <= 10 ? raw * 10 : raw, 0, 100);
}

function attr10(player = {}, key, fallback = 5) {
  return round(attr100(player, key, fallback * 10) / 10, 1);
}

function weightedScore(player, weights, fallback = 55) {
  let total = 0;
  let used = 0;
  Object.keys(weights || {}).forEach(key => {
    const w = Number(weights[key]) || 0;
    total += attr100(player, key, fallback) * w;
    used += w;
  });
  return used ? clamp(total / used) : fallback;
}

function avg(values, fallback = 50) {
  const clean = values.map(Number).filter(Number.isFinite);
  if (!clean.length) return fallback;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

function formatCurrency(value) {
  const n = Math.max(0, Math.round(Number(value) || 0));
  if (n >= 1000000) return 'GBP ' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return 'GBP ' + (n / 1000).toFixed(0) + 'K';
  return 'GBP ' + n.toLocaleString('en-GB');
}

function ageBand(age) {
  if (age === null || age === undefined) return { key: 'UNKNOWN', label: 'Unknown age band', rating: 58, valueLabel: 'Recruitment Value Estimate', runway: 0.82 };
  if (age <= 8) return { key: 'U7_U8_FOUNDATION', label: 'U7-U8 Foundation', rating: 72, valueLabel: 'Development Value Index', runway: 1.26 };
  if (age <= 11) return { key: 'U9_U11_DEVELOPMENT', label: 'U9-U11 Development', rating: 78, valueLabel: 'Training Value Estimate', runway: 1.18 };
  if (age <= 14) return { key: 'U12_U14_PRE_ACADEMY', label: 'U12-U14 Pre-Academy', rating: 85, valueLabel: 'Recruitment Value Estimate', runway: 1.08 };
  if (age <= 16) return { key: 'U15_U16_RECRUITMENT_READINESS', label: 'U15-U16 Recruitment Readiness', rating: 92, valueLabel: 'Transfer Value Estimate', runway: 0.98 };
  return { key: 'POST_PLATFORM', label: 'Post-platform age band', rating: 70, valueLabel: 'Transfer Value Estimate', runway: 0.82 };
}

function cleanFact(f = {}) {
  return {
    goals: Number(f.goals || f.goals_scored || 0),
    assists: Number(f.assists || 0),
    yellow_cards: Number(f.yellow_cards || 0),
    red_cards: Number(f.red_cards || 0),
    goals_conceded: Number(f.goals_conceded || 0),
    clean_sheet: !!(f.clean_sheet || f.clean_sheets),
    subs_in: Number(f.subs_in || f.subbed_in || 0),
    subs_out: Number(f.subs_out || f.subbed_out || 0),
    performance_score: f.performance_score !== null && f.performance_score !== undefined ? Number(f.performance_score) : null
  };
}

function sanitizeMatchFacts(matchHistory = []) {
  return (Array.isArray(matchHistory) ? matchHistory : []).map(cleanFact);
}

function dataConfidenceScore(player = {}, matchHistory = []) {
  const facts = sanitizeMatchFacts(matchHistory);
  const apps = Math.max(Number(player.appearances) || 0, facts.length);
  if (apps <= 0) return { score: 32, label: 'Very Low', matches: apps, note: 'No recorded match facts yet.' };
  if (apps < 3) return { score: 46, label: 'Low', matches: apps, note: 'Based on fewer than 3 recorded matches.' };
  if (apps < 5) return { score: 58, label: 'Low', matches: apps, note: 'Based on fewer than 5 recorded matches.' };
  if (apps < 10) return { score: 74, label: 'Medium', matches: apps, note: '5 to 9 recorded matches support this read.' };
  if (apps < 18) return { score: 86, label: 'High', matches: apps, note: '10 or more recorded matches support this read.' };
  return { score: 93, label: 'Very High', matches: apps, note: 'A strong match evidence base supports this read.' };
}

function physicalFitScore(player = {}, group = 'Midfielder') {
  const h = getHeightMid(player);
  const w = getBuildMid(player);
  let targetH = 174;
  let targetW = 72;
  if (group === 'Goalkeeper') { targetH = 186; targetW = 80; }
  if (group === 'Defender') { targetH = 181; targetW = 78; }
  if (group === 'Forward') { targetH = 176; targetW = 73; }
  const heightScore = clamp(100 - Math.abs(h - targetH) * 2.1, 45, 100);
  const buildScore = clamp(100 - Math.abs(w - targetW) * 1.8, 45, 100);
  const speedPower = group === 'Goalkeeper'
    ? avg([attr100(player, 'jumping'), attr100(player, 'strength'), attr100(player, 'composure')])
    : avg([attr100(player, 'pace'), attr100(player, 'agility'), attr100(player, 'strength'), attr100(player, 'stamina'), attr100(player, 'jumping')]);
  return clamp(heightScore * 0.25 + buildScore * 0.20 + speedPower * 0.55);
}

function matchEvidenceScore(player = {}, matchHistory = []) {
  const facts = sanitizeMatchFacts(matchHistory);
  const apps = Math.max(Number(player.appearances) || 0, facts.length);
  const group = getPosGroup(player.positions || player.primary_position || player.specific_position || player.position_group);
  const goals = facts.length ? facts.reduce((s, f) => s + f.goals, 0) : Number(player.goals) || 0;
  const assists = facts.length ? facts.reduce((s, f) => s + f.assists, 0) : Number(player.assists) || 0;
  const cleanSheets = facts.length ? facts.reduce((s, f) => s + (f.clean_sheet ? 1 : 0), 0) : Number(player.clean_sheets) || 0;
  const yellow = facts.length ? facts.reduce((s, f) => s + f.yellow_cards, 0) : Number(player.yellow_cards) || 0;
  const red = facts.length ? facts.reduce((s, f) => s + f.red_cards, 0) : Number(player.red_cards) || 0;
  const perfValues = facts.map(f => Number.isFinite(f.performance_score) ? (f.performance_score <= 10 ? f.performance_score * 10 : f.performance_score) : null).filter(v => v !== null);
  const recentPerf = perfValues.length ? avg(perfValues.slice(0, 5), 55) : 55;
  const perApp = Math.max(1, apps || facts.length || 1);
  let production = 52;
  if (group === 'Goalkeeper') production = 50 + (cleanSheets / perApp) * 34 - (yellow / perApp) * 6 - (red / perApp) * 18;
  else if (group === 'Defender') production = 50 + (cleanSheets / perApp) * 24 + (assists / perApp) * 12 - (yellow / perApp) * 7 - (red / perApp) * 20;
  else if (group === 'Midfielder') production = 50 + (assists / perApp) * 32 + (goals / perApp) * 16 - (yellow / perApp) * 7 - (red / perApp) * 20;
  else production = 50 + (goals / perApp) * 38 + (assists / perApp) * 18 - (yellow / perApp) * 7 - (red / perApp) * 20;
  return clamp(recentPerf * 0.58 + production * 0.42);
}

function disciplineScore(player = {}, matchHistory = []) {
  const facts = sanitizeMatchFacts(matchHistory);
  const apps = Math.max(Number(player.appearances) || 0, facts.length, 1);
  const yellow = facts.length ? facts.reduce((s, f) => s + f.yellow_cards, 0) : Number(player.yellow_cards) || 0;
  const red = facts.length ? facts.reduce((s, f) => s + f.red_cards, 0) : Number(player.red_cards) || 0;
  return clamp(96 - (yellow / apps) * 18 - (red / apps) * 46, 30, 100);
}

function availabilityScore(player = {}, matchHistory = []) {
  const facts = sanitizeMatchFacts(matchHistory);
  const apps = Math.max(Number(player.appearances) || 0, facts.length);
  const subOut = facts.reduce((s, f) => s + f.subs_out, 0);
  const subIn = facts.reduce((s, f) => s + f.subs_in, 0);
  const sample = apps >= 10 ? 92 : apps >= 5 ? 78 : apps >= 1 ? 62 : 42;
  const subSignal = facts.length ? clamp(78 + (subIn / Math.max(1, facts.length)) * 6 - (subOut / Math.max(1, facts.length)) * 8, 50, 92) : 65;
  return clamp(sample * 0.70 + subSignal * 0.30);
}

function technicalByGroup(player = {}, group = 'Midfielder') {
  if (group === 'Goalkeeper') {
    const hasGk = GK_ATTRS.some(k => Number(player[k]) > 0);
    if (hasGk) return weightedScore(player, ROLE_WEIGHTS.GK);
    return avg([attr100(player, 'positioning'), attr100(player, 'composure'), attr100(player, 'jumping'), attr100(player, 'strength'), attr100(player, 'passing')]);
  }
  if (group === 'Forward') return avg([weightedScore(player, ROLE_WEIGHTS.ST), weightedScore(player, ROLE_WEIGHTS.LW), weightedScore(player, ROLE_WEIGHTS.CF)]);
  if (group === 'Defender') return avg([weightedScore(player, ROLE_WEIGHTS.CB), weightedScore(player, ROLE_WEIGHTS.RB), weightedScore(player, ROLE_WEIGHTS.CDM)]);
  return avg([weightedScore(player, ROLE_WEIGHTS.CM), weightedScore(player, ROLE_WEIGHTS.CAM), weightedScore(player, ROLE_WEIGHTS.CDM)]);
}

function generatedAttributeScores(player = {}) {
  return {
    creativity: round(attr100(player, 'passing') * 0.34 + attr100(player, 'vision') * 0.46 + attr100(player, 'dribbling') * 0.20),
    ball_progression: round(attr100(player, 'dribbling') * 0.36 + attr100(player, 'passing') * 0.30 + attr100(player, 'pace') * 0.20 + attr100(player, 'vision') * 0.14),
    defensive_reliability: round(attr100(player, 'defending') * 0.42 + attr100(player, 'tackling') * 0.34 + attr100(player, 'positioning') * 0.24),
    attacking_threat: round(attr100(player, 'shooting') * 0.42 + attr100(player, 'positioning') * 0.25 + attr100(player, 'pace') * 0.18 + attr100(player, 'composure') * 0.15),
    pressure_resistance: round(attr100(player, 'composure') * 0.45 + attr100(player, 'dribbling') * 0.25 + attr100(player, 'passing') * 0.20 + attr100(player, 'strength') * 0.10)
  };
}

function calculateOverallBreakdown(player = {}, matchHistory = []) {
  const age = ageFromPlayer(player);
  const band = ageBand(age);
  const primaryPosition = getPrimaryPosition(player);
  const group = getPosGroup(player.positions || player.primary_position || player.specific_position || player.position_group);
  const technicalScore = technicalByGroup(player, group);
  const tacticalIQScore = avg([attr100(player, 'positioning'), attr100(player, 'vision'), attr100(player, 'composure'), attr100(player, 'passing'), group === 'Goalkeeper' ? attr100(player, 'gk_communication') : attr100(player, 'defending')], 58);
  const physicalProfileScore = physicalFitScore(player, group);
  const mentalCoachabilityScore = avg([attr100(player, 'composure'), attr100(player, 'stamina'), attr100(player, 'vision'), attr100(player, 'passing')], 58);
  const matchOutputScore = matchEvidenceScore(player, matchHistory);
  const discScore = disciplineScore(player, matchHistory);
  const availScore = availabilityScore(player, matchHistory);
  const confidence = dataConfidenceScore(player, matchHistory);
  const generated = generatedAttributeScores(player);

  const currentReadiness = clamp(
    technicalScore * 0.30 +
    tacticalIQScore * 0.19 +
    physicalProfileScore * 0.14 +
    mentalCoachabilityScore * 0.13 +
    matchOutputScore * 0.13 +
    discScore * 0.06 +
    availScore * 0.05
  );

  const potentialRating = clamp(
    currentReadiness * 0.58 +
    band.rating * 0.17 +
    physicalProfileScore * 0.10 +
    tacticalIQScore * 0.08 +
    confidence.score * 0.07 +
    (band.runway - 1) * 18
  );

  const finalScore = clamp(
    currentReadiness * 0.64 +
    potentialRating * 0.17 +
    band.rating * 0.08 +
    confidence.score * 0.06 +
    matchOutputScore * 0.05
  );

  const warnings = [];
  if (confidence.score < 60) warnings.push('Low match evidence: add more match facts before relying heavily on this score.');
  if (age !== null && age > 16) warnings.push('This player is outside the normal ScoutLink U7-U16 age band.');
  if (discScore < 65) warnings.push('Discipline is materially reducing the player rating.');

  return {
    scoringVersion: 'v3',
    finalScore: round(finalScore),
    currentReadiness: round(currentReadiness),
    ageBandRating: round(band.rating),
    potentialRating: round(potentialRating),
    technicalScore: round(technicalScore),
    tacticalIQScore: round(tacticalIQScore),
    physicalProfileScore: round(physicalProfileScore),
    mentalCoachabilityScore: round(mentalCoachabilityScore),
    matchOutputScore: round(matchOutputScore),
    disciplineScore: round(discScore),
    availabilityScore: round(availScore),
    dataConfidenceScore: round(confidence.score),
    dataConfidenceLabel: confidence.label,
    dataConfidenceNote: confidence.note,
    evidenceMatches: confidence.matches,
    primaryPosition,
    positionGroup: group,
    age,
    ageBand: band.key,
    ageBandLabel: band.label,
    generatedAttributes: generated,
    explanation: 'ScoutLink blends coach-rated attributes, age-band context, physical profile, allowed match facts, discipline and data confidence into a position-aware overall rating.',
    warnings
  };
}

function computeOverall(player, matchHistory = []) {
  return clamp(Math.round(calculateOverallBreakdown(player, matchHistory).finalScore));
}

function positionPhysicalAdjustment(player, role) {
  const group = POSITION_GROUP[role] || 'Midfielder';
  const base = physicalFitScore(player, group);
  const h = getHeightMid(player);
  let bonus = 0;
  if (role === 'GK' && h >= 184) bonus += 4;
  if (['CB', 'BPD', 'ST'].includes(role) && h >= 180) bonus += 3;
  if (['RB', 'LB', 'RWB', 'LWB', 'LW', 'RW'].includes(role) && attr100(player, 'pace') >= 75) bonus += 3;
  return clamp(base + bonus);
}

function calculatePositionRatings(player = {}, matchHistory = []) {
  const breakdown = calculateOverallBreakdown(player, matchHistory);
  const currentPositions = normalisePos(player.positions || player.primary_position || player.specific_position);
  const ratings = {};
  Object.keys(ROLE_WEIGHTS).forEach(role => {
    const roleBase = weightedScore(player, ROLE_WEIGHTS[role], 55);
    const physical = positionPhysicalAdjustment(player, role);
    const groupFit = getPosGroup(player.positions || player.primary_position || player.specific_position || player.position_group) === (POSITION_GROUP[role] || 'Midfielder') ? 4 : -2;
    const match = breakdown.matchOutputScore;
    const confidence = breakdown.dataConfidenceScore;
    const score = clamp(roleBase * 0.60 + physical * 0.15 + breakdown.tacticalIQScore * 0.10 + match * 0.08 + confidence * 0.04 + breakdown.potentialRating * 0.03 + groupFit);
    ratings[role] = round(score);
  });
  const sorted = Object.keys(ratings).map(role => ({ role, score: ratings[role], group: POSITION_GROUP[role] || 'Midfielder' })).sort((a, b) => b.score - a.score);
  const bestCurrent = currentPositions.length
    ? sorted.find(r => currentPositions.includes(r.role)) || sorted[0]
    : sorted[0];
  const bestFuture = sorted
    .map(r => ({ ...r, futureScore: round(clamp(r.score * 0.82 + breakdown.potentialRating * 0.18 + (r.group === breakdown.positionGroup ? 2 : 0))) }))
    .sort((a, b) => b.futureScore - a.futureScore)[0];
  const conversions = sorted
    .filter(r => r.role !== bestCurrent.role && r.score >= bestCurrent.score - 6)
    .slice(0, 4)
    .map(r => ({
      role: r.role,
      score: r.score,
      reason: r.group === breakdown.positionGroup ? 'Natural alternative in the same position family.' : 'Cross-role fit supported by transferable attributes.'
    }));
  return {
    ratings,
    sorted,
    bestCurrentPosition: bestCurrent.role,
    bestCurrentScore: bestCurrent.score,
    bestFuturePosition: bestFuture.role,
    bestFutureScore: bestFuture.futureScore,
    primaryPosition: breakdown.primaryPosition,
    positionGroup: breakdown.positionGroup,
    positionFitExplanation: 'Position fit compares every major role using role-specific attribute weights, physical suitability, match evidence and development runway.',
    conversionCandidates: conversions
  };
}

function normaliseSetupList(values = []) {
  return (Array.isArray(values) ? values : []).map(v => {
    const raw = String(v || '').trim();
    return WEAKNESS_ALIASES[raw] || WEAKNESS_ALIASES[raw.toLowerCase().replace(/\s+/g, '_')] || raw;
  }).filter(Boolean);
}

function parseWeaknesses(playingStyle) {
  if (!playingStyle) return [];
  const found = [];
  const lower = String(playingStyle).toLowerCase();
  Object.keys(WEAKNESS_ALIASES).forEach(key => {
    if (lower.includes(key) || lower.includes(key.replace(/_/g, ' '))) found.push(WEAKNESS_ALIASES[key]);
  });
  return Array.from(new Set(found));
}

function attrsScore(player, attrs, fallback = 60) {
  return avg((attrs || []).map(k => attr100(player, k, 55)), fallback);
}

function weaknessFitScore(player, weaknesses) {
  const selected = normaliseSetupList(weaknesses).filter(w => WEAKNESS_ATTRS[w]);
  if (!selected.length) return 64;
  return avg(selected.map(w => attrsScore(player, WEAKNESS_ATTRS[w], 58)), 64);
}

function roleFitScore(player, roles) {
  const selected = normaliseSetupList(roles).filter(r => ROLE_EXPECTATION_ATTRS[r]);
  if (!selected.length) return 64;
  return avg(selected.map(r => attrsScore(player, ROLE_EXPECTATION_ATTRS[r], 58)), 64);
}

function styleFitScore(player, style) {
  if (!style || !STYLE_ATTRS[style]) return 62;
  return attrsScore(player, STYLE_ATTRS[style], 62);
}

function formationFitScore(player, formation) {
  if (!formation) return 62;
  const group = getPosGroup(player.positions || player.primary_position || player.specific_position || player.position_group);
  const fit = {
    '4-4-2': { Goalkeeper: 65, Defender: 72, Midfielder: 70, Forward: 70 },
    '4-3-3': { Goalkeeper: 65, Defender: 68, Midfielder: 72, Forward: 80 },
    '3-5-2': { Goalkeeper: 65, Defender: 66, Midfielder: 80, Forward: 72 },
    '5-3-2': { Goalkeeper: 65, Defender: 82, Midfielder: 66, Forward: 68 },
    '4-2-3-1': { Goalkeeper: 65, Defender: 70, Midfielder: 80, Forward: 72 },
    '4-1-4-1': { Goalkeeper: 65, Defender: 70, Midfielder: 78, Forward: 64 },
    '4-5-1': { Goalkeeper: 65, Defender: 72, Midfielder: 82, Forward: 60 },
    '3-4-3': { Goalkeeper: 65, Defender: 64, Midfielder: 74, Forward: 80 },
    '5-4-1': { Goalkeeper: 65, Defender: 82, Midfielder: 72, Forward: 58 }
  };
  return (fit[formation] && fit[formation][group]) || 64;
}

function developmentPathwayScore(player, goals, breakdown) {
  const selected = normaliseSetupList(goals).filter(g => LONG_TERM_ATTRS[g]);
  const age = breakdown.age;
  const runway = age === null ? 62 : age <= 8 ? 84 : age <= 11 ? 80 : age <= 14 ? 74 : age <= 16 ? 66 : 48;
  if (!selected.length) return avg([runway, breakdown.potentialRating], 65);
  return avg(selected.map(g => attrsScore(player, LONG_TERM_ATTRS[g], 58)).concat([runway, breakdown.potentialRating]), 65);
}

function calculateValueAnalysis(player = {}, matchHistory = [], context = {}) {
  const breakdown = calculateOverallBreakdown(player, matchHistory);
  const positions = calculatePositionRatings(player, matchHistory);
  const primary = positions.bestCurrentPosition || breakdown.primaryPosition || 'CM';
  const group = POSITION_GROUP[primary] || breakdown.positionGroup || 'Midfielder';
  const band = ageBand(breakdown.age);
  const baseByBand = {
    U7_U8_FOUNDATION: 12000,
    U9_U11_DEVELOPMENT: 26000,
    U12_U14_PRE_ACADEMY: 56000,
    U15_U16_RECRUITMENT_READINESS: 92000,
    POST_PLATFORM: 85000,
    UNKNOWN: 42000
  };
  const groupPremium = { Forward: 1.17, Midfielder: 1.05, Defender: 0.96, Goalkeeper: 0.90 }[group] || 1;
  const rolePremium = ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(primary) ? 1.12 : ['BPD', 'CDM', 'RWB', 'LWB'].includes(primary) ? 1.06 : primary === 'GK' ? 0.94 : 1;
  const ratingMultiplier = clamp(0.34 + Math.pow(breakdown.finalScore / 100, 2.15) * 1.62, 0.30, 2.05);
  const potentialMultiplier = clamp(0.78 + breakdown.potentialRating / 140, 0.75, 1.45);
  const confidenceMultiplier = clamp(0.72 + breakdown.dataConfidenceScore / 285, 0.72, 1.05);
  const disciplineMultiplier = clamp(0.82 + breakdown.disciplineScore / 520, 0.82, 1.02);
  const matchOutputMultiplier = clamp(0.82 + breakdown.matchOutputScore / 360, 0.82, 1.10);
  const tier = clamp(Number(context?.scoutTeam?.tier || context?.team?.tier || 5), 1, 10);
  const tierMultiplier = clamp(1.18 - (tier - 1) * 0.035, 0.82, 1.18);
  let value = (baseByBand[band.key] || 42000) * groupPremium * rolePremium * ratingMultiplier * potentialMultiplier * confidenceMultiplier * disciplineMultiplier * matchOutputMultiplier * tierMultiplier;
  value = clamp(value, 3000, breakdown.age !== null && breakdown.age <= 11 ? 95000 : 250000);
  value = Math.round(value / 1000) * 1000;
  const riskLabel = breakdown.dataConfidenceScore < 60 ? 'High evidence risk' : breakdown.disciplineScore < 70 ? 'Discipline risk' : breakdown.age !== null && breakdown.age <= 8 ? 'Long-horizon risk' : 'Balanced risk';
  const affordabilityFlag = value <= 35000 ? 'Low-cost watchlist' : value <= 85000 ? 'Manageable development cost' : value <= 150000 ? 'Priority budget case' : 'Premium youth case';
  return {
    value,
    valueFormatted: formatCurrency(value),
    label: band.valueLabel,
    ageBand: band.key,
    ageBandLabel: band.label,
    primaryPosition: primary,
    positionGroup: group,
    multipliers: {
      base: baseByBand[band.key] || 42000,
      groupPremium: round(groupPremium, 3),
      rolePremium: round(rolePremium, 3),
      ratingMultiplier: round(ratingMultiplier, 3),
      potentialMultiplier: round(potentialMultiplier, 3),
      confidenceMultiplier: round(confidenceMultiplier, 3),
      disciplineMultiplier: round(disciplineMultiplier, 3),
      matchOutputMultiplier: round(matchOutputMultiplier, 3),
      tierMultiplier: round(tierMultiplier, 3)
    },
    affordabilityFlag,
    riskLabel,
    explanation: 'Value is a deterministic youth estimate using age band, position scarcity, overall breakdown, potential runway, match output, discipline and evidence confidence.'
  };
}

function grassrootsTransferValue(player, matchHistory = []) {
  const va = calculateValueAnalysis(player, matchHistory, {});
  return {
    value: va.value,
    valueFormatted: va.valueFormatted,
    breakdown: { ...va.multipliers, ageBand: va.ageBand, group: va.positionGroup, position: va.primaryPosition, riskLabel: va.riskLabel, label: va.label }
  };
}

function calculateCompatibility(player = {}, team = {}, prefs = {}, matchHistory = [], context = {}) {
  const breakdown = calculateOverallBreakdown(player, matchHistory);
  const valueAnalysis = calculateValueAnalysis(player, matchHistory, { team, scoutTeam: team, ...context });
  const teamWeaknesses = normaliseSetupList(team?.team_weaknesses || prefs.teamWeaknesses || []);
  const roleExpectations = normaliseSetupList(team?.role_expectations || prefs.roleExpectations || []);
  const longTermGoals = normaliseSetupList(team?.long_term_goals || prefs.longTermGoals || []);
  const style = team?.playing_style || prefs.playingStyle || '';
  const formation = team?.formation || prefs.formation || '';
  const needFit = weaknessFitScore(player, teamWeaknesses);
  const roleFit = roleFitScore(player, roleExpectations);
  const tacticalStyleFit = styleFitScore(player, style);
  const formationPositionFit = formationFitScore(player, formation);
  const developmentPathwayFit = developmentPathwayScore(player, longTermGoals, breakdown);
  const matchEvidenceFit = avg([breakdown.matchOutputScore, breakdown.disciplineScore], 60);
  const financialFit = clamp(82 - Math.max(0, valueAnalysis.value - 90000) / 3000 + breakdown.potentialRating * 0.20 + breakdown.dataConfidenceScore * 0.06, 38, 95);
  const confidenceFit = breakdown.dataConfidenceScore;
  const finalScore = clamp(
    needFit * 0.25 +
    roleFit * 0.20 +
    tacticalStyleFit * 0.15 +
    formationPositionFit * 0.15 +
    developmentPathwayFit * 0.10 +
    matchEvidenceFit * 0.05 +
    financialFit * 0.05 +
    confidenceFit * 0.05
  );
  const risks = [];
  if (breakdown.dataConfidenceScore < 60) risks.push('Evidence base is thin; add match facts before treating this as a decisive recommendation.');
  if (needFit < 58) risks.push('The player does not strongly solve the selected team weakness.');
  if (roleFit < 58) risks.push('Role expectations are not yet a natural fit.');
  if (financialFit < 55) risks.push('Financial case is weaker than the football case.');
  const label = finalScore >= 84 ? 'Elite fit' : finalScore >= 74 ? 'Strong fit' : finalScore >= 62 ? 'Useful fit' : finalScore >= 50 ? 'Monitor' : 'Low fit';
  const recommendedUse = finalScore >= 74
    ? 'Prioritise for live scouting and deeper coach conversation.'
    : finalScore >= 62
      ? 'Keep in the pipeline and verify with more match evidence.'
      : 'Monitor only unless new evidence changes the fit.';
  return {
    finalScore: round(finalScore),
    score: round(finalScore),
    label,
    needFit: round(needFit),
    roleFit: round(roleFit),
    tacticalStyleFit: round(tacticalStyleFit),
    formationPositionFit: round(formationPositionFit),
    developmentPathwayFit: round(developmentPathwayFit),
    matchEvidenceFit: round(matchEvidenceFit),
    financialFit: round(financialFit),
    confidenceFit: round(confidenceFit),
    explanation: 'Compatibility weighs team need, role fit, tactical style, formation, development pathway, match evidence, financial fit and data confidence using ScoutLink scoring v3.',
    risks,
    recommendedUse,
    setup: { teamWeaknesses, roleExpectations, longTermGoals, playingStyle: style, formation },
    valueAnalysis
  };
}

function compatibilityScore(player, team, prefs = {}, matchHistory = []) {
  const compatibility = calculateCompatibility(player, team, prefs, matchHistory);
  return {
    score: compatibility.finalScore,
    breakdown: {
      technical: calculateOverallBreakdown(player, matchHistory).technicalScore,
      tacticalFit: round(avg([compatibility.needFit, compatibility.roleFit, compatibility.tacticalStyleFit, compatibility.formationPositionFit])),
      physicalProfile: calculateOverallBreakdown(player, matchHistory).physicalProfileScore,
      matchImpact: compatibility.matchEvidenceFit,
      ageDevelopmentFit: compatibility.developmentPathwayFit,
      preferenceFit: round(avg([compatibility.needFit, compatibility.roleFit], 62)),
      dataConfidence: compatibility.confidenceFit,
      needFit: compatibility.needFit,
      roleFit: compatibility.roleFit,
      tacticalStyleFit: compatibility.tacticalStyleFit,
      formationPositionFit: compatibility.formationPositionFit,
      developmentPathwayFit: compatibility.developmentPathwayFit,
      matchEvidenceFit: compatibility.matchEvidenceFit,
      financialFit: compatibility.financialFit,
      confidenceFit: compatibility.confidenceFit,
      label: compatibility.label,
      risks: compatibility.risks,
      recommendedUse: compatibility.recommendedUse,
      setup: compatibility.setup,
      compatibility
    }
  };
}

function predictionScore(player, matchHistory = []) {
  const overall = calculateOverallBreakdown(player, matchHistory);
  const pos = calculatePositionRatings(player, matchHistory);
  const trajectory = overall.potentialRating > overall.currentReadiness + 6 ? 'rising' : overall.potentialRating < overall.currentReadiness - 3 ? 'plateauing' : 'stable';
  return {
    score: round(overall.potentialRating),
    peakAge: overall.positionGroup === 'Goalkeeper' ? 24 : overall.positionGroup === 'Defender' ? 21 : overall.positionGroup === 'Midfielder' ? 20 : 19,
    trajectory,
    currentOverall: round(overall.finalScore),
    potentialOverall: round(overall.potentialRating),
    formTrend: round(overall.matchOutputScore - 60),
    bestCurrentPosition: pos.bestCurrentPosition,
    bestFuturePosition: pos.bestFuturePosition,
    confidence: overall.dataConfidenceLabel
  };
}

function transferValue(player, team, compatibility = 50, matchHistory = []) {
  const va = calculateValueAnalysis(player, matchHistory, { team, scoutTeam: team, compatibility });
  return {
    value: va.value,
    valueFormatted: va.valueFormatted,
    breakdown: { ...va.multipliers, overall: calculateOverallBreakdown(player, matchHistory).finalScore, age: ageFromPlayer(player), group: va.positionGroup, tier: Number(team?.tier) || 5, label: va.label, riskLabel: va.riskLabel }
  };
}

function predictedSalary(player, team) {
  const tv = transferValue(player, team, 50);
  const weekly = Math.round((tv.value * 0.0018) / 100) * 100;
  const fmt = weekly >= 1000 ? 'GBP ' + (weekly / 1000).toFixed(1) + 'K/week' : 'GBP ' + weekly + '/week';
  return { weeklyGross: weekly, weeklyFormatted: fmt, transferValue: tv.value };
}

function analysePlayer(player, team, matchHistory = [], scoutPrefs = {}) {
  const overallBreakdown = calculateOverallBreakdown(player, matchHistory);
  const positionRatings = calculatePositionRatings(player, matchHistory);
  const valueAnalysis = calculateValueAnalysis(player, matchHistory, { team, scoutTeam: team });
  const compatibility = calculateCompatibility(player, team, scoutPrefs, matchHistory, { valueAnalysis });
  const predict = predictionScore(player, matchHistory);
  const salary = predictedSalary(player, team);
  return {
    scoringVersion: 'v3',
    compatibilityScore: compatibility.finalScore,
    compatibilityBreakdown: {
      technical: overallBreakdown.technicalScore,
      tacticalFit: round(avg([compatibility.needFit, compatibility.roleFit, compatibility.tacticalStyleFit, compatibility.formationPositionFit])),
      physicalProfile: overallBreakdown.physicalProfileScore,
      matchImpact: compatibility.matchEvidenceFit,
      ageDevelopmentFit: compatibility.developmentPathwayFit,
      preferenceFit: round(avg([compatibility.needFit, compatibility.roleFit], 62)),
      dataConfidence: compatibility.confidenceFit,
      needFit: compatibility.needFit,
      roleFit: compatibility.roleFit,
      tacticalStyleFit: compatibility.tacticalStyleFit,
      formationPositionFit: compatibility.formationPositionFit,
      developmentPathwayFit: compatibility.developmentPathwayFit,
      matchEvidenceFit: compatibility.matchEvidenceFit,
      financialFit: compatibility.financialFit,
      confidenceFit: compatibility.confidenceFit,
      label: compatibility.label,
      risks: compatibility.risks,
      recommendedUse: compatibility.recommendedUse,
      setup: compatibility.setup
    },
    compatibility,
    predictionScore: predict.score,
    predictionDetails: predict,
    transferValue: valueAnalysis.value,
    transferValueFormatted: valueAnalysis.valueFormatted,
    transferValueBreakdown: valueAnalysis.multipliers,
    valueAnalysis,
    overallRating: overallBreakdown.finalScore,
    overallBreakdown,
    positionRatings,
    predictedSalaryWeekly: salary.weeklyGross,
    predictedSalaryFormatted: salary.weeklyFormatted
  };
}

module.exports = {
  compatibilityScore,
  predictionScore,
  transferValue,
  predictedSalary,
  analysePlayer,
  computeOverall,
  grassrootsTransferValue,
  getPosGroup,
  ageFromPlayer,
  getHeightMid,
  getBuildMid,
  parseWeaknesses,
  calculateOverallBreakdown,
  calculatePositionRatings,
  calculateValueAnalysis,
  calculateCompatibility,
  sanitizeMatchFacts,
  attr10,
  attr100,
  ATTR_LABELS,
  ROLE_WEIGHTS
};
