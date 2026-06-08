'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId } = require('../utils/auth');
const { analysePlayer, predictedSalary, computeOverall } = require('../engines/compatibility');
const email = require('../services/email');

// Height/weight range maps
const HEIGHT_RANGES = {
  very_short: { label:'Very Short', range:'155-163 cm', min:155, max:163 },
  short:      { label:'Short',      range:'163-170 cm', min:163, max:170 },
  average:    { label:'Average',    range:'170-178 cm', min:170, max:178 },
  tall:       { label:'Tall',       range:'178-185 cm', min:178, max:185 },
  very_tall:  { label:'Very Tall',  range:'185-200 cm', min:185, max:200 },
};
const BUILD_RANGES = {
  very_slight: { label:'Very Slight', range:'50-58 kg',  min:50,  max:58  },
  slight:      { label:'Slight',      range:'58-65 kg',  min:58,  max:65  },
  lean:        { label:'Lean',        range:'65-72 kg',  min:65,  max:72  },
  athletic:    { label:'Athletic',    range:'72-80 kg',  min:72,  max:80  },
  stocky:      { label:'Stocky',      range:'80-88 kg',  min:80,  max:88  },
  powerful:    { label:'Powerful',    range:'88-96 kg',  min:88,  max:96  },
  very_powerful:{ label:'Very Powerful', range:'96+ kg', min:96, max:120 },
};

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
    const { search, posGroup, specificPos, teamId, minAge, maxAge, minOverall, page=1, limit=20 } = req.query;
    let q = supabase.from('players').select(
      'id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,team_name,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,height_range_cm,weight_range_kg,nationality,nationality_code',
      { count: 'exact' }
    ).eq('is_active', true);
    if (search)     q = q.or('first_name.ilike.%' + search + '%,last_name.ilike.%' + search + '%');
    if (posGroup)   q = q.eq('position_group', posGroup);
    if (specificPos)q = q.contains('positions', [specificPos.toUpperCase()]);
    if (teamId)     q = q.eq('team_id', teamId);
    if (minAge)     q = q.gte('age', Number(minAge));
    if (maxAge)     q = q.lte('age', Number(maxAge));
    if (minOverall) q = q.gte('overall_rating', Number(minOverall));
    const off = (Number(page)-1)*Number(limit);
    q = q.order('overall_rating', { ascending: false }).range(off, off+Number(limit)-1);
    const { data, error, count } = await q;
    if (error) throw error;
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
    res.json({ player: data, recentMatches: matches||[], videos: videos||[] });
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
    const playerData = {
      player_id: generateId('PLY'),
      first_name: b.firstName.trim(), last_name: b.lastName.trim(),
      email: b.email||null, phone: b.phone||null, parent_email: b.parentEmail||null,
      date_of_birth: b.dateOfBirth||null,
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
    // Store overall as 0-10 (engine returns 0-100, divide by 10)
    const overall100 = computeOverall(playerData);
    playerData.overall_rating = Math.round(overall100) / 10;
    const { data, error } = await supabase.from('players').insert(playerData).select().single();
    if (error) throw error;
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({ predicted_salary_weekly: salary.weeklyGross }).eq('id', data.id);
    res.status(201).json({ player: { ...data, predicted_salary_weekly: salary.weeklyGross } });
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
        const playerData = {
          player_id: generateId('PLY'),
          first_name: (p.firstName||'').trim(), last_name: (p.lastName||'').trim(),
          email: p.email||null, parent_email: p.parentEmail||null,
          date_of_birth: p.dateOfBirth||null,
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
    const { data, error } = await supabase.from('players').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    const overall100 = computeOverall(data);
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({
      overall_rating: Math.round(overall100) / 10,
      predicted_salary_weekly: salary.weeklyGross
    }).eq('id', data.id);
    res.json({ player: { ...data, overall_rating: Math.round(overall100)/10, predicted_salary_weekly: salary.weeklyGross } });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Analyse player vs team
router.post('/:id/analyse', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const { teamId } = req.body;
    const { data: player } = await supabase.from('players').select('*').eq('id', req.params.id).single();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    let team = { tier: 5 };
    if (teamId) { const { data: t } = await supabase.from('scout_teams').select('*').eq('id', teamId).single(); if (t) team = t; }
    const { data: matches } = await supabase.from('match_facts').select('*').eq('player_id', req.params.id).order('match_date',{ascending:false}).limit(10);
    const { data: scout } = await supabase.from('scouts').select('scout_preferences').eq('id', req.user.id).single();
    const prefs = scout?.scout_preferences || {};
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
    const { data: scout } = await supabase.from('scouts').select('id,first_name,last_name,club_name,scout_team_id').eq('id', req.user.id).single();
    if (!player||!scout) return res.status(404).json({ error: 'Not found' });
    await supabase.from('recruitment_pipeline').upsert({
      scout_id: req.user.id, player_id: req.params.id,
      scout_team_id: scout.scout_team_id, notes, interest_level: interestLevel, stage: 'watching'
    }, { onConflict: 'scout_id,player_id' });
    await supabase.from('notifications').insert({
      recipient_id: req.params.id, recipient_type: 'Player', notification_type: 'scout_interest',
      title: 'A scout is interested in you!',
      body: scout.first_name + ' ' + scout.last_name + ' from ' + scout.club_name + ' has expressed interest in your profile.',
      data: { scoutId: scout.id, scoutName: scout.first_name + ' ' + scout.last_name, scoutClub: scout.club_name }
    });
    if (player.email) {
      await email.sendScoutInterest({ to: player.email, playerFirstName: player.first_name,
        playerName: player.first_name + ' ' + player.last_name,
        scoutName: scout.first_name + ' ' + scout.last_name, scoutClub: scout.club_name });
    }
    res.json({ message: 'Interest recorded and notifications sent.' });
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

// PATCH ratings (Stratex admin only)
router.patch('/:id/ratings', requireAuth, requireRole('Stratex','Coach'), async (req, res) => {
try {
const allowed = ['pace','shooting','passing','dribbling','defending','physical','vision','leadership','agility','strength','stamina','jumping','composure','crossing','positioning','heading','tackling'];
const updates = {};
allowed.forEach(function(k){ if (req.body[k] !== undefined) updates[k] = req.body[k]; });
const { data: existing } = await supabase.from('players').select('*').eq('id', req.params.id).single();
if (!existing) return res.status(404).json({ error: 'Player not found' });
const merged = Object.assign({}, existing, updates);
const overall100 = computeOverall(merged);
updates.overall_rating = Math.round(overall100 * 10) / 100;
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

// DELETE player (Stratex admin only)
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
