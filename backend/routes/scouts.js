'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { getPosGroup } = require('../engines/compatibility');

function confidenceModifier(apps) {
  const n = Number(apps) || 0;
  if (n === 0) return 0.2; if (n <= 2) return 0.4; if (n <= 5) return 0.6; if (n <= 10) return 0.8;
  return 1.0;
}
function applyConf(raw, conf) { return raw * conf + 50 * (1 - conf); }
function ga(p, k) { const v = parseFloat(p[k]); return isNaN(v) ? 5 : (v <= 10 ? v * 10 : v); }

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
    const { data: scout } = await supabase.from('scouts').select('scout_team_id').eq('id', req.user.id).single();
    if (scout && scout.scout_team_id) {
      await supabase.from('scout_teams').update({ team_weaknesses:teamWeaknesses||[], role_expectations:roleExpectations||[], long_term_goals:longTermGoals||[], formation:formation||null, playing_style:playingStyle||null, scout_region:scoutRegion||null, country:country||null, salary_cap:salaryCap?Number(salaryCap):null, min_appearances:minAppearances?Number(minAppearances):0, preferred_positions:preferredPositions||[], age_groups:ageGroups||[], club_name:clubName||null }).eq('id', scout.scout_team_id);
    }
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

router.get('/recommended-players', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
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
    let q = supabase.from('players').select('id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,overall_rating,transfer_value,predicted_salary_weekly,team_name,height_category,build_category,nationality,date_of_birth,pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,appearances,goals,assists,clean_sheets,yellow_cards,red_cards,foot,gk_diving,gk_handling,gk_kicking,gk_reflexes,gk_positioning,gk_distribution').eq('is_active', true);
    if (prefs.minAppearances && Number(prefs.minAppearances) > 0) q = q.gte('appearances', Number(prefs.minAppearances));
    q = q.order('overall_rating', { ascending: false }).limit(100);
    const { data: players, error } = await q;
    if (error) throw error;
    const scored = (players||[]).map(p => { const r = calcFullCompatibility(p, scoutTeam); return { ...p, compatibilityScore: r.score, compatibilityBreakdown: r.breakdown }; });
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    let filtered = scored;
    if (prefs.preferredPositions && prefs.preferredPositions.length) {
      const pp = prefs.preferredPositions.map(p => p.toUpperCase());
      const pf = scored.filter(p => { const pos = Array.isArray(p.positions) ? p.positions : [p.specific_position||p.primary_position||'']; return pos.some(x => pp.includes(String(x).toUpperCase())); });
      if (pf.length > 0) filtered = pf;
    }
    res.json({ data: filtered.slice(0, 10), total: filtered.length, setupRequired: false });
  } catch (err) { console.error('[Recommended Players]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/players-count', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    const { count, error } = await supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true);
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
    let q = supabase.from('recruitment_pipeline').select('id,stage,notes,interest_level,created_at,updated_at,players(id,first_name,last_name,specific_position,primary_position,overall_rating,transfer_value,team_name,age,age_group,position_group,appearances),scouts(id,first_name,last_name,club_name)',{count:'exact'});
    if (scoutId) q = q.eq('scout_id', scoutId);
    if (req.query.stage) q = q.eq('stage', req.query.stage);
    const { limit = 50 } = req.query;
    q = q.order('updated_at', { ascending: false }).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data||[], total: count||0 });
  } catch (err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/add-scout', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data: me } = await supabase.from('scouts').select('id,scout_team_id,club_name,is_super_user').eq('id', req.user.id).single();
    if (!me || !me.is_super_user) return res.status(403).json({ error: 'Only super user scouts can add scouts' });
    const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, subscriptionPlan } = req.body;
    if (!firstName || !lastName || !emailAddr) return res.status(400).json({ error: 'firstName, lastName, email required' });
    const tables = ['scouts','coaches','players'];
    for (const t of tables) { const { data: eRow } = await supabase.from(t).select('id').eq('email',emailAddr.toLowerCase().trim()).maybeSingle(); if (eRow) return res.status(409).json({ error: 'This email is already registered on ScoutLink.' }); }
    if (phone) { const { data: pRow } = await supabase.from('scouts').select('id').eq('phone',phone.trim()).maybeSingle(); if (pRow) return res.status(409).json({ error: 'This phone number is already registered.' }); }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let loginCode = '', attempts = 0;
    while (attempts < 20) { let c = ''; for (let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)]; const [s,co,p] = await Promise.all([supabase.from('scouts').select('id').eq('login_code',c).maybeSingle(),supabase.from('coaches').select('id').eq('login_code',c).maybeSingle(),supabase.from('players').select('id').eq('login_code',c).maybeSingle()]); if (!s.data&&!co.data&&!p.data){loginCode=c;break;} attempts++; }
    if (!loginCode) return res.status(500).json({ error: 'Could not generate unique login code' });
    const {generateId} = require('../utils/auth'); const config = require('../config'); const emailSvc = require('../services/email');
    const PL = {Core:{exports:30,predictions:120,interests:200},Plus:{exports:120,predictions:600,interests:1000},Elite:{exports:500,predictions:1200,interests:99999},Enterprise:{exports:99999,predictions:99999,interests:99999}};
    const plan = subscriptionPlan||'Core'; const limits = PL[plan]||PL.Core; const expires = new Date(Date.now()+7*24*60*60*1000);
    const { data: newScout, error } = await supabase.from('scouts').insert({scout_id:generateId('SCT'),first_name:firstName.trim(),last_name:lastName.trim(),email:emailAddr.toLowerCase().trim(),phone:phone||null,club_name:scoutClub||me.club_name||null,club_league:scoutLeague||null,scout_team_id:me.scout_team_id||null,login_code:loginCode,login_code_expires:expires,is_active:true,preferences_set:false,is_super_user:false,registration_complete:false,subscription_plan:plan,plan_start:new Date(),plan_end:new Date(Date.now()+365*24*60*60*1000),exports_remaining:limits.exports,predictions_remaining:limits.predictions,interests_remaining:limits.interests}).select().single();
    if (error) throw error;
    const baseUrl = config.brandUrl||'https://scoutlink.app'; const cl = baseUrl+'/frontend/pages/complete-registration.html?code='+loginCode+'&email='+encodeURIComponent(emailAddr.toLowerCase())+'&type=Scout';
    await emailSvc.sendCompleteSignup({to:emailAddr,firstName,loginCode,accountType:'Scout',completeLink:cl}).catch(e=>console.error('[Email]',e.message));
    res.status(201).json({message:'Scout added. Complete-registration email sent.',scoutId:newScout.id,loginCode,completeLink:cl});
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
