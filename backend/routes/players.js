'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId } = require('../utils/auth');
const { analysePlayer, predictedSalary, computeOverall, getPosGroup } = require('../engines/compatibility');
const email = require('../services/email');

// Height/weight range maps
const HEIGHT_RANGES = {
  very_short: { label:'Very Short', range:'155-163 cm', min:155, max:163 },
  short: { label:'Short', range:'163-170 cm', min:163, max:170 },
  average: { label:'Average', range:'170-178 cm', min:170, max:178 },
  tall: { label:'Tall', range:'178-185 cm', min:178, max:185 },
  very_tall: { label:'Very Tall', range:'185-200 cm', min:185, max:200 },
};
const BUILD_RANGES = {
  very_slight: { label:'Very Slight', range:'50-58 kg', min:50, max:58 },
  slight: { label:'Slight', range:'58-65 kg', min:58, max:65 },
  lean: { label:'Lean', range:'65-72 kg', min:65, max:72 },
  athletic: { label:'Athletic', range:'72-80 kg', min:72, max:80 },
  stocky: { label:'Stocky', range:'80-88 kg', min:80, max:88 },
  powerful: { label:'Powerful', range:'88-96 kg', min:88, max:96 },
  very_powerful:{ label:'Very Powerful', range:'96+ kg', min:96, max:120 },
};

// Calculate age and age group from date_of_birth
function calcAgeGroup(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  if (age <= 6) return { age, group: 'U6' };
  if (age <= 7) return { age, group: 'U7' };
  if (age <= 8) return { age, group: 'U8' };
  if (age <= 9) return { age, group: 'U9' };
  if (age <= 10) return { age, group: 'U10' };
  if (age <= 11) return { age, group: 'U11' };
  if (age <= 12) return { age, group: 'U12' };
  if (age <= 13) return { age, group: 'U13' };
  if (age <= 14) return { age, group: 'U14' };
  if (age <= 15) return { age, group: 'U15' };
  if (age <= 16) return { age, group: 'U16' };
  return { age, group: null };
}

// Calculate transfer value from Task 9 spec
function calcTransferValue(player, overall100) {
  const group = getPosGroup(player.positions || player.primary_position || player.specific_position);
  // Base values by position group
  const BASE = { Forward: 70000, Midfielder: 60000, Defender: 52000, Goalkeeper: 52000 };
  const baseVal = BASE[group] || 60000;

  // Rating multiplier
  let ratingMult = 0.4;
  if (overall100 <= 40) ratingMult = 0.4;
  else if (overall100 <= 60) ratingMult = 0.7;
  else if (overall100 <= 75) ratingMult = 0.9;
  else if (overall100 <= 85) ratingMult = 1.1;
  else if (overall100 <= 95) ratingMult = 1.3;
  else ratingMult = 1.5;

  // Age runway bonus
  let ageBonus = 0;
  const ageInfo = calcAgeGroup(player.date_of_birth);
  const age = ageInfo ? ageInfo.age : null;
  if (age !== null) {
    if (age <= 9) ageBonus = 0.08;
    else if (age <= 12) ageBonus = 0.05;
    else if (age <= 14) ageBonus = 0.02;
  }

  // Appearance confidence
  const apps = Number(player.appearances) || 0;
  let appConf = 1.0;
  if (apps === 0) appConf = 0.5;
  else if (apps <= 4) appConf = 0.7;
  else if (apps <= 9) appConf = 0.85;

  let value = baseVal * ratingMult * (1 + ageBonus) * appConf;
  // Cap min 5000 max 200000, round to nearest 1000
  value = Math.max(5000, Math.min(200000, Math.round(value / 1000) * 1000));
  return value;
}

router.get('/height-ranges', (_, res) => res.json(HEIGHT_RANGES));
router.get('/build-ranges', (_, res) => res.json(BUILD_RANGES));

