'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { getPosGroup, analysePlayer } = require('../engines/compatibility');
const { isDemoSession, applyRealDataFilter, demoWriteFields } = require('../utils/demo');

const PLAN_LIMITS = {
  Core: { exports: 30, predictions: 120, interests: 200 },
  Plus: { exports: 120, predictions: 600, interests: 1000 },
  Elite: { exports: 500, predictions: 1200, interests: 99999 },
  Enterprise: { exports: 99999, predictions: 99999, interests: 99999 }
};

function isValidEmail(emailAddr) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailAddr || '').trim());
}

function limitsFor(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.Core;
}

async function teamUsage(table, scout) {
  let q = supabase.from(table).select('id', { count:'exact', head:true });
  if (scout.scout_team_id) q = q.eq('scout_team_id', scout.scout_team_id);
  else q = q.eq('scout_id', scout.id);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

function confidenceModifier(apps) {
  const n = Number(apps) || 0;
  if (n === 0) return 0.2; if (n <= 2) return 0.4; if (n <= 5) return 0.6; if (n <= 10) return 0.8;
  return 1.0;
}
function applyConf(raw, conf) { return raw * conf + 50 * (1 - conf); }
function ga(p, k) { const v = parseFloat(p[k]); return isNaN(v) ? 5 : (v <= 10 ? v * 10 : v); }

async function notifyStratexAdmins(title, body, data) {
  try {
    const { data: admins } = await supabase.from('stratex').select('id').eq('is_active', true);
    if (!admins || !admins.length) return;
    await supabase.from('notifications').insert(admins.map(a => ({
      recipient_id: a.id,
      recipient_type: 'Stratex',
      title,
      body,
      data: data || {},
      is_read: false
    })));
  } catch(e) { console.error('[Notify Stratex]', e.message); }
}

function calcWeaknessFit(player, weaknesses) {
  if (!weaknesses || !weaknesses.length) return 50;
  const apps = Number(player.appearances) || 0;
  const yellowPerGame = apps > 0 ? Math.min((Number(player.yellow_cards)||0) / apps, 1) : 0;
  const goalsPerGame = apps > 0 ? Math.min((Number(player.goals)||0) / apps, 1) : 0;
  const W = {
    'Insufficient Game Pace and Speed': ga(player,'pace')*0.45+ga(player,'agility')*0.30+ga(player,'stamina')*0.15+ga(player,'dribbling')*0.10,
    'Physical Fragility and Injury Risk': ga(player,'stamina')*0.40+ga(player,'strength')*0.35+(100-yellowPerGame*100)*0.25,
    'Lack of Physical Presence': ga(player,'strength')*0.45+ga(player,'jumping')*0.35+ga(player,'heading')*0.20,
    'Weak Defensive Base': ga(player,'defending')*0.35+ga(player,'positioning')*0.30+ga(player,'tackling')*0.25+ga(player,'stamina')*0.10,
    'Poor Defensive Output': ga(player,'tackling')*0.40+ga(player,'defending')*0.35+ga(player,'positioning')*0.25,
    'Low Team Chemistry and Leadership': ga(player,'vision')*0.35+ga(player,'passing')*0.35+ga(player,'composure')*0.30,
    'Technical Deficiencies Under Pressure': ga(player,'composure')*0.30+ga(player,'dribbling')*0.25+ga(player,'passing')*0.25+ga(player,'dribbling')*0.20,
    'Tactical Awareness Gaps': ga(player,'positioning')*0.40+ga(player,'composure')*0.35+ga(player,'vision')*0.25,
    'Poor Goal Output': ga(player,'shooting')*0.40+ga(player,'positioning')*0.30+goalsPerGame*100*0.20+ga(player,'crossing')*0.10,
  };
  let total = 0, count = 0;
  weaknesses.forEach(w => { if (W[w] !== undefined) { total += W[w]; count++; } });
  return count > 0 ? Math.min(100, total / count) : 50;
}

function calcRoleFit(player, roles) {
  if (!roles || !roles.length) return 50;
  const R = {
    'Aerial Dominance': ga(player,'jumping')*0.45+ga(player,'heading')*0.35+ga(player,'strength')*0.20,
    'Vision and Creativity': ga(player,'vision')*0.35+ga(player,'passing')*0.30+ga(player,'dribbling')*0.20+ga(player,'composure')*0.15,
    'Speed and Agility': ga(player,'pace')*0.45+ga(player,'agility')*0.35+ga(player,'stamina')*0.20,
    'Tactical Intelligence': ga(player,'positioning')*0.40+ga(player,'composure')*0.35+ga(player,'vision')*0.25,
    'Ball Retention Under Pressure': ga(player,'composure')*0.35+ga(player,'dribbling')*0.30+ga(player,'passing')*0.35,
    'Physical Resilience Work Rate': ga(player,'stamina')*0.50+ga(player,'strength')*0.30+ga(player,'defending')*0.20,
    'Defensive Impact': ga(player,'defending')*0.30+ga(player,'tackling')*0.30+ga(player,'positioning')*0.25+ga(player,'stamina')*0.15,
    'Offensive Impact': ga(player,'shooting')*0.35+ga(player,'dribbling')*0.25+ga(player,'pace')*0.20+ga(player,'crossing')*0.20,
    'Progression and Carrying': ga(player,'dribbling')*0.40+ga(player,'pace')*0.30+ga(player,'agility')*0.30,
    'Leadership and Communication': ga(player,'vision')*0.40+ga(player,'passing')*0.35+ga(player,'composure')*0.25,
  };
  let total = 0, count = 0;
  roles.forEach(r => { if (R[r] !== undefined) { total += R[r]; count++; } });
  return count > 0 ? Math.min(100, total / count) : 50;
}

function calcStyleFit(player, style) {
  if (!style) return 50;
  const S = {
    'Possession-Based Play': ga(player,'passing')*0.35+ga(player,'composure')*0.25+ga(player,'vision')*0.25+ga(player,'dribbling')*0.15,
    'Counter-Attacking': ga(player,'pace')*0.40+ga(player,'stamina')*0.25+ga(player,'dribbling')*0.20+ga(player,'composure')*0.15,
    'High Press': ga(player,'stamina')*0.40+ga(player,'pace')*0.25+ga(player,'defending')*0.20+ga(player,'composure')*0.15,
    'Low Block': ga(player,'defending')*0.40+ga(player,'positioning')*0.30+ga(player,'tackling')*0.20+ga(player,'stamina')*0.10,
    'Direct Play': ga(player,'pace')*0.30+ga(player,'strength')*0.30+ga(player,'heading')*0.25+ga(player,'shooting')*0.15,
    'Wing Play': ga(player,'pace')*0.35+ga(player,'crossing')*0.30+ga(player,'dribbling')*0.25+ga(player,'agility')*0.10,
    'Tiki-Taka': ga(player,'passing')*0.40+ga(player,'vision')*0.25+ga(player,'composure')*0.25+ga(player,'dribbling')*0.10,
    'Gegenpressing': ga(player,'stamina')*0.35+ga(player,'pace')*0.30+ga(player,'defending')*0.20+ga(player,'passing')*0.15,
    'Build-Up from the Back': ga(player,'passing')*0.35+ga(player,'composure')*0.30+ga(player,'vision')*0.20+ga(player,'defending')*0.15,
    'Long Ball': ga(player,'heading')*0.35+ga(player,'strength')*0.30+ga(player,'jumping')*0.20+ga(player,'pace')*0.15,
    'Total Football': ga(player,'vision')*0.25+ga(player,'passing')*0.25+ga(player,'stamina')*0.25+ga(player,'dribbling')*0.25,
    'Compact Defence': ga(player,'defending')*0.40+ga(player,'positioning')*0.35+ga(player,'tackling')*0.25,
    'Vertical Play': ga(player,'pace')*0.35+ga(player,'dribbling')*0.30+ga(player,'shooting')*0.20+ga(player,'stamina')*0.15,
  };
  return S[style] !== undefined ? Math.min(100, S[style]) : 50;
}

function calcFormationFit(player, formation) {
  if (!formation) return 50;
  const pos = (player.specific_position || player.primary_position || '').toUpperCase();
  const group = getPosGroup(pos);
  const FW = {
    '4-4-2':{Goalkeeper:55,Defender:70,Midfielder:70,Forward:60},'4-3-3':{Goalkeeper:55,Defender:65,Midfielder:65,Forward:75},
    '3-5-2':{Goalkeeper:55,Defender:60,Midfielder:80,Forward:60},'5-3-2':{Goalkeeper:55,Defender:80,Midfielder:60,Forward:60},
    '4-2-3-1':{Goalkeeper:55,Defender:65,Midfielder:80,Forward:60},'4-1-4-1':{Goalkeeper:55,Defender:65,Midfielder:80,Forward:55},
    '4-5-1':{Goalkeeper:55,Defender:65,Midfielder:85,Forward:50},'3-4-3':{Goalkeeper:55,Defender:55,Midfielder:70,Forward:75},
    '3-4-2-1':{Goalkeeper:55,Defender:55,Midfielder:70,Forward:70},'4-1-2-1-2':{Goalkeeper:55,Defender:65,Midfielder:75,Forward:70},
    '4-4-1-1':{Goalkeeper:55,Defender:65,Midfielder:75,Forward:65},'3-6-1':{Goalkeeper:55,Defender:55,Midfielder:90,Forward:50},
    '4-2-2-2':{Goalkeeper:55,Defender:65,Midfielder:65,Forward:70},'5-4-1':{Goalkeeper:55,Defender:80,Midfielder:70,Forward:50},
  };
  const w = FW[formation] || {Goalkeeper:55,Defender:65,Midfielder:65,Forward:65};
  return Math.min(100, w[group] || 55);
}

function calcGoalsFit(player, goals) {
  if (!goals || !goals.length) return 50;
  const dob = player.date_of_birth; let age = 15;
  if (dob) { const d = new Date(dob), n = new Date(); age = n.getFullYear()-d.getFullYear(); if (n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate())) age--; }
  const G = {
    'Physical Growth Potential': (age<=15?90:age<=17?75:age<=19?55:35)*0.60+ga(player,'strength')*0.20+ga(player,'stamina')*0.20,
    'Tactical Role Maturity': ga(player,'positioning')*0.40+ga(player,'composure')*0.35+ga(player,'vision')*0.25,
    'Leadership and Coachability': ga(player,'composure')*0.40+ga(player,'vision')*0.35+ga(player,'passing')*0.25,
    'Injury Risk and Physical Resilience': ga(player,'stamina')*0.50+ga(player,'strength')*0.30+(100-Math.min((Number(player.yellow_cards)||0)*10,100))*0.20,
    'Positional Depth Advantage': (Array.isArray(player.positions)&&player.positions.length>1?80:50)*0.60+ga(player,'positioning')*0.40,
    'Goal Contribution Potential': ga(player,'shooting')*0.40+ga(player,'positioning')*0.25+ga(player,'crossing')*0.20+ga(player,'passing')*0.15,
    'Financial Viability': (ga(player,'overall_rating')||50)*0.50+(age<=17?80:age<=19?65:45)*0.50,
  };
  let total = 0, count = 0;
  goals.forEach(g => { if (G[g] !== undefined) { total += G[g]; count++; } });
  return count > 0 ? Math.min(100, total / count) : 50;
}

