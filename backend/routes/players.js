'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId, generateLoginCode } = require('../utils/auth');
const {
  analysePlayer,
  predictedSalary,
  computeOverall,
  getPosGroup,
  calculateOverallBreakdown,
  calculatePositionRatings,
  calculateValueAnalysis
} = require('../engines/compatibility');
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

const SCOUT_PLAN_LIMITS = {
  Core: { exports: 30, predictions: 120, interests: 200 },
  Plus: { exports: 120, predictions: 600, interests: 1000 },
  Elite: { exports: 500, predictions: 1200, interests: 99999 },
  Enterprise: { exports: 99999, predictions: 99999, interests: 99999 }
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
  try {
    return calculateValueAnalysis({ ...player, overall_rating: overall100 }, []).value;
  } catch(e) {
    const group = getPosGroup(player.positions || player.primary_position || player.specific_position);
    const baseVal = { Forward: 70000, Midfielder: 60000, Defender: 52000, Goalkeeper: 52000 }[group] || 60000;
    const ratingMult = overall100 >= 85 ? 1.3 : overall100 >= 75 ? 1.1 : overall100 >= 60 ? 0.9 : 0.7;
    return Math.max(5000, Math.min(200000, Math.round((baseVal * ratingMult) / 1000) * 1000));
  }
}

function scoringPayload(player, matchHistory = [], context = {}) {
  const overallBreakdown = calculateOverallBreakdown(player, matchHistory);
  const positionRatings = calculatePositionRatings(player, matchHistory);
  const valueAnalysis = calculateValueAnalysis(player, matchHistory, context);
  return {
    overall_rating: Math.round(overallBreakdown.finalScore),
    transfer_value: valueAnalysis.value,
    overall_breakdown: overallBreakdown,
    position_ratings: positionRatings,
    value_analysis: valueAnalysis,
    scoring_version: 'v3'
  };
}

async function getCoachPlayerScope(req, requestedCoachId) {
  if (req.user.accountType !== 'Coach') return null;
  const { data: coach, error } = await supabase
    .from('coaches')
    .select('id,team_id,team_name,is_super_user')
    .eq('id', req.user.id)
    .single();
  if (error || !coach) {
    const e = new Error('Coach not found');
    e.status = 404;
    throw e;
  }

  let assignedCoachId = req.user.id;
  if (coach.is_super_user && requestedCoachId) {
    const { data: target, error: targetErr } = await supabase
      .from('coaches')
      .select('id,team_id,team_name')
      .eq('id', requestedCoachId)
      .eq('is_active', true)
      .maybeSingle();
    if (targetErr) throw targetErr;
    const sameTeam = target && (
      (coach.team_id && target.team_id === coach.team_id) ||
      (!coach.team_id && coach.team_name && target.team_name === coach.team_name) ||
      target.id === req.user.id
    );
    if (!sameTeam) {
      const e = new Error('Assigned coach must be on your team');
      e.status = 403;
      throw e;
    }
    assignedCoachId = target.id;
  } else if (!coach.is_super_user && requestedCoachId && requestedCoachId !== req.user.id) {
    const e = new Error('Only super user coaches can assign players to another coach');
    e.status = 403;
    throw e;
  }

  return {
    team_id: coach.team_id || null,
    team_name: coach.team_name || null,
    assigned_coach_id: assignedCoachId,
    is_super_user: !!coach.is_super_user
  };
}

async function resolveTeamName(teamId, fallback) {
  if (!teamId) return fallback || null;
  const { data } = await supabase.from('school_academy_teams').select('team_name').eq('id', teamId).maybeSingle();
  return data?.team_name || fallback || null;
}

async function generateUniquePlayerLoginCode() {
  let attempts = 0;
  while (attempts < 20) {
    const code = generateLoginCode();
    const checks = await Promise.all(['players','coaches','scouts','stratex'].map(t =>
      supabase.from(t).select('id').eq('login_code', code).maybeSingle()
    ));
    if (!checks.some(r => r.data)) return code;
    attempts++;
  }
  throw new Error('Could not generate unique login code');
}

async function getScoutAnalysisContext(req) {
  if (req.user.accountType !== 'Scout') return { team: { tier: 5 }, prefs: {} };
  const { data: scout } = await supabase
    .from('scouts')
    .select('scout_preferences,scout_team_id')
    .eq('id', req.user.id)
    .maybeSingle();
  const prefs = scout?.scout_preferences || {};
  let team = { tier: 5 };
  if (scout?.scout_team_id) {
    const { data: st } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
    if (st) team = st;
  }
  if (prefs.teamWeaknesses?.length) team.team_weaknesses = prefs.teamWeaknesses;
  if (prefs.roleExpectations?.length) team.role_expectations = prefs.roleExpectations;
  if (prefs.longTermGoals?.length) team.long_term_goals = prefs.longTermGoals;
  if (prefs.formation) team.formation = prefs.formation;
  if (prefs.playingStyle) team.playing_style = prefs.playingStyle;
  return { team, prefs };
}