// Count active players
router.get('/count', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    const { count, error } = await supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true);
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// List players
router.get('/', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    const { search, posGroup, specificPos, teamId, minAge, maxAge, minOverall, ageGroup, page=1, limit=20 } = req.query;
    let q = supabase.from('players').select(
      'id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,team_name,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,height_range_cm,weight_range_kg,nationality,nationality_code,appearances,goals,assists,clean_sheets,yellow_cards,red_cards,pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,foot,date_of_birth',
      { count: 'exact' }
    ).eq('is_active', true);
    if (search) q = q.or('first_name.ilike.%' + search + '%,last_name.ilike.%' + search + '%');
    if (posGroup) q = q.eq('position_group', posGroup);
    if (specificPos) q = q.contains('positions', [specificPos.toUpperCase()]);
    if (teamId) q = q.eq('team_id', teamId);
    if (minAge) q = q.gte('age', Number(minAge));
    if (maxAge) q = q.lte('age', Number(maxAge));
    if (minOverall) q = q.gte('overall_rating', Number(minOverall));
    if (ageGroup) q = q.eq('age_group', ageGroup);
    const off = (Number(page)-1)*Number(limit);
    q = q.order('overall_rating', { ascending: false }).range(off, off+Number(limit)-1);
    const { data, error, count } = await q;
    if (error) throw error;
    // Auto-calc transfer_value for players where it is 0 or null
    const needsCalc = (data||[]).filter(p => !p.transfer_value || p.transfer_value === 0);
    if (needsCalc.length > 0) {
      await Promise.all(needsCalc.map(async p => {
        try {
          const overall100 = p.overall_rating ? (p.overall_rating > 10 ? p.overall_rating : p.overall_rating * 10) : 50;
          const tv = calcTransferValue(p, overall100);
          if (tv > 0) { await supabase.from('players').update({ transfer_value: tv }).eq('id', p.id); p.transfer_value = tv; }
        } catch(e) {}
      }));
    }
    res.json({ data, total: count, page: Number(page), limit: Number(limit) });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});


