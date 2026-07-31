'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId } = require('../utils/auth');
const engines = require('../engines');
const scoringService = require('../services/playerScoringService');
const { createNotification, createNotifications } = require('../services/notifications');
const { isDemoSession, applyRealDataFilter, demoWriteFields } = require('../utils/demo');
const { duplicateMessage, sendDbError } = require('../utils/dbErrors');
const { limitsForPlan, effectiveLimits, INTEREST_REQUEST_LABEL } = require('../utils/scoutPlans');
const { maybeRunSeasonalAgeGroupRollover } = require('../services/playerAgeGroups');

const HEIGHT_RANGES = Object.freeze({
  very_short: { label:'Very Short', range:'155-163 cm', min:155, max:163 },
  short: { label:'Short', range:'163-170 cm', min:163, max:170 },
  average: { label:'Average', range:'170-178 cm', min:170, max:178 },
  tall: { label:'Tall', range:'178-185 cm', min:178, max:185 },
  very_tall: { label:'Very Tall', range:'185-200 cm', min:185, max:200 }
});

const BUILD_RANGES = Object.freeze({
  very_slight: { label:'Very Slight', range:'50-58 kg', min:50, max:58 },
  slight: { label:'Slight', range:'58-65 kg', min:58, max:65 },
  lean: { label:'Lean', range:'65-72 kg', min:65, max:72 },
  athletic: { label:'Athletic', range:'72-80 kg', min:72, max:80 },
  stocky: { label:'Stocky', range:'80-88 kg', min:80, max:88 },
  powerful: { label:'Powerful', range:'88-96 kg', min:88, max:96 },
  very_powerful: { label:'Very Powerful', range:'96+ kg', min:96, max:120 }
});

const AGE_GROUPS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => `U${index + 7}`)
);

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normaliseAgeGroup(value) {
  const group = String(value || '').trim().toUpperCase();
  return AGE_GROUPS.includes(group) ? group : null;
}

function requiredAgeGroup(value) {
  const ageGroup = normaliseAgeGroup(value);
  if (!ageGroup) throw requestError('Age Group is required and must be U7 to U16.');
  return { age_group: ageGroup, age: Number(ageGroup.slice(1)) };
}

function flattenRatings(value, output = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  Object.entries(value).forEach(([key, child]) => {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenRatings(child, output);
    } else {
      output[key] = child;
    }
  });
  return output;
}

function validateWholeRating(value, key) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    throw requestError(`${key} must be a whole number from 1 to 10 or Not observed.`);
  }
  return number;
}

function buildNestedRatings(flat, group) {
  if (group === 'Goalkeeper') {
    return {
      goalkeeper: engines.config.GOALKEEPER_ATTRIBUTES.reduce((result, key) => {
        if (Object.prototype.hasOwnProperty.call(flat, key)) result[key] = flat[key];
        return result;
      }, {})
    };
  }

  const groupKey = group.toLowerCase();
  const groupAttributes = group === 'Defender'
    ? engines.config.DEFENDER_ATTRIBUTES
    : group === 'Midfielder'
      ? engines.config.MIDFIELDER_ATTRIBUTES
      : engines.config.ATTACKER_ATTRIBUTES;

  return {
    general: engines.config.GENERAL_ATTRIBUTES.reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(flat, key)) result[key] = flat[key];
      return result;
    }, {}),
    [groupKey]: groupAttributes.reduce((result, key) => {
      if (Object.prototype.hasOwnProperty.call(flat, key)) result[key] = flat[key];
      return result;
    }, {})
  };
}

function normaliseAttributeRatings(raw, position) {
  const group = engines.utils.getPositionGroup(position);
  if (!group) throw requestError('A supported player position is required.');

  const allowed = new Set(engines.utils.attributesForGroup(group));
  const flat = flattenRatings(raw || {});
  const normalised = {};

  Object.entries(flat).forEach(([key, rawValue]) => {
    if (!allowed.has(key)) {
      throw requestError(`${key} is not a valid ${group.toLowerCase()} attribute.`);
    }
    const value = validateWholeRating(rawValue, key);
    if (value !== null) normalised[key] = value;
  });

  return buildNestedRatings(normalised, group);
}