function calcFullCompatibility(player, scoutTeam) {
  const conf = confidenceModifier(player.appearances);
  const rW = calcWeaknessFit(player, scoutTeam.team_weaknesses||[]);
  const rR = calcRoleFit(player, scoutTeam.role_expectations||[]);
  const rS = calcStyleFit(player, scoutTeam.playing_style||'');
  const rF = calcFormationFit(player, scoutTeam.formation||'');
  const rG = calcGoalsFit(player, scoutTeam.long_term_goals||[]);
  const raw = rW*0.40+rR*0.20+rS*0.20+rF*0.10+rG*0.10;
  const final = applyConf(raw, conf);
  return { score: Math.round(Math.max(0,Math.min(100,final))*10)/10, breakdown: {weaknessFit:Math.round(rW*10)/10,roleFit:Math.round(rR*10)/10,styleFit:Math.round(rS*10)/10,formationFit:Math.round(rF*10)/10,goalsFit:Math.round(rG*10)/10,confidence:conf,appearances:Number(player.appearances)||0} };
}

router.get('/profile', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: scout, error } = await supabase.from('scouts').select('id,scout_id,first_name,last_name,email,club_name,scout_team_id,scout_preferences,preferences_set,subscription_plan,exports_remaining,predictions_remaining,interests_remaining,is_super_user').eq('id', req.user.id).single();
    if (error || !scout) return res.status(404).json({ error: 'Scout not found' });
    let scoutTeam = null;
    if (scout.scout_team_id) { const { data: team } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).single(); scoutTeam = team; }
    res.json({ scout, scoutTeam });
  } catch (err) { console.error('[Scout Profile]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/setup', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { teamName, clubName, country, scoutRegion, formation, playingStyle, teamWeaknesses, roleExpectations, longTermGoals, ageGroups, preferredPositions, salaryCap, minAppearances } = req.body;
    const prefs = { teamName:teamName||'', clubName:clubName||'', country:country||'', scoutRegion:scoutRegion||'', formation:formation||'', playingStyle:playingStyle||'', teamWeaknesses:teamWeaknesses||[], roleExpectations:roleExpectations||[], longTermGoals:longTermGoals||[], ageGroups:ageGroups||[], preferredPositions:preferredPositions||[], salaryCap:salaryCap?Number(salaryCap):null, minAppearances:minAppearances?Number(minAppearances):0, updatedAt:new Date().toISOString() };
    await supabase.from('scouts').update({ scout_preferences: prefs, preferences_set: true }).eq('id', req.user.id);
    res.json({ message: 'Setup saved successfully', preferences: prefs });
  } catch (err) { console.error('[Scout Setup]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/setup', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: scout } = await supabase.from('scouts').select('scout_preferences,preferences_set,scout_team_id').eq('id', req.user.id).single();
    let teamData = null;
    if (scout && scout.scout_team_id) { const { data: team } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).single(); teamData = team; }
    res.json({ preferences: scout?.scout_preferences||{}, preferencesSet: scout?.preferences_set||false, scoutTeam: teamData });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/settings', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: scout, error } = await supabase
      .from('scouts')
      .select('scout_preferences')
      .eq('id', req.user.id)
      .single();
    if (error || !scout) return res.status(404).json({ error: 'Scout not found' });
    const prefs = scout.scout_preferences || {};
    res.json({
      settings: {
        theme: prefs.theme || 'dark',
        emailAlerts: prefs.emailAlerts !== false,
        pushAlerts: prefs.pushAlerts !== false,
        weeklySummary: prefs.weeklySummary !== false
      }
    });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/settings', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: scout, error } = await supabase
      .from('scouts')
      .select('scout_preferences')
      .eq('id', req.user.id)
      .single();
    if (error || !scout) return res.status(404).json({ error: 'Scout not found' });
    const prefs = scout.scout_preferences || {};
    const next = {
      ...prefs,
      theme: req.body.theme === 'light' ? 'light' : 'dark',
      emailAlerts: req.body.emailAlerts !== false,
      pushAlerts: req.body.pushAlerts !== false,
      weeklySummary: req.body.weeklySummary !== false,
      settingsUpdatedAt: new Date().toISOString()
    };
    const { error: updateErr } = await supabase.from('scouts').update({ scout_preferences: next }).eq('id', req.user.id);
    if (updateErr) throw updateErr;
    res.json({ message: 'Settings saved', settings: { theme: next.theme, emailAlerts: next.emailAlerts, pushAlerts: next.pushAlerts, weeklySummary: next.weeklySummary } });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/recommended-players', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const requestedLimit = Math.max(1, Math.min(25, Number(req.query.limit || 5) || 5));
    const { data: scout } = await supabase.from('scouts').select('id,scout_team_id,scout_preferences,preferences_set').eq('id', req.user.id).single();
    if (!scout || !scout.preferences_set) return res.json({ setupRequired: true, data: [], total: 0 });
    let scoutTeam = {};
    if (scout.scout_team_id) { const { data: team } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).single(); if (team) scoutTeam = team; }
    const prefs = scout.scout_preferences || {};
    if (prefs.teamWeaknesses?.length) scoutTeam.team_weaknesses = prefs.teamWeaknesses;
    if (prefs.roleExpectations?.length) scoutTeam.role_expectations = prefs.roleExpectations;
    if (prefs.longTermGoals?.length) scoutTeam.long_term_goals = prefs.longTermGoals;
    if (prefs.formation) scoutTeam.formation = prefs.formation;
    if (prefs.playingStyle) scoutTeam.playing_style = prefs.playingStyle;
    let q = supabase.from('players').select('id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,overall_rating,transfer_value,predicted_salary_weekly,team_id,team_name,height_category,build_category,nationality,date_of_birth,pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,appearances,goals,assists,clean_sheets,yellow_cards,red_cards,foot,gk_diving,gk_handling,gk_kicking,gk_reflexes,gk_positioning,gk_distribution,gk_communication,gk_sweeping').eq('is_active', true);
    q = applyRealDataFilter(q, req);
    if (prefs.minAppearances && Number(prefs.minAppearances) > 0) q = q.gte('appearances', Number(prefs.minAppearances));
    q = q.order('overall_rating', { ascending: false }).limit(100);
    const { data: players, error } = await q;
    if (error) throw error;
    const playerIds = (players || []).map(p => p.id);
    const { data: matches } = playerIds.length
      ? await supabase.from('match_facts').select('*').in('player_id', playerIds).order('match_date', { ascending: false }).limit(500)
      : { data: [] };
    const matchesByPlayer = {};
    (matches || []).forEach(m => {
      if (!matchesByPlayer[m.player_id]) matchesByPlayer[m.player_id] = [];
      if (matchesByPlayer[m.player_id].length < 10) matchesByPlayer[m.player_id].push(m);
    });
    const teamIds = [...new Set((players || []).map(p => p.team_id).filter(Boolean))];
    const { data: teams } = teamIds.length
      ? await supabase.from('school_academy_teams').select('id,city,country,county').in('id', teamIds)
      : { data: [] };
    const teamsById = {};
    (teams || []).forEach(t => { teamsById[t.id] = t; });
    const scored = (players||[]).map(p => {
      const analysis = analysePlayer(p, scoutTeam, matchesByPlayer[p.id] || [], prefs);
      const teamInfo = teamsById[p.team_id] || {};
      return { ...p, team_city: teamInfo.city || teamInfo.county || null, team_country: teamInfo.country || null, compatibilityScore: analysis.compatibilityScore, compatibilityBreakdown: analysis.compatibilityBreakdown };
    });
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    let filtered = scored;
    
    // Filter by age groups if set
    if (prefs.ageGroups && prefs.ageGroups.length) {
      const ag = prefs.ageGroups;
      const agFiltered = filtered.filter(p => !p.age_group || ag.includes(p.age_group));
      if (agFiltered.length > 0) filtered = agFiltered;
    }
    if (prefs.preferredPositions && prefs.preferredPositions.length) {
      const pp = prefs.preferredPositions.map(p => p.toUpperCase());
      const pf = filtered.filter(p => { const pos = Array.isArray(p.positions) ? p.positions : [p.specific_position||p.primary_position||'']; return pos.some(x => pp.includes(String(x).toUpperCase())); });
      if (pf.length > 0) filtered = pf;
    }
    res.json({ data: filtered.slice(0, requestedLimit), total: filtered.length, setupRequired: false });
  } catch (err) { console.error('[Recommended Players]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/players-count', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    let q = supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true);
    q = applyRealDataFilter(q, req);
    const { count, error } = await q;
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/preferences', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { preferredPositions, formationFocus, playingStyle, heightPreference, buildPreference, ageRangeMin, ageRangeMax, otherRequirements, footPreference, teamWeaknesses } = req.body;
    const prefs = { preferredPositions:preferredPositions||[], formationFocus:formationFocus||'', playingStyle:playingStyle||'', heightPreference:heightPreference||'', buildPreference:buildPreference||'', ageRangeMin:ageRangeMin||14, ageRangeMax:ageRangeMax||21, otherRequirements:otherRequirements||'', footPreference:footPreference||'any', teamWeaknesses:teamWeaknesses||[], updatedAt:new Date().toISOString() };
    await supabase.from('scouts').update({ scout_preferences: prefs, preferences_set: true }).eq('id', req.user.id);
    res.json({ message: 'Preferences saved', preferences: prefs });
  } catch (err) { console.error('[Scout Preferences]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/preferences', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data } = await supabase.from('scouts').select('scout_preferences,preferences_set').eq('id', req.user.id).single();
    res.json({ preferences: data?.scout_preferences||null, preferencesSet: data?.preferences_set||false });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/pipeline', requireAuth, requireRole('Scout', 'Stratex'), async (req, res) => {
  try {
    const scoutId = req.user.accountType === 'Scout' ? req.user.id : req.query.scoutId;
    let q = supabase.from('recruitment_pipeline').select('id,scout_id,player_id,stage,notes,interest_level,created_at,updated_at,players(id,first_name,last_name,specific_position,primary_position,overall_rating,transfer_value,team_name,age,age_group,position_group,appearances,assigned_coach_id,team_id),scouts(id,first_name,last_name,club_name)',{count:'exact'});
    if (scoutId) q = q.eq('scout_id', scoutId);
    if (req.query.stage) q = q.eq('stage', req.query.stage);
    const { limit = 50 } = req.query;
    q = q.order('updated_at', { ascending: false }).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data||[], total: count||0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});


