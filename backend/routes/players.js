'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId } = require('../utils/auth');
const {
  analysePlayer,
  predictedSalary,
  computeOverall,
  getPosGroup,
  calculateOverallBreakdown,
  calculatePositionRatings,
  calculateValueAnalysis
} = require('../engines/compatibility');
const { createNotification, createNotifications } = require('../services/notifications');
const { isDemoSession, applyRealDataFilter, demoWriteFields } = require('../utils/demo');
const { duplicateMessage, sendDbError } = require('../utils/dbErrors');
const { limitsForPlan, effectiveLimits, INTEREST_REQUEST_LABEL } = require('../utils/scoutPlans');
const { maybeRunSeasonalAgeGroupRollover } = require('../services/playerAgeGroups');

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

const AGE_GROUPS = ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'];

function normaliseAgeGroup(value) {
  const group = String(value || '').trim().toUpperCase();
  return AGE_GROUPS.includes(group) ? group : null;
}

function ageFromGroup(group) {
  const m = String(group || '').match(/^U(\d+)$/);
  return m ? Number(m[1]) : null;
}

function requiredAgeGroupPayload(value) {
  const group = normaliseAgeGroup(value);
  if (!group) {
    const e = new Error('Age Group is required and must be U7 to U16.');
    e.status = 400;
    throw e;
  }
  return { age: ageFromGroup(group), age_group: group };
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
    let playerQ = supabase
      .from('players')
      .select('team_id')
      .eq('is_active', true)
      .not('team_id', 'is', null);
    playerQ = applyRealDataFilter(playerQ, req);
    const { data: players } = await playerQ;
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
    let q = supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_active', true);
    q = applyRealDataFilter(q, req);
    const { count, error } = await q;
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Public demo players
// Returns safe football-only fields from records marked as demo.
// No contact records marked as demo.
// No contact details, passwords, login codes or parent details are exposed.
router.get('/public-demo', async (req, res) => {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select(
        [
          'id',
          'player_id',
          'first_name',
          'last_name',
          'age',
          'age_group',
          'nationality',
          'position_group',
          'specific_position',
          'primary_position',
          'positions',
          'foot',
          'height_category',
          'height_range_cm',
          'build_category',
          'weight_range_kg',
          'team_id',
          'team_name',
          'appearances',
          'goals',
          'assists',
          'clean_sheets',
          'yellow_cards',
          'red_cards',
          'pace',
          'agility',
          'strength',
          'stamina',
          'jumping',
          'composure',
          'shooting',
          'passing',
          'dribbling',
          'defending',
          'crossing',
          'vision',
          'positioning',
          'heading',
          'tackling',
          'overall_rating',
          'transfer_value',
          'avatar_config',
          'created_at',
          'updated_at'
        ].join(',')
      )
      .eq('is_demo', true)
      .order('overall_rating', {
        ascending: false
      })
      .limit(100);

    if (error) throw error;

    const teamIds = [
      ...new Set(
        (players || [])
          .map(player => player.team_id)
          .filter(Boolean)
      )
    ];

    const teamsById = {};

    if (teamIds.length) {
      const { data: teams, error: teamsError } =
        await supabase
          .from('school_academy_teams')
          .select(
            [
              'id',
              'team_name',
              'city',
              'county',
              'country',
              'league_name',
              'league_fulltime_url',
              'team_website_url'
            ].join(',')
          )
          .in('id', teamIds)
          .eq('is_demo', true);

      if (teamsError) throw teamsError;

      (teams || []).forEach(team => {
        teamsById[team.id] = team;
      });
    }

    const safePlayers = (players || []).map(
      (player, index) => {
        const team =
          teamsById[player.team_id] || null;

        const rawOverall =
          Number(player.overall_rating);

        const overall =
          rawOverall > 0 && rawOverall <= 10
            ? Math.round(rawOverall * 10)
            : Math.round(rawOverall || 65);

        const compatibilityScore =
          Math.max(
            55,
            Math.min(
              95,
              Math.round(
                overall +
                8 -
                (index % 9)
              )
            )
          );

        return {
          ...player,
          overall_rating: overall,
          compatibilityScore,
          team_city:
            team?.city ||
            team?.county ||
            null,
          team_country:
            team?.country ||
            null,
          team: team
            ? {
                id: team.id,
                team_name:
                  team.team_name,
                city:
                  team.city,
                county:
                  team.county,
                country:
                  team.country,
                league_name:
                  team.league_name,
                league_fulltime_url:
                  team.league_fulltime_url,
                team_website_url:
                  team.team_website_url
              }
            : null
        };
      }
    );

    res.set(
      'Cache-Control',
      'public, max-age=60, s-maxage=300'
    );

    res.json({
      data: safePlayers,
      total: safePlayers.length
    });
  } catch (err) {
    console.error(
      '[Public demo players]',
      {
        code: err.code,
        message: err.message
      }
    );

    res.status(500).json({
      error:
        'The public demo players could not be loaded.'
    });
  }
});