function normalisePositionPayload(body = {}, existing = {}) {
  const requested = body.primaryPosition || body.primary_position ||
    body.specificPosition || body.specific_position ||
    (Array.isArray(body.positions) ? body.positions[0] : null) ||
    existing.primary_position || existing.specific_position;

  const primary = engines.utils.normalisePosition(requested);
  if (!primary) throw requestError('Select one of the 15 supported positions.');

  const suppliedPositions = [
    primary,
    ...engines.utils.normalisePositions(body.positions || existing.positions || []),
    ...engines.utils.normalisePositions(body.alternativePositions || body.alternative_positions || existing.alternative_positions || [])
  ];
  const positions = engines.utils.unique(suppliedPositions).slice(0, 3);
  const group = engines.utils.getPositionGroup(primary);

  return {
    position_group: group,
    specific_position: primary,
    primary_position: primary,
    positions,
    alternative_positions: positions.filter(position => position !== primary)
  };
}

function playerInput(body = {}, existing = {}, actorId = null) {
  const age = requiredAgeGroup(body.ageGroup || body.age_group || existing.age_group);
  const position = normalisePositionPayload(body, existing);
  const rawRatings = body.attributeRatings || body.attribute_ratings ||
    (Object.keys(existing.attribute_ratings || {}).length ? existing.attribute_ratings : {});
  const attributeRatings = normaliseAttributeRatings(rawRatings, position.primary_position);
  const heightKey = body.heightCategory || body.height_category || existing.height_category || 'average';
  const buildKey = body.buildCategory || body.build_category || existing.build_category || 'athletic';
  const height = HEIGHT_RANGES[heightKey] || HEIGHT_RANGES.average;
  const build = BUILD_RANGES[buildKey] || BUILD_RANGES.athletic;

  return {
    ...age,
    ...position,
    first_name: String(body.firstName ?? body.first_name ?? existing.first_name ?? '').trim(),
    last_name: String(body.lastName ?? body.last_name ?? existing.last_name ?? '').trim(),
    foot: body.foot || existing.foot || 'Right',
    height_category: heightKey,
    height_range_cm: height.range,
    height_min_cm: height.min,
    height_max_cm: height.max,
    build_category: buildKey,
    weight_range_kg: build.range,
    weight_min_kg: build.min,
    weight_max_kg: build.max,
    attribute_ratings: attributeRatings,
    attribute_rating_scale: 'ten',
    attribute_assessment_version: engines.config.ATTRIBUTE_RUBRIC_VERSION,
    attribute_assessed_at: new Date().toISOString(),
    attribute_assessed_by: actorId || existing.attribute_assessed_by || null
  };
}

async function getCoachPlayerScope(req, requestedCoachId) {
  if (req.user.accountType !== 'Coach') return null;

  const { data: coach, error } = await supabase
    .from('coaches')
    .select('id,team_id,team_name,is_super_user')
    .eq('id', req.user.id)
    .single();

  if (error || !coach) throw requestError('Coach not found', 404);

  let assignedCoachId = req.user.id;
  if (coach.is_super_user && requestedCoachId) {
    const { data: target, error: targetError } = await supabase
      .from('coaches')
      .select('id,team_id,team_name')
      .eq('id', requestedCoachId)
      .eq('is_active', true)
      .maybeSingle();
    if (targetError) throw targetError;

    const sameTeam = target && (
      (coach.team_id && target.team_id === coach.team_id) ||
      (!coach.team_id && coach.team_name && target.team_name === coach.team_name) ||
      target.id === req.user.id
    );
    if (!sameTeam) throw requestError('Assigned coach must be on your team.', 403);
    assignedCoachId = target.id;
  } else if (!coach.is_super_user && requestedCoachId && requestedCoachId !== req.user.id) {
    throw requestError('Only super-user coaches can assign players to another coach.', 403);
  }

  return {
    team_id: coach.team_id || null,
    team_name: coach.team_name || null,
    assigned_coach_id: assignedCoachId,
    is_super_user: Boolean(coach.is_super_user)
  };
}