// PATCH /api/scouts/pipeline/:id - move pipeline stage
router.patch('/pipeline/:id', requireAuth, requireRole('Scout', 'Stratex'), async (req, res) => {
  try {
    const { stage } = req.body;
    const validStages = ['watching', 'interested', 'shortlisted', 'approached', 'trial_pending', 'negotiating'];
    if (!stage || !validStages.includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage. Must be one of: ' + validStages.join(', ') });
    }
    const { data, error } = await supabase
      .from('recruitment_pipeline')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq(req.user.accountType === 'Scout' ? 'scout_id' : 'id', req.user.accountType === 'Scout' ? req.user.id : req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[Pipeline PATCH]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/add-scout', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: me } = await supabase.from('scouts').select('id,scout_team_id,club_name,is_super_user').eq('id', req.user.id).single();
    if (!me || !me.is_super_user) return res.status(403).json({ error: 'Only super user scouts can add scouts' });
    const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, subscriptionPlan } = req.body;
    if (!firstName || !lastName || !emailAddr) return res.status(400).json({ error: 'firstName, lastName, email required' });
    if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    const tables = ['scouts','coaches','players','stratex'];
    for (const t of tables) { const { data: eRow } = await supabase.from(t).select('id').eq('email',emailAddr.toLowerCase().trim()).maybeSingle(); if (eRow) return res.status(409).json({ error: 'This email is already registered on ScoutLink.' }); }
    if (phone) { const { data: pRow } = await supabase.from('scouts').select('id').eq('phone',phone.trim()).maybeSingle(); if (pRow) return res.status(409).json({ error: 'This phone number is already registered.' }); }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let loginCode = '', attempts = 0;
    while (attempts < 20) { let c = ''; for (let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)]; const [s,co,p,stx] = await Promise.all([supabase.from('scouts').select('id').eq('login_code',c).maybeSingle(),supabase.from('coaches').select('id').eq('login_code',c).maybeSingle(),supabase.from('players').select('id').eq('login_code',c).maybeSingle(),supabase.from('stratex').select('id').eq('login_code',c).maybeSingle()]); if (!s.data&&!co.data&&!p.data&&!stx.data){loginCode=c;break;} attempts++; }
    if (!loginCode) return res.status(500).json({ error: 'Could not generate unique login code' });
    const {generateId} = require('../utils/auth'); const config = require('../config'); const emailSvc = require('../services/email');
    const PL = {Core:{exports:30,predictions:120,interests:200},Plus:{exports:120,predictions:600,interests:1000},Elite:{exports:500,predictions:1200,interests:99999},Enterprise:{exports:99999,predictions:99999,interests:99999}};
    const plan = subscriptionPlan||'Core'; const limits = PL[plan]||PL.Core; const expires = new Date(Date.now()+7*24*60*60*1000);
    const { data: newScout, error } = await supabase.from('scouts').insert({scout_id:generateId('SCT'),first_name:firstName.trim(),last_name:lastName.trim(),email:emailAddr.toLowerCase().trim(),phone:phone||null,club_name:scoutClub||me.club_name||null,club_league:scoutLeague||null,scout_team_id:me.scout_team_id||null,login_code:loginCode,login_code_expires:expires,is_active:true,preferences_set:false,is_super_user:false,registration_complete:false,subscription_plan:plan,plan_start:new Date(),plan_end:new Date(Date.now()+365*24*60*60*1000),exports_remaining:limits.exports,predictions_remaining:limits.predictions,interests_remaining:limits.interests,...demoWriteFields(req)}).select().single();
    if (error) throw error;
    const baseUrl = config.brandUrl||'https://scoutlink.app'; const cl = baseUrl+'/complete-registration?code='+loginCode+'&email='+encodeURIComponent(emailAddr.toLowerCase())+'&type=Scout';
    const emailResult = isDemoSession(req) ? { success: true, template: 'demo-no-email' } : await emailSvc.sendCompleteSignup({to:emailAddr,email:emailAddr,firstName,loginCode,accountType:'Scout',completeLink:cl}).catch(e=>({success:false,error:e.message}));
    if (!emailResult || !emailResult.success) {
      await supabase.from('scouts').delete().eq('id', newScout.id);
      return res.status(502).json({ error: 'SendGrid did not accept the scout invite email. Scout was not created.', details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error' });
    }
    res.status(201).json({message:'Scout added. Complete-registration email sent.',scoutId:newScout.id,loginCode,completeLink:cl,emailSent:true,emailTemplate:emailResult.template||null});
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});


// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ NOMINATION RESPONSE Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
router.post('/nomination-response', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { nominationId, response } = req.body;
    if (!nominationId || !['accepted','declined'].includes(response)) return res.status(400).json({ error: 'nominationId and response required' });
    const { data, error } = await supabase.from('award_nomination_responses').upsert({ nomination_id: nominationId, scout_id: req.user.id, response, responded_at: new Date().toISOString() }, { onConflict: 'nomination_id,scout_id' }).select().single();
    if (error) throw error;
    res.json({ message: 'Response recorded', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ SHOWCASE ATTENDANCE Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
router.post('/showcase-attendance', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    const { data: ev } = await supabase.from('showcase_events').select('*').eq('id', eventId).single();
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const { count: cc } = await supabase.from('showcase_attendance').select('id', { count:'exact', head:true }).eq('event_id', eventId).eq('status', 'confirmed');
    const isFull = (cc||0) >= (ev.max_scouts||20);
    const status = isFull ? 'waitlisted' : 'confirmed';
    const { data, error } = await supabase.from('showcase_attendance').upsert({ event_id: eventId, scout_id: req.user.id, status, confirmed_at: new Date().toISOString() }, { onConflict: 'event_id,scout_id' }).select().single();
    if (error) throw error;
    const scoutName = ((req.user.firstName || '') + ' ' + (req.user.lastName || '')).trim() || req.user.email || 'A scout';
    await notifyStratexAdmins(
      status === 'confirmed' ? 'Scout accepted showcase event' : 'Scout joined showcase waitlist',
      scoutName + ' has ' + (status === 'confirmed' ? 'accepted' : 'joined the waitlist for') + ' ' + ev.event_name + '.',
      { event_id: eventId, scout_id: req.user.id, type: 'showcase_attendance', status }
    );
    if (isFull) return res.json({ message: 'Event fully booked. You have been added to the waitlist.', status: 'waitlisted', data });
    res.json({ message: 'Attendance confirmed', status: 'confirmed', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ SHOWCASE CANCEL Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
router.post('/showcase-cancel', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    await supabase.from('showcase_attendance').update({ status: 'cancelled' }).eq('event_id', eventId).eq('scout_id', req.user.id);
    // Promote next waitlisted scout
    const { data: waitlist } = await supabase.from('showcase_attendance').select('*').eq('event_id', eventId).eq('status', 'waitlisted').order('confirmed_at', { ascending: true }).limit(1);
    if (waitlist && waitlist.length) {
      await supabase.from('showcase_attendance').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', waitlist[0].id);
      const { data: ev2 } = await supabase.from('showcase_events').select('event_name').eq('id', eventId).single();
      await supabase.from('notifications').insert({ recipient_id: waitlist[0].scout_id, recipient_type: 'Scout', title: 'Showcase Space Available', body: 'A space is now available at ' + (ev2 ? ev2.event_name : 'the showcase') + '. You are confirmed!', data: { event_id: eventId }, is_read: false });
    }
    res.json({ message: 'Attendance cancelled' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ SHOWCASE RESPONSE (player notification accept/decline) Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
router.post('/showcase-response', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId, playerId, response } = req.body;
    if (!eventId || !playerId || !['accepted','declined'].includes(response)) return res.status(400).json({ error: 'eventId, playerId and response required' });
    const { data, error } = await supabase.from('showcase_responses').upsert({ event_id: eventId, player_id: playerId, scout_id: req.user.id, response, responded_at: new Date().toISOString() }, { onConflict: 'event_id,player_id,scout_id' }).select().single();
    if (error) throw error;
    res.json({ message: 'Response recorded', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// GET /api/scouts/fixtures â upcoming fixtures for pipeline players
router.get('/fixtures', requireAuth, requireRole('Scout'), async (req, res) => {
try {
  // Get scout's pipeline player IDs
  const { data: pipeline } = await supabase.from('recruitment_pipeline')
    .select('player_id, stage, players(id,first_name,last_name,team_id,team_name,position_group,specific_position,primary_position,age_group)')
    .eq('scout_id', req.user.id).eq('is_active', true).limit(100);
  
  if (!pipeline || !pipeline.length) return res.json({ data: [], total: 0, message: 'No players in pipeline' });
  
  const teamIds = [...new Set((pipeline||[]).map(p => p.players?.team_id).filter(Boolean))];
  const playerMap = {};
  (pipeline||[]).forEach(p => { if (p.players) playerMap[p.players.id] = p.players; });
  
  let fixtures = [];
  if (teamIds.length) {
    const { data: fx } = await supabase.from('fixtures')
      .select('*')
      .in('team_id', teamIds)
      .gte('fixture_date', new Date().toISOString().slice(0,10))
      .order('fixture_date', { ascending: true })
      .limit(50);
    fixtures = fx || [];
  }
  
  const fixtureIds = fixtures.map(fx => fx.id).filter(Boolean);
  const { data: attendanceRows } = fixtureIds.length
    ? await supabase.from('fixture_attendance').select('*').in('fixture_id', fixtureIds).eq('scout_id', req.user.id)
    : { data: [] };
  const attendanceByFixture = {};
  (attendanceRows || []).forEach(a => { attendanceByFixture[a.fixture_id] = a; });

  // Enrich with player info and this scout's attendance status
  const enriched = fixtures.map(fx => {
    const teamPlayers = (pipeline||[]).filter(p => p.players?.team_id === fx.team_id).map(p => p.players).filter(Boolean);
    return { ...fx, players: teamPlayers, attendance: attendanceByFixture[fx.id] || null };
  });
  
  res.json({ data: enriched, total: enriched.length });
} catch(err) { console.error('[Scout Fixtures]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/fixtures/:id/attendance', requireAuth, requireRole('Scout'), async (req, res) => {
try {
  const status = req.body.status || 'attending';
  if (!['attending','not_attending','maybe'].includes(status)) return res.status(400).json({ error: 'Invalid attendance status' });
  const { data: fixture, error: fxErr } = await supabase.from('fixtures').select('*').eq('id', req.params.id).maybeSingle();
  if (fxErr) throw fxErr;
  if (!fixture) return res.status(404).json({ error: 'Fixture not found' });

  const payload = {
    fixture_id: fixture.id,
    scout_id: req.user.id,
    coach_id: fixture.coach_id || null,
    status,
    updated_at: new Date().toISOString()
  };
  const { data: existingAttendance, error: existingErr } = await supabase
    .from('fixture_attendance')
    .select('id')
    .eq('fixture_id', fixture.id)
    .eq('scout_id', req.user.id)
    .maybeSingle();
  if (existingErr) throw existingErr;
  const write = existingAttendance
    ? supabase.from('fixture_attendance').update(payload).eq('id', existingAttendance.id).select().single()
    : supabase.from('fixture_attendance').insert(payload).select().single();
  const { data: row, error } = await write;
  if (error) throw error;

  if (fixture.coach_id) {
    const { data: scout } = await supabase.from('scouts').select('first_name,last_name,club_name').eq('id', req.user.id).maybeSingle();
    const scoutName = [scout?.first_name, scout?.last_name].filter(Boolean).join(' ') || 'A scout';
    try {
      const { error: notifErr } = await supabase.from('notifications').insert({
        recipient_id: fixture.coach_id,
        recipient_type: 'Coach',
        notification_type: 'fixture_attendance',
        title: 'Scout fixture attendance updated',
        body: scoutName + ' marked ' + status.replace(/_/g, ' ') + ' for the fixture against ' + (fixture.opponent || 'your opponent') + '.',
        data: { fixtureId: fixture.id, scoutId: req.user.id, status }
      });
      if (notifErr) console.warn('[Fixture attendance notification skipped]', notifErr.message);
    } catch(notifErr) {
      console.warn('[Fixture attendance notification skipped]', notifErr.message);
    }
  }
  res.json({ attendance: row, message: 'Attendance saved' });
} catch(err) { console.error('[Scout fixture attendance]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/scouts/predictions â prediction history for this scout
router.get('/predictions', requireAuth, requireRole('Scout'), async (req, res) => {
try {
  const { data: scout } = await supabase.from('scouts')
    .select('id,scout_team_id,predictions_remaining,subscription_plan')
    .eq('id', req.user.id).single();

  if (!scout) return res.status(404).json({ error: 'Scout not found' });
  const plan = scout?.subscription_plan || 'Core';
  const limit = limitsFor(plan).predictions;
  const teamUsed = await teamUsage('predictions_log', scout);
  const remaining = Math.max(0, limit - teamUsed);
  
  const { data: predictions, error } = await supabase.from('predictions_log')
    .select('id, player_id, prediction_type, input_params, result, run_at, players(first_name, last_name, position_group, team_name, overall_rating)')
    .eq('scout_id', req.user.id)
    .order('run_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  
  res.json({ 
    data: predictions || [], 
    total: (predictions||[]).length,
    teamUsed,
    remaining, 
    planLimit: limit, 
    plan 
  });
} catch(err) { console.error('[Scout Predictions]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/scouts/exports â export history for this scout
router.get('/exports', requireAuth, requireRole('Scout'), async (req, res) => {
try {
  const { data: scout } = await supabase.from('scouts')
    .select('id,scout_team_id,exports_remaining,subscription_plan')
    .eq('id', req.user.id).single();

  if (!scout) return res.status(404).json({ error: 'Scout not found' });
  const plan = scout?.subscription_plan || 'Core';
  const limit = limitsFor(plan).exports;
  const teamUsed = await teamUsage('scout_exports', scout);
  const remaining = Math.max(0, limit - teamUsed);
  
  const { data: exports_ } = await supabase.from('scout_exports')
    .select('id, player_id, prediction_log_id, export_type, source, file_name, file_url, created_at, players(first_name, last_name, position_group, team_name)')
    .eq('scout_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  
  res.json({ 
    data: exports_ || [], 
    total: (exports_||[]).length,
    teamUsed,
    remaining, 
    planLimit: limit, 
    plan 
  });
} catch(err) { console.error('[Scout Exports]', err); res.status(500).json({ error: 'Internal server error' }); }
});


// GET /api/scouts/rankings â 5 leaderboards: top scorers, assisters, clean sheets, most interested, most expensive
router.get('/rankings', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const [
      { data: topScorers },
      { data: topAssisters },
      { data: topCleanSheets },
      { data: topExpensive },
    ] = await Promise.all([
      applyRealDataFilter(supabase.from('players').select('id,first_name,last_name,team_name,age_group,position_group,goals,overall_rating,transfer_value').eq('is_active', true), req).order('goals', { ascending: false }).limit(5),
      applyRealDataFilter(supabase.from('players').select('id,first_name,last_name,team_name,age_group,position_group,assists,overall_rating,transfer_value').eq('is_active', true), req).order('assists', { ascending: false }).limit(5),
      applyRealDataFilter(supabase.from('players').select('id,first_name,last_name,team_name,age_group,position_group,clean_sheets,overall_rating,transfer_value').eq('is_active', true), req).in('position_group', ['Goalkeeper','Defender']).order('clean_sheets', { ascending: false }).limit(5),
      applyRealDataFilter(supabase.from('players').select('id,first_name,last_name,team_name,age_group,position_group,transfer_value,overall_rating').eq('is_active', true), req).not('transfer_value', 'is', null).order('transfer_value', { ascending: false }).limit(5),
    ]);
    
    // Most interested: count scouts per player in recruitment_pipeline
    const { data: interestData } = await supabase
      .from('recruitment_pipeline')
      .select('player_id, players(id,first_name,last_name,team_name,age_group,position_group,overall_rating,transfer_value)')
      .eq('is_active', true);
    
    const interestCounts = {};
    (interestData || []).forEach(row => {
      if (!row.player_id) return;
      if (!interestCounts[row.player_id]) interestCounts[row.player_id] = { count: 0, player: row.players };
      interestCounts[row.player_id].count++;
    });
    const topInterested = Object.entries(interestCounts)
      .map(([pid, v]) => ({ ...v.player, interest_count: v.count }))
      .sort((a, b) => b.interest_count - a.interest_count)
      .slice(0, 5);
    
    res.json({
      topScorers: topScorers || [],
      topAssisters: topAssisters || [],
      topCleanSheets: topCleanSheets || [],
      topInterested,
      topExpensive: topExpensive || []
    });
  } catch(err) { console.error('[Rankings]', err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