// Get single player
router.get('/:id', requireAuth, async (req, res) => {
try {
if (req.user.accountType === 'Player' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
const { data, error } = await supabase.from('players').select('*').eq('id', req.params.id).single();
if (error||!data) return res.status(404).json({ error: 'Player not found' });
const { data: matches } = await supabase.from('match_facts').select('*').eq('player_id', req.params.id).order('match_date', { ascending: false }).limit(10);
const { data: videos } = await supabase.from('player_videos').select('*').eq('player_id', req.params.id).order('created_at', { ascending: false });
// Fetch upcoming fixtures for this player's team
let upcomingFixtures = [];
if (data.team_id) {
const today = new Date().toISOString().slice(0,10);
const { data: fx } = await supabase.from('fixtures').select('*').eq('team_id', data.team_id).gte('fixture_date', today).order('fixture_date', { ascending: true }).limit(5);
upcomingFixtures = fx || [];
}
// If scout, check pipeline status and interests_remaining
let pipelineStatus = null;
let interestsRemaining = null;
if (req.user.accountType === 'Scout') {
const { data: pipelineRow } = await supabase.from('recruitment_pipeline').select('id,stage').eq('scout_id', req.user.id).eq('player_id', req.params.id).maybeSingle();
pipelineStatus = pipelineRow ? pipelineRow.stage : null;
const { data: scoutRow } = await supabase.from('scouts').select('interests_remaining').eq('id', req.user.id).single();
interestsRemaining = scoutRow ? (scoutRow.interests_remaining ?? 200) : 200;
}
res.json({ player: data, recentMatches: matches||[], videos: videos||[], upcomingFixtures, pipelineStatus, interestsRemaining });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Create player (Coach/Stratex)
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const b = req.body;
    if (!b.firstName||!b.lastName) return res.status(400).json({ error: 'firstName and lastName required' });
    const posArr = Array.isArray(b.positions) ? b.positions.map(p=>p.toUpperCase()) : [];
    const hRange = HEIGHT_RANGES[b.heightCategory];
    const bRange = BUILD_RANGES[b.buildCategory];
    const ageInfo = calcAgeGroup(b.dateOfBirth);
    const playerData = {
      player_id: generateId('PLY'),
      first_name: b.firstName.trim(), last_name: b.lastName.trim(),
      email: b.email||null, phone: b.phone||null, parent_email: b.parentEmail||null,
      date_of_birth: b.dateOfBirth||null,
      age: ageInfo ? ageInfo.age : null,
      age_group: ageInfo ? ageInfo.group : null,
      nationality: b.nationality||'England', nationality_code: b.nationalityCode||'gb-eng',
      position_group: b.positionGroup||null, specific_position: b.specificPosition||null,
      positions: posArr, primary_position: posArr[0]||b.specificPosition||null,
      foot: b.foot||'Right',
      height_category: b.heightCategory||'average',
      height_range_cm: hRange ? hRange.range : b.heightRangeCm||null,
      height_min_cm: hRange ? hRange.min : null, height_max_cm: hRange ? hRange.max : null,
      build_category: b.buildCategory||'athletic',
      weight_range_kg: bRange ? bRange.range : b.weightRangeKg||null,
      weight_min_kg: bRange ? bRange.min : null, weight_max_kg: bRange ? bRange.max : null,
      team_name: b.teamName||null,
      pace: b.pace||null, agility: b.agility||null, strength: b.strength||null,
      stamina: b.stamina||null, jumping: b.jumping||null, composure: b.composure||null,
      shooting: b.shooting||null, passing: b.passing||null, dribbling: b.dribbling||null,
      defending: b.defending||null, crossing: b.crossing||null, vision: b.vision||null,
      positioning: b.positioning||null, heading: b.heading||null, tackling: b.tackling||null,
      work_rate: b.workRate||'Medium/Medium',
      gk_diving: b.gkDiving||null, gk_handling: b.gkHandling||null, gk_kicking: b.gkKicking||null,
      gk_reflexes: b.gkReflexes||null, gk_positioning: b.gkPositioning||null,
      gk_distribution: b.gkDistribution||null, gk_communication: b.gkCommunication||null,
      gk_sweeping: b.gkSweeping||null,
      avatar_config: b.avatarConfig||null,
      is_active: true,
    };
    // Compute overall (0-100) then store as 0-10
    const overall100 = computeOverall(playerData);
    playerData.overall_rating = Math.round(overall100) / 10;
    // Compute transfer value
    playerData.transfer_value = calcTransferValue(playerData, overall100);
    const { data, error } = await supabase.from('players').insert(playerData).select().single();
    if (error) throw error;
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({ predicted_salary_weekly: salary.weeklyGross }).eq('id', data.id);
    
    // Generate login code for the player
    const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const loginCodeExpires = new Date(Date.now() + 365*24*60*60*1000);
    await supabase.from('players').update({ login_code: loginCode, login_code_expires: loginCodeExpires }).eq('id', data.id);
    
    // Send email to parent or player
    const recipientEmail = b.parentEmail || b.email || null;
    if (recipientEmail) {
      try {
        await email.sendPlayerLoginCode({
          to: recipientEmail,
          playerFirstName: b.firstName,
          loginCode,
          loginUrl: 'https://scoutlink.app/frontend/pages/login.html'
        });
      } catch(emailErr) { console.error('[PlayerCreate] Email error:', emailErr.message); }
    }
    
    // Notify coach
    if (req.user.accountType === 'Coach') {
      try {
        await supabase.from('notifications').insert({
          recipient_id: req.user.id, recipient_type: 'Coach',
          title: 'Player added successfully',
          body: b.firstName + ' ' + b.lastName + ' has been added. Login code: ' + loginCode,
          data: { player_id: data.id, login_code: loginCode, type: 'player_added' },
          is_read: false
        });
      } catch(notifErr) {}
    }
    
    res.status(201).json({ player: { ...data, predicted_salary_weekly: salary.weeklyGross, login_code: loginCode }, loginCode, message: 'Player created. Login code: ' + loginCode });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Bulk create players
router.post('/bulk', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { players, teamName } = req.body;
    if (!Array.isArray(players)||players.length===0) return res.status(400).json({ error: 'players array required' });
    if (players.length > 50) return res.status(400).json({ error: 'Max 50 players per bulk import' });
    const results = { created: [], errors: [] };
    for (const p of players) {
      try {
        const posArr = Array.isArray(p.positions) ? p.positions.map(x=>x.toUpperCase()) : [];
        const hRange = HEIGHT_RANGES[p.heightCategory];
        const bRange = BUILD_RANGES[p.buildCategory];
        const ageInfo = calcAgeGroup(p.dateOfBirth);
        const playerData = {
          player_id: generateId('PLY'),
          first_name: (p.firstName||'').trim(), last_name: (p.lastName||'').trim(),
          email: p.email||null, parent_email: p.parentEmail||null,
          date_of_birth: p.dateOfBirth||null,
          age: ageInfo ? ageInfo.age : null,
          age_group: ageInfo ? ageInfo.group : null,
          nationality: p.nationality||'England', nationality_code: p.nationalityCode||'gb-eng',
          position_group: p.positionGroup||null, specific_position: p.specificPosition||null,
          positions: posArr, primary_position: posArr[0]||null,
          foot: p.foot||'Right',
          height_category: p.heightCategory||'average',
          height_range_cm: hRange ? hRange.range : null,
          height_min_cm: hRange ? hRange.min : null, height_max_cm: hRange ? hRange.max : null,
          build_category: p.buildCategory||'athletic',
          weight_range_kg: bRange ? bRange.range : null,
          weight_min_kg: bRange ? bRange.min : null, weight_max_kg: bRange ? bRange.max : null,
          team_name: teamName||p.teamName||null,
          pace: p.pace||null, agility: p.agility||null, strength: p.strength||null,
          stamina: p.stamina||null, jumping: p.jumping||null, composure: p.composure||null,
          shooting: p.shooting||null, passing: p.passing||null, dribbling: p.dribbling||null,
          defending: p.defending||null, vision: p.vision||null, positioning: p.positioning||null,
          heading: p.heading||null, tackling: p.tackling||null, crossing: p.crossing||null,
          gk_diving: p.gkDiving||null, gk_handling: p.gkHandling||null, gk_kicking: p.gkKicking||null,
          gk_reflexes: p.gkReflexes||null, gk_positioning: p.gkPositioning||null,
          gk_distribution: p.gkDistribution||null, gk_communication: p.gkCommunication||null,
          gk_sweeping: p.gkSweeping||null,
          is_active: true,
        };
        const overall100 = computeOverall(playerData);
        playerData.overall_rating = Math.round(overall100) / 10;
        playerData.transfer_value = calcTransferValue(playerData, overall100);
        const { data: created, error } = await supabase.from('players').insert(playerData).select('id,player_id,first_name,last_name').single();
        if (error) throw error;
        const salary = predictedSalary(created, { tier: 5 });
        await supabase.from('players').update({ predicted_salary_weekly: salary.weeklyGross }).eq('id', created.id);
        results.created.push(created);
      } catch(e) {
        results.errors.push({ player: p.firstName + ' ' + p.lastName, error: e.message });
      }
    }
    res.status(201).json({ message: results.created.length + ' players created, ' + results.errors.length + ' errors', ...results });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Update player
router.put('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const updates = req.body;
    if (updates.positions) updates.positions = updates.positions.map(p=>p.toUpperCase());
    if (updates.positions?.length) updates.primary_position = updates.positions[0];
    if (updates.heightCategory && HEIGHT_RANGES[updates.heightCategory]) {
      const h = HEIGHT_RANGES[updates.heightCategory];
      updates.height_range_cm = h.range; updates.height_min_cm = h.min; updates.height_max_cm = h.max;
    }
    if (updates.buildCategory && BUILD_RANGES[updates.buildCategory]) {
      const b = BUILD_RANGES[updates.buildCategory];
      updates.weight_range_kg = b.range; updates.weight_min_kg = b.min; updates.weight_max_kg = b.max;
    }
    if (updates.dateOfBirth) {
      const ageInfo = calcAgeGroup(updates.dateOfBirth);
      if (ageInfo) { updates.age = ageInfo.age; updates.age_group = ageInfo.group; }
    }
    const { data, error } = await supabase.from('players').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    const overall100 = computeOverall(data);
    const transferValue = calcTransferValue(data, overall100);
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({
      overall_rating: Math.round(overall100) / 10,
      transfer_value: transferValue,
      predicted_salary_weekly: salary.weeklyGross
    }).eq('id', data.id);
    res.json({ player: { ...data, overall_rating: Math.round(overall100)/10, transfer_value: transferValue, predicted_salary_weekly: salary.weeklyGross } });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Analyse player vs team
router.post('/:id/analyse', requireAuth, requireRole('Scout','Stratex','Coach'), async (req, res) => {
  try {
    const { teamId } = req.body;
    const { data: player } = await supabase.from('players').select('*').eq('id', req.params.id).single();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    let team = { tier: 5 };
    if (teamId) { const { data: t } = await supabase.from('scout_teams').select('*').eq('id', teamId).single(); if (t) team = t; }
    // If scout is logged in, try to load their team preferences
    if (req.user.accountType === 'Scout') {
      const { data: scout } = await supabase.from('scouts').select('scout_preferences,scout_team_id').eq('id', req.user.id).single();
      if (scout && scout.scout_team_id && !teamId) {
        const { data: st } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).single();
        if (st) team = st;
        if (scout.scout_preferences) {
          const prefs = scout.scout_preferences;
          if (prefs.teamWeaknesses?.length) team.team_weaknesses = prefs.teamWeaknesses;
          if (prefs.roleExpectations?.length) team.role_expectations = prefs.roleExpectations;
          if (prefs.longTermGoals?.length) team.long_term_goals = prefs.longTermGoals;
          if (prefs.formation) team.formation = prefs.formation;
          if (prefs.playingStyle) team.playing_style = prefs.playingStyle;
        }
      }
    }
    const { data: matches } = await supabase.from('match_facts').select('*').eq('player_id', req.params.id).order('match_date',{ascending:false}).limit(10);
    const { data: scout2 } = await supabase.from('scouts').select('scout_preferences').eq('id', req.user.id).maybeSingle();
    const prefs = scout2?.scout_preferences || {};
    const analysis = analysePlayer(player, team, matches||[], prefs);
    if (teamId) {
      await supabase.from('compatibility_scores').upsert({
        player_id: req.params.id, scout_team_id: teamId,
        compatibility_score: analysis.compatibilityScore, transfer_value: analysis.transferValue,
        prediction_score: analysis.predictionScore, breakdown: analysis.compatibilityBreakdown,
        calculated_at: new Date()
      }, { onConflict: 'player_id,scout_team_id' });
    }
    res.json(analysis);
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});


// Scout interest
router.post('/:id/scout-interest', requireAuth, requireRole('Scout'), async (req, res) => {
try {
const { notes, interestLevel = 7 } = req.body;
const { data: player } = await supabase.from('players').select('id,first_name,last_name,email,team_name').eq('id', req.params.id).single();
const { data: scout } = await supabase.from('scouts').select('id,first_name,last_name,club_name,scout_team_id,interests_remaining').eq('id', req.user.id).single();
if (!player||!scout) return res.status(404).json({ error: 'Not found' });
// Check if already in pipeline
const { data: existing } = await supabase.from('recruitment_pipeline').select('id,stage').eq('scout_id', req.user.id).eq('player_id', req.params.id).maybeSingle();
if (existing) {
return res.json({ message: 'Already in pipeline', alreadyInPipeline: true, stage: existing.stage, interestsRemaining: scout.interests_remaining ?? 200 });
}
// Check interests remaining
const remaining = typeof scout.interests_remaining === 'number' ? scout.interests_remaining : 200;
if (remaining <= 0) {
return res.status(402).json({ error: 'You have used all your interests for this plan. Upgrade to add more players.', interestsRemaining: 0 });
}
// Insert into pipeline
const { error: insertErr } = await supabase.from('recruitment_pipeline').insert({
scout_id: req.user.id, player_id: req.params.id,
scout_team_id: scout.scout_team_id, notes: notes||null, interest_level: interestLevel, stage: 'watching'
});
if (insertErr) {
// If unique constraint violation, treat as already in pipeline
if (insertErr.code === '23505') {
return res.json({ message: 'Already in pipeline', alreadyInPipeline: true, interestsRemaining: remaining });
}
throw insertErr;
}
// Only decrement AFTER successful insert
const newRemaining = Math.max(0, remaining - 1);
await supabase.from('scouts').update({ interests_remaining: newRemaining }).eq('id', req.user.id);
// Notify player
supabase.from('notifications').insert({
recipient_id: req.params.id, recipient_type: 'Player', notification_type: 'scout_interest',
title: 'A scout is interested in you!',
body: scout.first_name + ' ' + scout.last_name + ' from ' + scout.club_name + ' has expressed interest in your profile.',
data: { scoutId: scout.id, scoutName: scout.first_name + ' ' + scout.last_name, scoutClub: scout.club_name }
}).then(()=>{}).catch(()=>{});
if (player.email) {
email.sendScoutInterest({ to: player.email, playerFirstName: player.first_name,
playerName: player.first_name + ' ' + player.last_name,
scoutName: scout.first_name + ' ' + scout.last_name, scoutClub: scout.club_name }).catch(()=>{});
}
res.json({ message: 'Interest recorded. Player added to pipeline.', alreadyInPipeline: false, interestsRemaining: newRemaining });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// PATCH avatar config (player)
router.patch('/:id/avatar', requireAuth, requireRole('Player','Coach','Stratex'), async (req, res) => {
  try {
    if (req.user.accountType === 'Player' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
    const { avatar_config } = req.body;
    const { error } = await supabase.from('players').update({ avatar_config }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Avatar updated' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// PATCH ratings
router.patch('/:id/ratings', requireAuth, requireRole('Stratex','Coach'), async (req, res) => {
  try {
    const allowed = ['pace','shooting','passing','dribbling','defending','vision','agility','strength','stamina','jumping','composure','crossing','positioning','heading','tackling','gk_diving','gk_handling','gk_kicking','gk_reflexes','gk_positioning','gk_distribution','gk_communication','gk_sweeping'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const { data: existing } = await supabase.from('players').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Player not found' });
    const merged = Object.assign({}, existing, updates);
    const overall100 = computeOverall(merged);
    const transferValue = calcTransferValue(merged, overall100);
    updates.overall_rating = Math.round(overall100) / 10;
    updates.transfer_value = transferValue;
    const salary = predictedSalary(merged, { tier: 5 });
    updates.predicted_salary_weekly = salary.weeklyGross;
    const { data, error } = await supabase.from('players').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ player: data, message: 'Ratings updated' });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// PATCH team assignment
router.patch('/:id/team', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { team_id } = req.body;
    let teamName = null;
    if (team_id) {
      const { data: t } = await supabase.from('school_academy_teams').select('team_name').eq('id', team_id).single();
      teamName = t ? t.team_name : null;
    }
    const { error } = await supabase.from('players').update({ team_id: team_id||null, team_name: teamName }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Team assignment updated' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// DELETE player
router.delete('/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    await supabase.from('match_facts').delete().eq('player_id', req.params.id);
    await supabase.from('player_videos').delete().eq('player_id', req.params.id);
    await supabase.from('recruitment_pipeline').delete().eq('player_id', req.params.id);
    await supabase.from('compatibility_scores').delete().eq('player_id', req.params.id);
    await supabase.from('notifications').delete().eq('recipient_id', req.params.id);
    const { error } = await supabase.from('players').update({ is_active: false }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Player deleted' });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;