async function resolveTeamName(teamId, fallback) {
  if (!teamId) return fallback || null;
  const { data, error } = await supabase
    .from('school_academy_teams')
    .select('team_name')
    .eq('id', teamId)
    .maybeSingle();
  if (error) throw error;
  return data?.team_name || fallback || null;
}

async function scoutContext(req) {
  if (req.user.accountType !== 'Scout') return { team: null, prefs: {} };

  const { data: scout, error } = await supabase
    .from('scouts')
    .select('scout_preferences,scout_team_id')
    .eq('id', req.user.id)
    .maybeSingle();
  if (error) throw error;

  let team = null;
  if (scout?.scout_team_id) {
    const { data, error: teamError } = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (teamError) throw teamError;
    team = data || null;
  }

  return { team, prefs: scout?.scout_preferences || {} };
}

async function factsByPlayer(playerIds, limitPerPlayer = 12) {
  if (!playerIds.length) return {};
  const { data, error } = await supabase
    .from('match_facts')
    .select('*')
    .in('player_id', playerIds)
    .order('match_date', { ascending: false })
    .limit(Math.min(1000, playerIds.length * limitPerPlayer));
  if (error) throw error;

  return (data || []).reduce((mapped, fact) => {
    if (!mapped[fact.player_id]) mapped[fact.player_id] = [];
    if (mapped[fact.player_id].length < limitPerPlayer) mapped[fact.player_id].push(fact);
    return mapped;
  }, {});
}

async function enrichWithLocation(players) {
  const teamIds = engines.utils.unique((players || []).map(player => player.team_id).filter(Boolean));
  if (!teamIds.length) return players || [];

  const { data, error } = await supabase
    .from('school_academy_teams')
    .select('id,team_name,city,county,country,league_name,league_fulltime_url,team_website_url')
    .in('id', teamIds);
  if (error) throw error;
  const teams = Object.fromEntries((data || []).map(team => [team.id, team]));

  return (players || []).map(player => {
    const team = teams[player.team_id] || null;
    return {
      ...player,
      team,
      team_city: team?.city || team?.county || null,
      team_country: team?.country || null
    };
  });
}

router.get('/height-ranges', (_, res) => res.json(HEIGHT_RANGES));
router.get('/build-ranges', (_, res) => res.json(BUILD_RANGES));

router.get('/locations', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    let query = supabase
      .from('players')
      .select('team_id')
      .eq('is_active', true)
      .not('team_id', 'is', null);
    query = applyRealDataFilter(query, req);
    const { data: playerRows, error: playerError } = await query;
    if (playerError) throw playerError;

    const ids = engines.utils.unique((playerRows || []).map(player => player.team_id).filter(Boolean));
    if (!ids.length) return res.json({ data: [] });

    const { data: teams, error } = await supabase
      .from('school_academy_teams')
      .select('city')
      .in('id', ids)
      .not('city', 'is', null);
    if (error) throw error;
    res.json({ data: engines.utils.unique((teams || []).map(team => team.city).filter(Boolean)).sort() });
  } catch (error) {
    sendDbError(res, error);
  }
});

router.get('/count', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    let query = supabase
      .from('players')
      .select('id', { count:'exact', head:true })
      .eq('is_active', true);
    query = applyRealDataFilter(query, req);
    const { count, error } = await query;
    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (error) {
    sendDbError(res, error);
  }
});