// List players
router.get('/', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    await maybeRunSeasonalAgeGroupRollover();
    const { search, posGroup, specificPos, teamId, minAge, maxAge, minOverall, ageGroup, city, page=1, limit=20 } = req.query;
    let q = supabase.from('players').select(
      'id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,positions,team_id,team_name,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,height_range_cm,weight_range_kg,appearances,goals,assists,clean_sheets,yellow_cards,red_cards,pace,agility,strength,stamina,jumping,composure,shooting,passing,dribbling,defending,crossing,vision,positioning,heading,tackling,foot',
      { count: 'exact' }
    ).eq('is_active', true);
    q = applyRealDataFilter(q, req);
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
  } catch(err) { console.error(err); sendDbError(res, err); }
});


// Get single player
router.get('/:id', requireAuth, async (req, res) => {
try {
if (req.user.accountType === 'Player' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
const { data, error } = await supabase.from('players').select('*').eq('id', req.params.id).single();
if (error||!data) return res.status(404).json({ error: 'Player not found' });
if (data.is_demo && !isDemoSession(req)) return res.status(404).json({ error: 'Player not found' });
const { data: matches } = await supabase.from('match_facts').select('*').eq('player_id', req.params.id).order('match_date', { ascending: false }).limit(10);
const { data: videos } = await supabase.from('player_videos').select('*').eq('player_id', req.params.id).order('created_at', { ascending: false });
let team = null;
if (data.team_id) {
const { data: teamRow } = await supabase
  .from('school_academy_teams')
  .select('id,team_name,league,league_name,league_fulltime_url,team_website_url,city,county,country')
  .eq('id', data.team_id)
  .maybeSingle();
team = teamRow || null;
}
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
team,
overallBreakdown: analysis.overallBreakdown,
positionRatings: analysis.positionRatings,
valueAnalysis: analysis.valueAnalysis,
compatibility: req.user.accountType === 'Scout' ? analysis.compatibility : null,
compatibilityScore: req.user.accountType === 'Scout' ? analysis.compatibilityScore : null,
compatibilityBreakdown: req.user.accountType === 'Scout' ? analysis.compatibilityBreakdown : null
};
res.json({ player: playerWithBreakdowns, team, analysis, recentMatches: matches||[], videos: videos||[], upcomingFixtures, pipelineStatus, interestsRemaining });
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
    const ageInfo = requiredAgeGroupPayload(b.ageGroup || b.age_group);
    const playerData = {
      player_id: generateId('PLY'),
      first_name: b.firstName.trim(), last_name: b.lastName.trim(),
      email: null, phone: b.phone||null, parent_email: null,
      date_of_birth: b.dateOfBirth || b.date_of_birth || null,
      age: ageInfo.age,
      age_group: ageInfo.age_group,
      nationality: null, nationality_code: null,
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
      ...demoWriteFields(req),
    };
    Object.assign(playerData, scoringPayload(playerData));
    const { data, error } = await supabase.from('players').insert(playerData).select().single();
    if (error) throw error;
    const salary = predictedSalary(data, { tier: 5 });
    await supabase.from('players').update({ predicted_salary_weekly: salary.weeklyGross }).eq('id', data.id);
    
    // Notify the coach. Player accounts and player setup emails are no longer part of this flow.
    if (req.user.accountType === 'Coach' && !isDemoSession(req)) {
      try {
        await createNotification({
          recipient_id: req.user.id, recipient_type: 'Coach',
          notification_type: 'system',
          title: 'Player added successfully',
          body: b.firstName + ' ' + b.lastName + ' has been added to ' + (ageInfo.age_group || 'the selected age group') + '. You can share video upload links from the player profile.',
          data: {
            targetType: 'player',
            targetId: data.id,
            playerId: data.id,
            playerName: b.firstName + ' ' + b.lastName,
            teamName: resolvedTeamName || '',
            source: 'player_added'
          }
        });
      } catch(notifErr) {}
    }
    
    res.status(201).json({ player: { ...data, predicted_salary_weekly: salary.weeklyGross }, message: 'Player created.' });
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
        if (!p.firstName || !p.lastName) throw new Error('First Name, Last Name and Age Group are required.');
        const ageInfo = requiredAgeGroupPayload(p.ageGroup || p.age_group);
        const playerData = {
          player_id: generateId('PLY'),
          first_name: (p.firstName||'').trim(), last_name: (p.lastName||'').trim(),
          email: null, parent_email: null,
          date_of_birth: null,
          age: ageInfo.age,
          age_group: ageInfo.age_group,
          nationality: null, nationality_code: null,
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
          ...demoWriteFields(req),
        };
        Object.assign(playerData, scoringPayload(playerData));
        const { data: created, error } = await supabase.from('players').insert(playerData).select('id,player_id,first_name,last_name,age_group,team_id,team_name,assigned_coach_id').single();
        if (error) throw error;
        const salary = predictedSalary(playerData, { tier: 5 });
        await supabase.from('players').update({
          predicted_salary_weekly: salary.weeklyGross
        }).eq('id', created.id);
        results.created.push({ ...created, ageGroup: ageInfo.age_group });
      } catch(e) {
        results.errors.push({ player: p.firstName + ' ' + p.lastName, error: duplicateMessage(e) || e.message });
      }
    }
    if (req.user.accountType === 'Coach' && results.created.length && !isDemoSession(req)) {
      try {
        await createNotification({
          recipient_id: req.user.id,
          recipient_type: 'Coach',
          notification_type: 'system',
          title: 'Bulk player import completed',
          body: results.created.length + ' players were created. Player profiles are coach-managed; share video upload links from each profile when needed.',
          data: {
            type: 'bulk_players_added',
            targetType: 'player',
            actionUrl: '/coach/my-players',
            players: results.created.map(p => ({
              id: p.id,
              player_id: p.player_id,
              name: (p.first_name || '') + ' ' + (p.last_name || ''),
              age_group: p.age_group || p.ageGroup || null
            }))
          }
        });
      } catch(notifErr) { console.error('[PlayersBulk] Notification error:', notifErr.message); }
    }
    res.status(201).json({ message: results.created.length + ' players created, ' + results.errors.length + ' errors', ...results });
  } catch(err) { console.error(err); sendDbError(res, err); }
});