async function enrichPlayersWithTeamLocation(players) {
  const rows = players || [];
  const teamIds = [...new Set(rows.map(p => p.team_id).filter(Boolean))];
  if (!teamIds.length) return rows.map(p => ({ ...p, team_city: null, team_country: null }));
  const { data: teams } = await supabase
    .from('school_academy_teams')
    .select('id,city,country,county')
    .in('id', teamIds);
  const byId = {};
  (teams || []).forEach(t => { byId[t.id] = t; });
  return rows.map(p => {
    const t = byId[p.team_id] || {};
    return { ...p, team_city: t.city || t.county || null, team_country: t.country || null };
  });
}

router.get('/height-ranges', (_, res) => res.json(HEIGHT_RANGES));
router.get('/build-ranges', (_, res) => res.json(BUILD_RANGES));

router.get('/locations', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const { data: players } = await supabase
      .from('players')
      .select('team_id')
      .eq('is_active', true)
      .not('team_id', 'is', null);
    const ids = [...new Set((players || []).map(p => p.team_id).filter(Boolean))];
    if (!ids.length) return res.json({ data: [] });
    const { data: teams, error } = await supabase
      .from('school_academy_teams')
      .select('city')
      .in('id', ids)
      .not('city', 'is', null);
    if (error) throw error;
    const cities = [...new Set((teams || []).map(t => t.city).filter(Boolean))].sort();
    res.json({ data: cities });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

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
    const { search, posGroup, specificPos, teamId, minAge, maxAge, minOverall, ageGroup, city, page=1, limit=20 } = req.query;
    let q = supabase.from('players').select(
      'id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,team_id,team_name,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,height_range_cm,weight_range_kg,nationality,nationality_code,appearances,goals,assists,clean_sheets,yellow_cards,red_cards,pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,foot,date_of_birth',
      { count: 'exact' }
    ).eq('is_active', true);
    if (city) {
      const { data: cityTeams, error: cityErr } = await supabase
        .from('school_academy_teams')
        .select('id')
        .ilike('city', city);
      if (cityErr) throw cityErr;
      const cityIds = (cityTeams || []).map(t => t.id);
      if (!cityIds.length) return res.json({ data: [], total: 0, page: Number(page), limit: Number(limit) });
      q = q.in('team_id', cityIds);
    }
    if (search) q = q.or('first_name.ilike.%' + search + '%,last_name.ilike.%' + search + '%');
    if (posGroup) q = q.eq('position_group', posGroup);
    if (specificPos) q = q.contains('positions', [specificPos.toUpperCase()]);
    if (req.user.accountType === 'Coach') {
      const scope = await getCoachPlayerScope(req);
      if (teamId && scope.team_id && teamId !== scope.team_id) return res.status(403).json({ error: 'You can only view players on your team' });
      if (scope.is_super_user) {
        if (scope.team_id) q = q.eq('team_id', scope.team_id);
        else if (scope.team_name) q = q.eq('team_name', scope.team_name);
        else q = q.eq('assigned_coach_id', req.user.id);
      } else {
        q = q.eq('assigned_coach_id', req.user.id);
      }
    } else if (teamId) q = q.eq('team_id', teamId);
    if (minAge) q = q.gte('age', Number(minAge));
    if (maxAge) q = q.lte('age', Number(maxAge));
    if (minOverall) q = q.gte('overall_rating', Number(minOverall));
    if (ageGroup) q = q.eq('age_group', ageGroup);
    const off = (Number(page)-1)*Number(limit);
    if (req.user.accountType === 'Scout') q = q.order('overall_rating', { ascending: false }).limit(300);
    else q = q.order('overall_rating', { ascending: false }).range(off, off+Number(limit)-1);
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
    const enriched = await enrichPlayersWithTeamLocation(data || []);
    if (req.user.accountType === 'Scout') {
      const { team, prefs } = await getScoutAnalysisContext(req);
      const ids = enriched.map(p => p.id).filter(Boolean);
      const { data: facts } = ids.length
        ? await supabase.from('match_facts').select('*').in('player_id', ids).order('match_date', { ascending: false }).limit(600)
        : { data: [] };
      const factsByPlayer = {};
      (facts || []).forEach(f => {
        if (!factsByPlayer[f.player_id]) factsByPlayer[f.player_id] = [];
        if (factsByPlayer[f.player_id].length < 10) factsByPlayer[f.player_id].push(f);
      });
      const scored = enriched.map(p => {
        const analysis = analysePlayer(p, team, factsByPlayer[p.id] || [], prefs);
        return {
          ...p,
          compatibilityScore: analysis.compatibilityScore,
          compatibilityBreakdown: analysis.compatibilityBreakdown,
          compatibility: analysis.compatibility,
          overallBreakdown: analysis.overallBreakdown,
          positionRatings: analysis.positionRatings,
          valueAnalysis: analysis.valueAnalysis,
          transferValueFormatted: analysis.transferValueFormatted
        };
      }).sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
      return res.json({ data: scored.slice(off, off + Number(limit)), total: scored.length, page: Number(page), limit: Number(limit) });
    }
    res.json({ data: enriched, total: count, page: Number(page), limit: Number(limit) });
  } catch(err) { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
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
let analysisContext = { team: { tier: 5 }, prefs: {} };
if (req.user.accountType === 'Scout') analysisContext = await getScoutAnalysisContext(req);
const analysis = analysePlayer(data, analysisContext.team, matches || [], analysisContext.prefs);
const playerWithBreakdowns = {
...data,
overallBreakdown: analysis.overallBreakdown,
positionRatings: analysis.positionRatings,
valueAnalysis: analysis.valueAnalysis,
compatibility: req.user.accountType === 'Scout' ? analysis.compatibility : null,
compatibilityScore: req.user.accountType === 'Scout' ? analysis.compatibilityScore : null,
compatibilityBreakdown: req.user.accountType === 'Scout' ? analysis.compatibilityBreakdown : null
};
res.json({ player: playerWithBreakdowns, analysis, recentMatches: matches||[], videos: videos||[], upcomingFixtures, pipelineStatus, interestsRemaining });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Create player (Coach/Stratex)
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const b = req.body;
    if (!b.firstName||!b.lastName) return res.status(400).json({ error: 'firstName and lastName required' });
    const coachScope = await getCoachPlayerScope(req, b.assignedCoachId || b.coachId || null);
    const resolvedTeamId = coachScope ? coachScope.team_id : (b.teamId || null);
    const resolvedTeamName = coachScope ? coachScope.team_name : await resolveTeamName(resolvedTeamId, b.teamName);
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
      team_id: resolvedTeamId,
      team_name: resolvedTeamName,
      assigned_coach_id: coachScope ? coachScope.assigned_coach_id : (b.assignedCoachId || null),
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
    Object.assign(playerData, scoringPayload(playerData));
    const { data, error } = await supabase.from('players').insert(playerData).select().single();
    if (error) throw error;
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({ predicted_salary_weekly: salary.weeklyGross }).eq('id', data.id);
    
    // Generate login code for the player
    const loginCode = await generateUniquePlayerLoginCode();
    const loginCodeExpires = new Date(Date.now() + 365*24*60*60*1000);
    await supabase.from('players').update({ login_code: loginCode, login_code_expires: loginCodeExpires }).eq('id', data.id);
    
    // Send email to parent or player
    const recipientEmail = b.parentEmail || b.email || null;
    if (recipientEmail) {
      try {
        await email.sendPlayerLoginCode({
          to: recipientEmail,
          email: recipientEmail,
          playerFirstName: b.firstName,
          loginCode
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
  } catch(err) { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
});

// Bulk create players
router.post('/bulk', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { players, teamName, teamId, assignedCoachId } = req.body;
    if (!Array.isArray(players)||players.length===0) return res.status(400).json({ error: 'players array required' });
    if (players.length > 50) return res.status(400).json({ error: 'Max 50 players per bulk import' });
    const results = { created: [], errors: [] };
    for (const p of players) {
      try {
        const coachScope = await getCoachPlayerScope(req, p.assignedCoachId || assignedCoachId || p.coachId || null);
        const resolvedTeamId = coachScope ? coachScope.team_id : (p.teamId || teamId || null);
        const resolvedTeamName = coachScope ? coachScope.team_name : await resolveTeamName(resolvedTeamId, teamName||p.teamName);
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
          team_id: resolvedTeamId,
          team_name: resolvedTeamName,
          assigned_coach_id: coachScope ? coachScope.assigned_coach_id : (p.assignedCoachId || assignedCoachId || null),
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
        Object.assign(playerData, scoringPayload(playerData));
        const { data: created, error } = await supabase.from('players').insert(playerData).select('id,player_id,first_name,last_name,team_id,team_name,assigned_coach_id').single();
        if (error) throw error;
        const salary = predictedSalary(playerData, { tier: 5 });
        const loginCode = await generateUniquePlayerLoginCode();
        const loginCodeExpires = new Date(Date.now() + 365*24*60*60*1000);
        await supabase.from('players').update({
          predicted_salary_weekly: salary.weeklyGross,
          login_code: loginCode,
          login_code_expires: loginCodeExpires
        }).eq('id', created.id);
        let emailSent = false;
        const recipientEmail = p.parentEmail || p.email || null;
        if (recipientEmail) {
          const emailResult = await email.sendPlayerLoginCode({
            to: recipientEmail,
            email: recipientEmail,
            playerFirstName: p.firstName,
            loginCode
          }).catch(e => ({ success: false, error: e.message }));
          emailSent = !!emailResult?.success;
        }
        results.created.push({ ...created, login_code: loginCode, emailSent });
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
    const scoring = scoringPayload(data);
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({
      ...scoring,
      predicted_salary_weekly: salary.weeklyGross
    }).eq('id', data.id);
    res.json({ player: { ...data, ...scoring, predicted_salary_weekly: salary.weeklyGross } });
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
        compatibility: analysis.compatibility,
        overall_breakdown: analysis.overallBreakdown,
        position_ratings: analysis.positionRatings,
        value_analysis: analysis.valueAnalysis,
        scoring_version: 'v3',
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
const { data: scout } = await supabase.from('scouts').select('id,first_name,last_name,club_name,scout_team_id,subscription_plan,interests_remaining').eq('id', req.user.id).single();
if (!player||!scout) return res.status(404).json({ error: 'Not found' });
const plan = scout.subscription_plan || 'Core';
const planLimit = (SCOUT_PLAN_LIMITS[plan] || SCOUT_PLAN_LIMITS.Core).interests;
const capScope = scout.scout_team_id ? { scout_team_id: scout.scout_team_id } : { scout_id: req.user.id };
// Check if already in pipeline (any row for this scout+player)
const { data: existing } = await supabase.from('recruitment_pipeline').select('id,stage,is_active').eq('scout_id', req.user.id).eq('player_id', req.params.id).maybeSingle();
if (existing) {
let countQ = supabase.from('recruitment_pipeline').select('id', { count:'exact', head:true }).eq('is_active', true);
if (capScope.scout_team_id) countQ = countQ.eq('scout_team_id', capScope.scout_team_id);
else countQ = countQ.eq('scout_id', capScope.scout_id);
const { count: currentCount } = await countQ;
return res.json({ message: 'Already in pipeline', alreadyInPipeline: true, stage: existing.stage, interestsRemaining: Math.max(0, planLimit - (currentCount || 0)), planLimit, plan });
}
let countQ = supabase.from('recruitment_pipeline').select('id', { count:'exact', head:true }).eq('is_active', true);
if (capScope.scout_team_id) countQ = countQ.eq('scout_team_id', capScope.scout_team_id);
else countQ = countQ.eq('scout_id', capScope.scout_id);
const { count: usedInterests, error: usedErr } = await countQ;
if (usedErr) throw usedErr;
const remaining = Math.max(0, planLimit - (usedInterests || 0));
if (remaining <= 0) {
return res.status(402).json({ error: 'You have reached your interest cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.', interestsRemaining: 0, planLimit, plan });
}
// Upsert into pipeline (upsert handles any edge cases)
const { error: upsertErr } = await supabase.from('recruitment_pipeline').upsert({
scout_id: req.user.id, player_id: req.params.id,
scout_team_id: scout.scout_team_id, notes: notes||null, interest_level: interestLevel, stage: 'watching',
is_active: true
}, { onConflict: 'scout_id,player_id' });
if (upsertErr) throw upsertErr;
const newRemaining = Math.max(0, remaining - 1);
if (scout.scout_team_id) {
await supabase.from('scouts').update({ interests_remaining: newRemaining }).eq('scout_team_id', scout.scout_team_id);
} else {
await supabase.from('scouts').update({ interests_remaining: newRemaining }).eq('id', req.user.id);
}
// Notify (fire and forget)
supabase.from('notifications').insert({
recipient_id: req.params.id, recipient_type: 'Player', notification_type: 'scout_interest',
title: 'A scout is interested in you!',
body: scout.first_name + ' ' + scout.last_name + ' from ' + (scout.club_name||'a club') + ' has expressed interest in your profile.',
data: { scoutId: scout.id, scoutName: scout.first_name + ' ' + scout.last_name, scoutClub: scout.club_name }
});
if (player.email) {
email.sendScoutInterest({ to: player.email, playerFirstName: player.first_name,
playerName: player.first_name + ' ' + player.last_name,
scoutName: scout.first_name + ' ' + scout.last_name, scoutClub: scout.club_name||'' }).catch(()=>{});
}
res.json({ message: 'Interest recorded. Player added to pipeline.', alreadyInPipeline: false, interestsRemaining: newRemaining });
} catch(err) { console.error('[scout-interest]', err); res.status(500).json({ error: 'Internal server error' }); }
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
    Object.assign(updates, scoringPayload(merged));
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