router.get('/public-demo', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select([
        'id','player_id','first_name','last_name','age','age_group','nationality',
        'position_group','specific_position','primary_position','positions','alternative_positions',
        'foot','height_category','height_range_cm','build_category','weight_range_kg',
        'team_id','team_name','appearances','goals','assists','clean_sheets',
        'yellow_cards','red_cards','attribute_ratings','attribute_rating_scale',
        'attribute_assessment_version','attribute_assessed_at','overall_rating',
        'overall_breakdown','position_ratings','evidence_confidence','prediction_analysis',
        'value_analysis','scoring_result','scoring_version','created_at','updated_at'
      ].join(','))
      .eq('is_demo', true)
      .eq('is_active', true)
      .order('overall_rating', { ascending:false })
      .limit(100);
    if (error) throw error;

    const players = await enrichWithLocation(data || []);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=120');
    res.json({
      data: players.map(player => ({
        ...player,
        compatibilityScore: null,
        compatibility: null
      })),
      total: players.length,
      demoSchemaVersion: 4,
      scoringVersion: engines.config.SCORING_VERSION
    });
  } catch (error) {
    console.error('[Public demo players]', error);
    res.status(500).json({ error:'The public demo players could not be loaded.' });
  }
});

router.get('/', requireAuth, requireRole('Scout','Coach','Stratex'), async (req, res) => {
  try {
    await maybeRunSeasonalAgeGroupRollover();
    const {
      search, posGroup, specificPos, teamId, minAge, maxAge,
      minOverall, ageGroup, city, page = 1, limit = 20
    } = req.query;

    let query = supabase
      .from('players')
      .select('*', { count:'exact' })
      .eq('is_active', true);
    query = applyRealDataFilter(query, req);

    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    if (posGroup) query = query.eq('position_group', posGroup === 'Forward' ? 'Attacker' : posGroup);
    if (specificPos) {
      const position = engines.utils.normalisePosition(specificPos);
      if (!position) return res.status(400).json({ error:'Unsupported position filter.' });
      query = query.contains('positions', [position]);
    }
    if (ageGroup) query = query.eq('age_group', normaliseAgeGroup(ageGroup));
    if (minAge) query = query.gte('age', Number(minAge));
    if (maxAge) query = query.lte('age', Number(maxAge));
    if (minOverall) query = query.gte('overall_rating', Number(minOverall));

    if (city) {
      const { data: cityTeams, error: cityError } = await supabase
        .from('school_academy_teams')
        .select('id')
        .ilike('city', city);
      if (cityError) throw cityError;
      const ids = (cityTeams || []).map(team => team.id);
      if (!ids.length) return res.json({ data:[], total:0, page:Number(page), limit:Number(limit) });
      query = query.in('team_id', ids);
    }

    if (req.user.accountType === 'Coach') {
      const scope = await getCoachPlayerScope(req);
      if (teamId && scope.team_id && teamId !== scope.team_id) {
        return res.status(403).json({ error:'You can only view players on your team.' });
      }
      if (scope.is_super_user) {
        if (scope.team_id) query = query.eq('team_id', scope.team_id);
        else if (scope.team_name) query = query.eq('team_name', scope.team_name);
        else query = query.eq('assigned_coach_id', req.user.id);
      } else {
        query = query.eq('assigned_coach_id', req.user.id);
      }
    } else if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const offset = (Number(page) - 1) * Number(limit);
    query = req.user.accountType === 'Scout'
      ? query.order('overall_rating', { ascending:false }).limit(300)
      : query.order('overall_rating', { ascending:false }).range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    const enriched = await enrichWithLocation(data || []);

    if (req.user.accountType !== 'Scout') {
      return res.json({ data:enriched, total:count || enriched.length, page:Number(page), limit:Number(limit) });
    }

    const context = await scoutContext(req);
    const byPlayer = await factsByPlayer(enriched.map(player => player.id));
    const scored = enriched.map(player => {
      const analysis = scoringService.calculatePlayerAnalysis(
        player,
        byPlayer[player.id] || [],
        context.team,
        context.prefs
      );
      return {
        ...player,
        analysis,
        compatibilityScore: analysis.compatibilityScore,
        compatibility: analysis.compatibility,
        compatibilityBreakdown: analysis.compatibilityBreakdown,
        overallBreakdown: analysis.overallBreakdown,
        positionRatings: analysis.positionRatings,
        evidenceConfidence: analysis.evidenceConfidence,
        valueAnalysis: analysis.valueAnalysis
      };
    }).sort((first, second) => (second.compatibilityScore ?? -1) - (first.compatibilityScore ?? -1));

    res.json({
      data: scored.slice(offset, offset + Number(limit)),
      total: scored.length,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    console.error('[Players list]', error);
    sendDbError(res, error);
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.accountType === 'Player' && req.user.id !== req.params.id) {
      return res.status(403).json({ error:'Forbidden' });
    }

    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !player) return res.status(404).json({ error:'Player not found' });
    if (player.is_demo && !isDemoSession(req)) return res.status(404).json({ error:'Player not found' });

    const [{ data: matches }, { data: videos }] = await Promise.all([
      supabase.from('match_facts').select('*').eq('player_id', player.id).order('match_date', { ascending:false }).limit(12),
      supabase.from('player_videos').select('*').eq('player_id', player.id).order('created_at', { ascending:false })
    ]);

    let team = null;
    let upcomingFixtures = [];
    if (player.team_id) {
      const [{ data: teamRow }, { data: fixtures }] = await Promise.all([
        supabase
          .from('school_academy_teams')
          .select('id,team_name,league,league_name,league_fulltime_url,team_website_url,city,county,country')
          .eq('id', player.team_id)
          .maybeSingle(),
        supabase
          .from('fixtures')
          .select('*')
          .eq('team_id', player.team_id)
          .gte('fixture_date', new Date().toISOString().slice(0,10))
          .order('fixture_date', { ascending:true })
          .limit(5)
      ]);
      team = teamRow || null;
      upcomingFixtures = fixtures || [];
    }

    let pipelineStatus = null;
    let interestsRemaining = null;
    let context = { team:null, prefs:{} };
    if (req.user.accountType === 'Scout') {
      const [{ data: pipeline }, { data: scout }] = await Promise.all([
        supabase
          .from('recruitment_pipeline')
          .select('id,stage,is_active')
          .eq('scout_id', req.user.id)
          .eq('player_id', player.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.from('scouts').select('interests_remaining').eq('id', req.user.id).single()
      ]);
      pipelineStatus = pipeline ? pipeline.stage : null;
      interestsRemaining = scout?.interests_remaining ?? 200;
      context = await scoutContext(req);
    }

    const analysis = scoringService.calculatePlayerAnalysis(
      player,
      matches || [],
      context.team,
      context.prefs
    );

    res.json({
      player: {
        ...player,
        team,
        analysis,
        overallBreakdown: analysis.overallBreakdown,
        positionRatings: analysis.positionRatings,
        evidenceConfidence: analysis.evidenceConfidence,
        valueAnalysis: analysis.valueAnalysis,
        compatibility: req.user.accountType === 'Scout' ? analysis.compatibility : null,
        compatibilityScore: req.user.accountType === 'Scout' ? analysis.compatibilityScore : null
      },
      team,
      analysis,
      recentMatches: matches || [],
      videos: videos || [],
      upcomingFixtures,
      pipelineStatus,
      interestAlreadyRegistered: Boolean(pipelineStatus),
      interestsRemaining
    });
  } catch (error) {
    console.error('[Player detail]', error);
    sendDbError(res, error);
  }
});

router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const body = req.body || {};
    const core = playerInput(body, {}, req.user.id);
    if (!core.first_name || !core.last_name) throw requestError('First name and last name are required.');

    const scope = await getCoachPlayerScope(req, body.assignedCoachId || body.coachId || null);
    const teamId = scope ? scope.team_id : body.teamId || null;
    const teamName = scope ? scope.team_name : await resolveTeamName(teamId, body.teamName);

    const payload = {
      player_id: generateId('PLY'),
      ...core,
      email:null,
      parent_email:null,
      date_of_birth:null,
      nationality:null,
      nationality_code:null,
      team_id:teamId,
      team_name:teamName,
      assigned_coach_id: scope ? scope.assigned_coach_id : body.assignedCoachId || null,
      is_active:true,
      scoring_version:engines.config.SCORING_VERSION,
      ...demoWriteFields(req)
    };

    const { data: player, error } = await supabase
      .from('players')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    const analysis = await scoringService.recalculatePlayer(player.id);
    const { data: refreshed } = await supabase.from('players').select('*').eq('id', player.id).single();

    if (req.user.accountType === 'Coach' && !isDemoSession(req)) {
      try {
        await createNotification({
          recipient_id:req.user.id,
          recipient_type:'Coach',
          notification_type:'system',
          title:'Player added successfully',
          body:`${core.first_name} ${core.last_name} has been added to ${core.age_group}.`,
          data:{ targetType:'player', targetId:player.id, playerId:player.id, source:'player_added' }
        });
      } catch (_) {}
    }

    res.status(201).json({ player:refreshed || player, analysis, message:'Player created.' });
  } catch (error) {
    console.error('[Player create]', error);
    res.status(error.status || 500).json({ error:error.status ? error.message : duplicateMessage(error) || 'Internal server error' });
  }
});