// Update player
router.put('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const playerId = req.params.id;
    const body = req.body || {};

    const { data: existing, error: existingErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (!existing) return res.status(404).json({ error: 'Player not found' });

    if (existing.is_demo && !isDemoSession(req)) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // A Coach may only update players inside their permitted Coach scope.
    // Stratex retains its existing administrative access.
    if (req.user.accountType === 'Coach') {
      const scope = await getCoachPlayerScope(req);
      const allowed = scope.is_super_user
        ? (
            (scope.team_id && existing.team_id === scope.team_id) ||
            (!scope.team_id && scope.team_name && existing.team_name === scope.team_name) ||
            existing.assigned_coach_id === req.user.id
          )
        : existing.assigned_coach_id === req.user.id;

      if (!allowed) {
        return res.status(403).json({ error: 'You can only update players you are permitted to manage' });
      }
    }

    const updates = {};
    const directFields = [
      'first_name',
      'last_name',
      'position_group',
      'specific_position',
      'primary_position',
      'foot',
      'height_category',
      'height_range_cm',
      'height_min_cm',
      'height_max_cm',
      'build_category',
      'weight_range_kg',
      'weight_min_kg',
      'weight_max_kg',
      'pace',
      'agility',
      'strength',
      'stamina',
      'jumping',
      'composure',
      'shooting',
      'passing',
      'dribbling',
      'defending',
      'crossing',
      'vision',
      'positioning',
      'heading',
      'tackling',
      'gk_diving',
      'gk_reflexes',
      'gk_handling',
      'gk_positioning',
      'gk_kicking',
      'gk_distribution',
      'gk_communication',
      'gk_sweeping',
      'work_rate',
      'avatar_config'
    ];

    directFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = body[field];
      }
    });

    if (Array.isArray(body.positions)) {
      updates.positions = body.positions
        .map((position) => String(position || '').trim().toUpperCase())
        .filter(Boolean);

      if (updates.positions.length && !updates.primary_position) {
        updates.primary_position = updates.positions[0];
      }
    }

    if (body.ageGroup || body.age_group) {
      const ageInfo = requiredAgeGroupPayload(body.ageGroup || body.age_group);
      updates.age = ageInfo.age;
      updates.age_group = ageInfo.age_group;
    }

    if (body.heightCategory && HEIGHT_RANGES[body.heightCategory]) {
      const height = HEIGHT_RANGES[body.heightCategory];
      updates.height_category = body.heightCategory;
      updates.height_range_cm = height.range;
      updates.height_min_cm = height.min;
      updates.height_max_cm = height.max;
    }

    if (body.buildCategory && BUILD_RANGES[body.buildCategory]) {
      const build = BUILD_RANGES[body.buildCategory];
      updates.build_category = body.buildCategory;
      updates.weight_range_kg = build.range;
      updates.weight_min_kg = build.min;
      updates.weight_max_kg = build.max;
    }

    // Super-user Coaches can reassign within their own team. Regular Coaches
    // cannot move a player to another Coach.
    if (body.assignedCoachId || body.assigned_coach_id) {
      if (req.user.accountType === 'Coach') {
        const reassignment = await getCoachPlayerScope(
          req,
          body.assignedCoachId || body.assigned_coach_id
        );
        updates.assigned_coach_id = reassignment.assigned_coach_id;
      } else {
        updates.assigned_coach_id = body.assignedCoachId || body.assigned_coach_id;
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No supported player fields were provided' });
    }

    const merged = { ...existing, ...updates };
    const scoring = scoringPayload(merged);
    const salary = predictedSalary({ ...merged, ...scoring }, { tier: 5 });

    const { data, error } = await supabase
      .from('players')
      .update({
        ...updates,
        ...scoring,
        predicted_salary_weekly: salary.weeklyGross,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();

    if (error) throw error;

    res.json({ player: data });
  } catch (err) {
    console.error('[PlayerUpdate]', err);
    sendDbError(res, err);
  }
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
const { data: player } = await supabase.from('players').select('id,first_name,last_name,team_name,assigned_coach_id,team_id').eq('id', req.params.id).single();
const { data: scout } = await supabase.from('scouts').select('id,first_name,last_name,club_name,scout_team_id,subscription_plan,interests_remaining').eq('id', req.user.id).single();
if (!player||!scout) return res.status(404).json({ error: 'Not found' });
let plan = scout.subscription_plan || 'Core';
let planLimit = limitsForPlan(plan).interests;
if (scout.scout_team_id) {
const { data: team } = await supabase.from('scout_teams').select('subscription_plan,limit_overrides').eq('id', scout.scout_team_id).maybeSingle();
if (team) {
plan = team.subscription_plan || plan;
planLimit = effectiveLimits(plan, team.limit_overrides || {}).interests;
}
}
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
return res.status(402).json({ error: 'You have reached your ' + INTEREST_REQUEST_LABEL + ' cap. Please contact info@scoutlink.app or your CS Manager to increase your cap.', interestsRemaining: 0, planLimit, plan });
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
try {
const coachTargets = [];
if (player.assigned_coach_id) {
const { data: coachRow } = await supabase.from('coaches').select('id,team_name').eq('id', player.assigned_coach_id).maybeSingle();
if (coachRow) coachTargets.push(coachRow);
} else if (player.team_id) {
const { data: coaches } = await supabase.from('coaches').select('id,team_name').eq('team_id', player.team_id).eq('is_active', true);
(coaches || []).forEach(c => coachTargets.push(c));
}
await createNotifications(coachTargets.map(c => ({
recipient_id: c.id,
recipient_type: 'Coach',
notification_type: 'scout_interest',
title: 'Scout interest registered',
body: (scout.first_name + ' ' + scout.last_name).trim() + ' from ' + (scout.club_name || 'a club') + ' has added ' + player.first_name + ' ' + player.last_name + ' to their pipeline.',
data: {
targetType: 'player',
targetId: req.params.id,
playerId: req.params.id,
playerName: player.first_name + ' ' + player.last_name,
teamName: player.team_name || c.team_name || '',
scoutId: scout.id,
pipelineId: existing?.id || null,
scoutName: scout.first_name + ' ' + scout.last_name,
scoutClub: scout.club_name,
source: 'scout_interest'
}
})));
} catch(notifErr) {
console.warn('[Scout interest coach notification skipped]', notifErr.message);
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