router.post('/bulk', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const players = req.body.players;
    if (!Array.isArray(players) || !players.length) throw requestError('players array required');
    if (players.length > 50) throw requestError('Maximum 50 players per bulk import.');

    const results = { created:[], errors:[] };
    for (const body of players) {
      try {
        const core = playerInput(body, {}, req.user.id);
        if (!core.first_name || !core.last_name) throw requestError('First name and last name are required.');

        const scope = await getCoachPlayerScope(
          req,
          body.assignedCoachId || req.body.assignedCoachId || body.coachId || null
        );
        const teamId = scope ? scope.team_id : body.teamId || req.body.teamId || null;
        const teamName = scope
          ? scope.team_name
          : await resolveTeamName(teamId, body.teamName || req.body.teamName);

        const { data: created, error } = await supabase
          .from('players')
          .insert({
            player_id:generateId('PLY'),
            ...core,
            email:null,
            parent_email:null,
            date_of_birth:null,
            nationality:null,
            nationality_code:null,
            team_id:teamId,
            team_name:teamName,
            assigned_coach_id:scope ? scope.assigned_coach_id : body.assignedCoachId || req.body.assignedCoachId || null,
            is_active:true,
            scoring_version:engines.config.SCORING_VERSION,
            ...demoWriteFields(req)
          })
          .select()
          .single();
        if (error) throw error;

        const analysis = await scoringService.recalculatePlayer(created.id);
        results.created.push({ ...created, analysis });
      } catch (error) {
        results.errors.push({
          player:`${body.firstName || body.first_name || ''} ${body.lastName || body.last_name || ''}`.trim() || 'Row',
          error:duplicateMessage(error) || error.message
        });
      }
    }

    res.status(201).json({
      message:`${results.created.length} players created, ${results.errors.length} errors`,
      ...results
    });
  } catch (error) {
    sendDbError(res, error);
  }
});

router.put('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { data: existing, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!existing) return res.status(404).json({ error:'Player not found' });
    if (existing.is_demo && !isDemoSession(req)) return res.status(404).json({ error:'Player not found' });

    if (req.user.accountType === 'Coach') {
      const scope = await getCoachPlayerScope(req);
      const allowed = scope.is_super_user
        ? (scope.team_id && existing.team_id === scope.team_id) ||
          (!scope.team_id && scope.team_name && existing.team_name === scope.team_name) ||
          existing.assigned_coach_id === req.user.id
        : existing.assigned_coach_id === req.user.id;
      if (!allowed) return res.status(403).json({ error:'You can only update players you are permitted to manage.' });
    }

    const input = playerInput(req.body || {}, existing, req.user.id);
    const updates = { ...input };

    if (req.body.assignedCoachId || req.body.assigned_coach_id) {
      if (req.user.accountType === 'Coach') {
        const reassignment = await getCoachPlayerScope(
          req,
          req.body.assignedCoachId || req.body.assigned_coach_id
        );
        updates.assigned_coach_id = reassignment.assigned_coach_id;
      } else {
        updates.assigned_coach_id = req.body.assignedCoachId || req.body.assigned_coach_id;
      }
    }

    const { error: updateError } = await supabase
      .from('players')
      .update({ ...updates, updated_at:new Date().toISOString() })
      .eq('id', existing.id);
    if (updateError) throw updateError;

    const analysis = await scoringService.recalculatePlayer(existing.id);
    const { data: player } = await supabase.from('players').select('*').eq('id', existing.id).single();
    res.json({ player, analysis });
  } catch (error) {
    console.error('[Player update]', error);
    sendDbError(res, error);
  }
});

router.patch('/:id/ratings', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { data: player, error } = await supabase.from('players').select('*').eq('id', req.params.id).single();
    if (error || !player) return res.status(404).json({ error:'Player not found' });

    const position = engines.utils.getPrimaryPosition(player);
    const attributeRatings = normaliseAttributeRatings(
      req.body.attributeRatings || req.body.attribute_ratings || {},
      position
    );

    const { error: updateError } = await supabase
      .from('players')
      .update({
        attribute_ratings:attributeRatings,
        attribute_rating_scale:'ten',
        attribute_assessment_version:engines.config.ATTRIBUTE_RUBRIC_VERSION,
        attribute_assessed_at:new Date().toISOString(),
        attribute_assessed_by:req.user.id
      })
      .eq('id', player.id);
    if (updateError) throw updateError;

    const analysis = await scoringService.recalculatePlayer(player.id);
    const { data: refreshed } = await supabase.from('players').select('*').eq('id', player.id).single();
    res.json({ player:refreshed, analysis, message:'Ratings updated.' });
  } catch (error) {
    sendDbError(res, error);
  }
});

router.post('/:id/analyse', requireAuth, requireRole('Scout','Stratex','Coach'), async (req, res) => {
  try {
    let teamId = req.body.teamId || null;
    let prefs = {};
    if (req.user.accountType === 'Scout') {
      const context = await scoutContext(req);
      teamId = teamId || context.team?.id || null;
      prefs = context.prefs;
    }

    const inputs = await scoringService.loadPlayerScoringInputs(req.params.id, teamId);
    const analysis = scoringService.calculatePlayerAnalysis(
      inputs.player,
      inputs.matchHistory,
      inputs.team,
      prefs
    );

    if (teamId) {
      const snapshot = scoringService.scoringInputSnapshot(inputs.player, inputs.matchHistory, inputs.team, prefs);
      await scoringService.persistCompatibilityAnalysis(inputs.player.id, teamId, analysis, snapshot);
    }
    res.json(analysis);
  } catch (error) {
    sendDbError(res, error);
  }
});

router.post('/:id/scout-interest', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const [{ data: player }, { data: scout }] = await Promise.all([
      supabase
        .from('players')
        .select('id,first_name,last_name,team_name,assigned_coach_id,team_id')
        .eq('id', req.params.id)
        .single(),
      supabase
        .from('scouts')
        .select('id,first_name,last_name,club_name,scout_team_id,subscription_plan,interests_remaining')
        .eq('id', req.user.id)
        .single()
    ]);
    if (!player || !scout) return res.status(404).json({ error:'Not found' });

    const { data: existing } = await supabase
      .from('recruitment_pipeline')
      .select('id,stage,is_active')
      .eq('scout_id', req.user.id)
      .eq('player_id', player.id)
      .maybeSingle();

    let plan = scout.subscription_plan || 'Core';
    let planLimit = limitsForPlan(plan).interests;
    if (scout.scout_team_id) {
      const { data: team } = await supabase
        .from('scout_teams')
        .select('subscription_plan,limit_overrides')
        .eq('id', scout.scout_team_id)
        .maybeSingle();
      if (team) {
        plan = team.subscription_plan || plan;
        planLimit = effectiveLimits(plan, team.limit_overrides || {}).interests;
      }
    }

    let countQuery = supabase
      .from('recruitment_pipeline')
      .select('id', { count:'exact', head:true })
      .eq('is_active', true);
    countQuery = scout.scout_team_id
      ? countQuery.eq('scout_team_id', scout.scout_team_id)
      : countQuery.eq('scout_id', scout.id);
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    const remaining = Math.max(0, planLimit - (count || 0));
    if (existing?.is_active !== false) {
      return res.json({
        message:'Interest already registered',
        alreadyInPipeline:true,
        interestAlreadyRegistered:true,
        stage:existing.stage,
        interestsRemaining:remaining,
        planLimit,
        plan
      });
    }
    if (remaining <= 0) {
      return res.status(402).json({
        error:`You have reached your ${INTEREST_REQUEST_LABEL} cap. Please contact info@scoutlink.app or your CS Manager to increase it.`,
        interestsRemaining:0,
        planLimit,
        plan
      });
    }

    const { error: upsertError } = await supabase
      .from('recruitment_pipeline')
      .upsert({
        scout_id:scout.id,
        player_id:player.id,
        scout_team_id:scout.scout_team_id,
        notes:req.body.notes || null,
        interest_level:Number(req.body.interestLevel || 7),
        stage:'watching',
        is_active:true
      }, { onConflict:'scout_id,player_id' });
    if (upsertError) throw upsertError;

    const newRemaining = Math.max(0, remaining - 1);
    const scoutUpdate = supabase.from('scouts').update({ interests_remaining:newRemaining });
    if (scout.scout_team_id) await scoutUpdate.eq('scout_team_id', scout.scout_team_id);
    else await scoutUpdate.eq('id', scout.id);

    try {
      const targets = [];
      if (player.assigned_coach_id) {
        const { data: coach } = await supabase
          .from('coaches')
          .select('id,team_name')
          .eq('id', player.assigned_coach_id)
          .maybeSingle();
        if (coach) targets.push(coach);
      } else if (player.team_id) {
        const { data: coaches } = await supabase
          .from('coaches')
          .select('id,team_name')
          .eq('team_id', player.team_id)
          .eq('is_active', true);
        (coaches || []).forEach(coach => targets.push(coach));
      }

      await createNotifications(targets.map(coach => ({
        recipient_id:coach.id,
        recipient_type:'Coach',
        notification_type:'scout_interest',
        title:'Scout interest registered',
        body:`${scout.first_name} ${scout.last_name} from ${scout.club_name || 'a club'} has added ${player.first_name} ${player.last_name} to their pipeline.`,
        data:{ targetType:'player', targetId:player.id, playerId:player.id, source:'scout_interest' }
      })));
    } catch (_) {}

    res.json({
      message:'Interest recorded. Player added to pipeline.',
      alreadyInPipeline:false,
      interestAlreadyRegistered:true,
      interestsRemaining:newRemaining
    });
  } catch (error) {
    console.error('[Scout interest]', error);
    sendDbError(res, error);
  }
});

router.patch('/:id/team', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const teamId = req.body.team_id || null;
    const teamName = await resolveTeamName(teamId, null);
    const { error } = await supabase
      .from('players')
      .update({ team_id:teamId, team_name:teamName })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message:'Team assignment updated.' });
  } catch (error) {
    sendDbError(res, error);
  }
});

router.delete('/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    await Promise.all([
      supabase.from('match_facts').delete().eq('player_id', req.params.id),
      supabase.from('player_videos').delete().eq('player_id', req.params.id),
      supabase.from('recruitment_pipeline').delete().eq('player_id', req.params.id),
      supabase.from('compatibility_scores').delete().eq('player_id', req.params.id)
    ]);
    const { error } = await supabase
      .from('players')
      .update({ is_active:false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message:'Player deleted.' });
  } catch (error) {
    sendDbError(res, error);
  }
});

module.exports = router;
module.exports.normaliseAttributeRatings = normaliseAttributeRatings;
module.exports.normalisePositionPayload = normalisePositionPayload;
