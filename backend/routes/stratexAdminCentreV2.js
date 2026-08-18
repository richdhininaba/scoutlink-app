'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');
const { recalculatePlayer } = require('../services/playerScoringService');
const { config } = require('../engines');

const requireOperations = requireStratexAdminPermission(
  'operations',
  'Operations permission is required for this Admin Centre action.'
);

const HEIGHT_CATEGORIES = new Set(['very_short','short','average','tall','very_tall']);
const BUILD_CATEGORIES = new Set(['very_slight','slight','lean','athletic','stocky','powerful','very_powerful']);

router.use(requireAuth, requireRole('Stratex'));

function text(value, max = 2000) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}

function bool(value) {
  if (typeof value === 'boolean') return value;
  return String(value).toLowerCase() === 'true';
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positionGroupFor(position) {
  const target = String(position || '').toUpperCase();
  for (const [group, positions] of Object.entries(config.POSITION_GROUPS || {})) {
    if ((positions || []).includes(target)) return group;
  }
  return null;
}

function allowedPositions() {
  return new Set(
    Object.values(config.POSITION_GROUPS || {})
      .flat()
      .map(value => String(value).toUpperCase())
  );
}

function sanitizeRatings(value) {
  const ratings = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const allowed = new Set(Object.keys(config.ATTRIBUTE_DEFINITIONS || {}));
  const output = {};

  Object.entries(ratings).forEach(([group, groupRatings]) => {
    if (!groupRatings || typeof groupRatings !== 'object' || Array.isArray(groupRatings)) return;
    const clean = {};
    Object.entries(groupRatings).forEach(([key, raw]) => {
      if (!allowed.has(key)) return;
      if (raw === null || raw === '' || String(raw).toLowerCase() === 'not observed') {
        clean[key] = null;
        return;
      }
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 10) {
        const error = new Error('Attribute ratings must be whole numbers from 1 to 10 or Not observed.');
        error.status = 400;
        throw error;
      }
      clean[key] = n;
    });
    if (Object.keys(clean).length) output[group] = clean;
  });

  return output;
}

async function audit(req, action, table, recordId, metadata) {
  try {
    await supabase.from('audit_logs').insert({
      actor_id: req.user && req.user.id ? req.user.id : null,
      actor_role: 'Stratex',
      action,
      affected_table: table,
      affected_record_id: recordId || null,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('[Admin Centre audit]', { code: error.code, message: error.message });
  }
}

function throwDb(error) {
  if (!error) return;
  const next = new Error(error.message || 'Database operation failed.');
  next.status = 500;
  next.code = error.code;
  throw next;
}

async function listReal(table, select = '*') {
  const result = await supabase.from(table).select(select).eq('is_demo', false);
  throwDb(result.error);
  return result.data || [];
}

router.get('/overview', async (req, res) => {
  try {
    const [
      players,
      coaches,
      scouts,
      teams,
      agencies,
      registrations,
      concerns,
      usage
    ] = await Promise.all([
      supabase.from('players').select('id', { count: 'exact', head: true }).eq('is_demo', false).eq('is_active', true),
      supabase.from('coaches').select('id', { count: 'exact', head: true }).eq('is_demo', false).eq('is_active', true),
      supabase.from('scouts').select('id', { count: 'exact', head: true }).eq('is_demo', false).eq('is_active', true),
      supabase.from('school_academy_teams').select('id', { count: 'exact', head: true }).eq('is_demo', false).eq('is_active', true),
      supabase.from('scout_teams').select('id', { count: 'exact', head: true }).eq('is_demo', false).or('status.is.null,status.neq.archived'),
      supabase.from('registration_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('stratex_website_leads').select('id', { count: 'exact', head: true }).eq('lead_type', 'concern').not('status', 'in', '(closed,resolved)'),
      supabase.from('usage_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    res.json({
      data: {
        players: players.count || 0,
        coaches: coaches.count || 0,
        scouts: scouts.count || 0,
        teams: teams.count || 0,
        agencies: agencies.count || 0,
        pendingRegistrations: registrations.count || 0,
        openConcerns: concerns.count || 0,
        pendingUsageRequests: usage.count || 0
      }
    });
  } catch (error) {
    console.error('[Admin Centre overview]', error);
    res.status(500).json({ error: 'Admin Centre overview could not be loaded.' });
  }
});

router.get('/players', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 250, 1), 500);
    let query = supabase
      .from('players')
      .select('id,player_id,first_name,last_name,age,age_group,position_group,specific_position,primary_position,team_id,team_name,assigned_coach_id,overall_rating,availability,is_active,registration_complete,attribute_ratings,updated_at')
      .eq('is_demo', false)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (req.query.active === 'true') query = query.eq('is_active', true);
    if (req.query.active === 'false') query = query.eq('is_active', false);
    if (req.query.ageGroup) query = query.eq('age_group', text(req.query.ageGroup, 20));
    if (req.query.position) query = query.eq('primary_position', text(req.query.position, 12).toUpperCase());

    const result = await query;
    throwDb(result.error);
    let rows = result.data || [];

    const q = text(req.query.q, 120).toLowerCase();
    if (q) {
      rows = rows.filter(row => [
        row.first_name,
        row.last_name,
        row.player_id,
        row.team_name,
        row.age_group,
        row.primary_position,
        row.specific_position
      ].join(' ').toLowerCase().includes(q));
    }

    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('[Admin Centre players]', error);
    res.status(error.status || 500).json({ error: error.message || 'Players could not be loaded.' });
  }
});

router.get('/players/:id', async (req, res) => {
  try {
    const playerResult = await supabase
      .from('players')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_demo', false)
      .maybeSingle();
    throwDb(playerResult.error);
    if (!playerResult.data) return res.status(404).json({ error: 'Player not found.' });

    const player = playerResult.data;
    const [coachResult, teamResult, factsResult, videosResult, compatibilityResult] = await Promise.all([
      player.assigned_coach_id
        ? supabase.from('coaches').select('id,first_name,last_name,email,team_name,is_active').eq('id', player.assigned_coach_id).maybeSingle()
        : Promise.resolve({ data: null }),
      player.team_id
        ? supabase.from('school_academy_teams').select('*').eq('id', player.team_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('match_facts').select('id,match_date,position_played,minutes_played,performance_rating').eq('player_id', player.id).order('match_date', { ascending: false }).limit(20),
      supabase.from('player_videos').select('id,title,moderation_status,created_at,video_type').eq('player_id', player.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('compatibility_scores').select('scout_team_id,compatibility_score,conservative_score,estimated_score,likely_range,calculated_at').eq('player_id', player.id).order('calculated_at', { ascending: false }).limit(5)
    ]);

    res.json({
      data: {
        player,
        coach: coachResult.data || null,
        team: teamResult.data || null,
        matchFacts: factsResult.data || [],
        videos: videosResult.data || [],
        compatibility: compatibilityResult.data || []
      }
    });
  } catch (error) {
    console.error('[Admin Centre player detail]', error);
    res.status(error.status || 500).json({ error: error.message || 'Player could not be loaded.' });
  }
});

router.patch('/players/:id', requireOperations, async (req, res) => {
  try {
    const existingResult = await supabase
      .from('players')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_demo', false)
      .maybeSingle();
    throwDb(existingResult.error);
    if (!existingResult.data) return res.status(404).json({ error: 'Player not found.' });

    const existing = existingResult.data;
    const patch = { updated_at: new Date().toISOString() };
    const body = req.body || {};

    if (body.firstName !== undefined) patch.first_name = text(body.firstName, 80);
    if (body.lastName !== undefined) patch.last_name = text(body.lastName, 80);
    if (body.age !== undefined) {
      const age = numberOrNull(body.age);
      if (age !== null && (!Number.isInteger(age) || age < 5 || age > 21)) {
        return res.status(400).json({ error: 'Age must be a whole number from 5 to 21.' });
      }
      patch.age = age;
    }
    if (body.ageGroup !== undefined) {
      const ageGroup = text(body.ageGroup, 10).toUpperCase();
      if (!/^U(?:[7-9]|1[0-6])$/.test(ageGroup)) {
        return res.status(400).json({ error: 'Age group must be U7 to U16.' });
      }
      patch.age_group = ageGroup;
    }
    if (body.primaryPosition !== undefined) {
      const position = text(body.primaryPosition, 12).toUpperCase();
      if (!allowedPositions().has(position)) {
        return res.status(400).json({ error: 'Choose a supported ScoutLink position.' });
      }
      patch.primary_position = position;
      patch.specific_position = position;
      patch.position_group = positionGroupFor(position);
    }
    if (body.alternativePositions !== undefined) {
      const positions = Array.isArray(body.alternativePositions)
        ? body.alternativePositions.map(item => text(item, 12).toUpperCase()).filter(Boolean)
        : [];
      if (positions.length > 2 || positions.some(position => !allowedPositions().has(position))) {
        return res.status(400).json({ error: 'Choose up to two supported alternative positions.' });
      }
      patch.alternative_positions = [...new Set(positions)];
      patch.positions = [...new Set([patch.primary_position || existing.primary_position, ...positions].filter(Boolean))];
    }
    if (body.foot !== undefined) patch.foot = text(body.foot, 30) || null;
    if (body.heightCategory !== undefined) {
      const heightCategory = text(body.heightCategory, 40).toLowerCase();
      if (heightCategory && !HEIGHT_CATEGORIES.has(heightCategory)) {
        return res.status(400).json({ error: 'Choose a supported height category.' });
      }
      patch.height_category = heightCategory || null;
    }
    if (body.buildCategory !== undefined) {
      const buildCategory = text(body.buildCategory, 40).toLowerCase();
      if (buildCategory && !BUILD_CATEGORIES.has(buildCategory)) {
        return res.status(400).json({ error: 'Choose a supported build category.' });
      }
      patch.build_category = buildCategory || null;
    }
    if (body.availability !== undefined) patch.availability = text(body.availability, 80) || null;
    if (body.teamId !== undefined) {
      const teamId = text(body.teamId, 80) || null;
      patch.team_id = teamId;
      if (teamId) {
        const teamResult = await supabase.from('school_academy_teams').select('id,team_name,is_demo,is_active').eq('id', teamId).maybeSingle();
        throwDb(teamResult.error);
        if (!teamResult.data || teamResult.data.is_demo || teamResult.data.is_active === false) {
          return res.status(400).json({ error: 'Choose an active real grassroots team.' });
        }
        patch.team_name = teamResult.data.team_name;
      } else {
        patch.team_name = null;
      }
    }
    if (body.coachId !== undefined) {
      const coachId = text(body.coachId, 80) || null;
      patch.assigned_coach_id = coachId;
      if (coachId) {
        const coachResult = await supabase.from('coaches').select('id,is_demo,is_active').eq('id', coachId).maybeSingle();
        throwDb(coachResult.error);
        if (!coachResult.data || coachResult.data.is_demo || coachResult.data.is_active === false) {
          return res.status(400).json({ error: 'Choose an active real coach.' });
        }
      }
    }
    if (body.attributeRatings !== undefined) {
      patch.attribute_ratings = sanitizeRatings(body.attributeRatings);
      patch.attribute_rating_scale = '1-10';
      patch.attribute_assessment_version = config.ATTRIBUTE_RUBRIC_VERSION;
      patch.attribute_assessed_at = new Date().toISOString();
      patch.attribute_assessed_by = req.user.id;
    }

    const updateResult = await supabase.from('players').update(patch).eq('id', existing.id).select().single();
    throwDb(updateResult.error);

    let analysis = null;
    let scoringWarning = null;
    try {
      analysis = await recalculatePlayer(existing.id, { persistCompatibility: false });
    } catch (scoringError) {
      scoringWarning = scoringError.message || 'Player saved, but the V4 outputs could not be recalculated.';
      console.error('[Admin Centre player recalculate]', scoringError);
    }

    await audit(req, 'admin_player_updated', 'players', existing.id, {
      fields: Object.keys(patch),
      scoringRecalculated: !!analysis
    });

    const refreshed = await supabase.from('players').select('*').eq('id', existing.id).single();
    throwDb(refreshed.error);
    res.json({ data: refreshed.data, analysis, warning: scoringWarning });
  } catch (error) {
    console.error('[Admin Centre player update]', error);
    res.status(error.status || 500).json({ error: error.message || 'Player could not be updated.' });
  }
});

router.post('/players/:id/disqualify', requireOperations, async (req, res) => {
  try {
    const reason = text(req.body && req.body.reason, 1000);
    if (!reason) return res.status(400).json({ error: 'Add a reason before disqualifying a player.' });

    const result = await supabase.from('players').update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archived_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id).eq('is_demo', false).select('id,first_name,last_name,is_active,archived_at,archived_reason').maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Player not found.' });

    await audit(req, 'admin_player_disqualified', 'players', req.params.id, { reason });
    res.json({ data: result.data });
  } catch (error) {
    console.error('[Admin Centre player disqualify]', error);
    res.status(error.status || 500).json({ error: error.message || 'Player could not be disqualified.' });
  }
});

router.get('/coaches', async (req, res) => {
  try {
    const result = await supabase
      .from('coaches')
      .select('id,coach_id,first_name,last_name,email,phone,team_id,team_name,role_at_club,is_active,is_super_user,registration_complete,created_at,updated_at')
      .eq('is_demo', false)
      .order('updated_at', { ascending: false })
      .limit(500);
    throwDb(result.error);
    res.json({ data: result.data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Coaches could not be loaded.' });
  }
});

router.get('/coaches/:id', async (req, res) => {
  try {
    const coachResult = await supabase.from('coaches').select('*').eq('id', req.params.id).eq('is_demo', false).maybeSingle();
    throwDb(coachResult.error);
    if (!coachResult.data) return res.status(404).json({ error: 'Coach not found.' });
    const coach = coachResult.data;
    const playersResult = await supabase
      .from('players')
      .select('id,first_name,last_name,age_group,primary_position,overall_rating,is_active')
      .eq('assigned_coach_id', coach.id)
      .eq('is_demo', false)
      .order('last_name', { ascending: true });
    throwDb(playersResult.error);
    res.json({ data: { coach, players: playersResult.data || [] } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Coach could not be loaded.' });
  }
});

router.patch('/coaches/:id', requireOperations, async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.isActive !== undefined) patch.is_active = bool(req.body.isActive);
    if (req.body.isSuperUser !== undefined) patch.is_super_user = bool(req.body.isSuperUser);
    if (req.body.roleAtClub !== undefined) patch.role_at_club = text(req.body.roleAtClub, 120) || null;
    if (req.body.teamId !== undefined) {
      const teamId = text(req.body.teamId, 80) || null;
      patch.team_id = teamId;
      if (teamId) {
        const team = await supabase.from('school_academy_teams').select('id,team_name,is_demo,is_active').eq('id', teamId).maybeSingle();
        throwDb(team.error);
        if (!team.data || team.data.is_demo || team.data.is_active === false) return res.status(400).json({ error: 'Choose an active real team.' });
        patch.team_name = team.data.team_name;
      } else {
        patch.team_name = null;
      }
    }
    const result = await supabase.from('coaches').update(patch).eq('id', req.params.id).eq('is_demo', false).select().maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Coach not found.' });
    await audit(req, 'admin_coach_updated', 'coaches', req.params.id, { fields: Object.keys(patch) });
    res.json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Coach could not be updated.' });
  }
});

router.get('/teams', async (req, res) => {
  try {
    const teamResult = await supabase
      .from('school_academy_teams')
      .select('*')
      .eq('is_demo', false)
      .order('team_name', { ascending: true })
      .limit(500);
    throwDb(teamResult.error);
    const teams = teamResult.data || [];
    const ids = teams.map(team => team.id);
    let coaches = [], players = [];
    if (ids.length) {
      const [coachResult, playerResult] = await Promise.all([
        supabase.from('coaches').select('id,team_id,is_active').in('team_id', ids).eq('is_demo', false),
        supabase.from('players').select('id,team_id,is_active').in('team_id', ids).eq('is_demo', false)
      ]);
      coaches = coachResult.data || [];
      players = playerResult.data || [];
    }
    res.json({
      data: teams.map(team => ({
        ...team,
        coachCount: coaches.filter(row => row.team_id === team.id && row.is_active !== false).length,
        playerCount: players.filter(row => row.team_id === team.id && row.is_active !== false).length
      }))
    });
  } catch (error) {
    console.error('[Admin Centre teams]', error);
    res.status(500).json({ error: 'Teams could not be loaded.' });
  }
});

router.post('/teams', requireOperations, async (req, res) => {
  try {
    const teamName = text(req.body.teamName, 180);
    if (!teamName) return res.status(400).json({ error: 'Team name is required.' });
    const payload = {
      team_name: teamName,
      county: text(req.body.county, 120) || null,
      city: text(req.body.city, 120) || null,
      country: text(req.body.country, 120) || 'United Kingdom',
      contact_email: text(req.body.contactEmail, 180).toLowerCase() || null,
      league: text(req.body.league, 180) || null,
      league_name: text(req.body.league, 180) || null,
      league_fulltime_url: text(req.body.leagueFulltimeUrl, 600) || null,
      team_website_url: text(req.body.teamWebsiteUrl, 600) || null,
      is_demo: false,
      is_active: true
    };
    const result = await supabase.from('school_academy_teams').insert(payload).select().single();
    throwDb(result.error);
    await audit(req, 'admin_team_created', 'school_academy_teams', result.data.id, { teamName });
    res.status(201).json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Team could not be created.' });
  }
});

router.get('/teams/:id', async (req, res) => {
  try {
    const teamResult = await supabase.from('school_academy_teams').select('*').eq('id', req.params.id).eq('is_demo', false).maybeSingle();
    throwDb(teamResult.error);
    if (!teamResult.data) return res.status(404).json({ error: 'Team not found.' });
    const [coaches, players] = await Promise.all([
      supabase.from('coaches').select('id,first_name,last_name,email,role_at_club,is_active,is_super_user').eq('team_id', req.params.id).eq('is_demo', false),
      supabase.from('players').select('id,first_name,last_name,age_group,primary_position,overall_rating,is_active').eq('team_id', req.params.id).eq('is_demo', false)
    ]);
    res.json({ data: { team: teamResult.data, coaches: coaches.data || [], players: players.data || [] } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Team could not be loaded.' });
  }
});

router.post('/teams/:id/archive', requireOperations, async (req, res) => {
  try {
    const reason = text(req.body.reason, 1000);
    if (!reason) return res.status(400).json({ error: 'Add an archive reason.' });
    const teamResult = await supabase.from('school_academy_teams').select('*').eq('id', req.params.id).eq('is_demo', false).maybeSingle();
    throwDb(teamResult.error);
    if (!teamResult.data) return res.status(404).json({ error: 'Team not found.' });

    const now = new Date().toISOString();
    const [coachUpdate, playerUpdate, teamUpdate] = await Promise.all([
      supabase.from('coaches').update({ team_id: null, team_name: null, updated_at: now }).eq('team_id', req.params.id).eq('is_demo', false),
      supabase.from('players').update({ team_id: null, team_name: null, updated_at: now }).eq('team_id', req.params.id).eq('is_demo', false),
      supabase.from('school_academy_teams').update({ is_active: false, archived_at: now, archived_reason: reason }).eq('id', req.params.id)
    ]);
    throwDb(coachUpdate.error); throwDb(playerUpdate.error); throwDb(teamUpdate.error);
    await audit(req, 'admin_team_archived', 'school_academy_teams', req.params.id, {
      reason,
      preservedPeopleAndEvidence: true
    });
    res.json({ message: 'Team archived. Coaches and players were unassigned; their records and evidence were preserved.' });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Team could not be archived.' });
  }
});

router.get('/scouts', async (req, res) => {
  try {
    const [scoutsResult, agenciesResult] = await Promise.all([
      supabase.from('scouts').select('*').eq('is_demo', false).order('updated_at', { ascending: false }).limit(500),
      supabase.from('scout_teams').select('*').eq('is_demo', false).order('team_name', { ascending: true }).limit(500)
    ]);
    throwDb(scoutsResult.error); throwDb(agenciesResult.error);
    res.json({ data: { scouts: scoutsResult.data || [], agencies: agenciesResult.data || [] } });
  } catch (error) {
    res.status(500).json({ error: 'Scouts and agencies could not be loaded.' });
  }
});

router.get('/scouts/:id', async (req, res) => {
  try {
    const scoutResult = await supabase.from('scouts').select('*').eq('id', req.params.id).eq('is_demo', false).maybeSingle();
    throwDb(scoutResult.error);
    if (!scoutResult.data) return res.status(404).json({ error: 'Scout not found.' });
    let agency = null;
    if (scoutResult.data.scout_team_id) {
      const agencyResult = await supabase.from('scout_teams').select('*').eq('id', scoutResult.data.scout_team_id).maybeSingle();
      throwDb(agencyResult.error);
      agency = agencyResult.data || null;
    }
    const requests = await supabase.from('usage_requests').select('*').eq('scout_id', req.params.id).order('created_at', { ascending: false }).limit(50);
    res.json({ data: { scout: scoutResult.data, agency, usageRequests: requests.data || [] } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Scout could not be loaded.' });
  }
});

router.patch('/scouts/:id', requireOperations, async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.isActive !== undefined) patch.is_active = bool(req.body.isActive);
    if (req.body.subscriptionPlan !== undefined) patch.subscription_plan = text(req.body.subscriptionPlan, 60);
    if (req.body.scoutTeamId !== undefined) patch.scout_team_id = text(req.body.scoutTeamId, 80) || null;
    if (req.body.exportsRemaining !== undefined) patch.exports_remaining = numberOrNull(req.body.exportsRemaining);
    if (req.body.predictionsRemaining !== undefined) patch.predictions_remaining = numberOrNull(req.body.predictionsRemaining);
    if (req.body.interestsRemaining !== undefined) patch.interests_remaining = numberOrNull(req.body.interestsRemaining);
    const result = await supabase.from('scouts').update(patch).eq('id', req.params.id).eq('is_demo', false).select().maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Scout not found.' });
    await audit(req, 'admin_scout_updated', 'scouts', req.params.id, { fields: Object.keys(patch) });
    res.json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Scout could not be updated.' });
  }
});

router.post('/agencies', requireOperations, async (req, res) => {
  try {
    const teamName = text(req.body.teamName, 180);
    if (!teamName) return res.status(400).json({ error: 'Agency or scouting team name is required.' });
    const payload = {
      team_name: teamName,
      club_name: text(req.body.clubName, 180) || teamName,
      subscription_plan: text(req.body.subscriptionPlan, 60) || 'Core',
      tier: numberOrNull(req.body.tier) || 5,
      country: text(req.body.country, 120) || 'United Kingdom',
      formation: text(req.body.formation, 80) || null,
      playing_style: text(req.body.playingStyle, 120) || null,
      status: 'draft',
      is_demo: false,
      updated_at: new Date().toISOString()
    };
    const result = await supabase.from('scout_teams').insert(payload).select().single();
    throwDb(result.error);
    await audit(req, 'admin_scout_agency_created', 'scout_teams', result.data.id, { teamName });
    res.status(201).json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Agency could not be created.' });
  }
});

router.patch('/agencies/:id', requireOperations, async (req, res) => {
  try {
    const patch = { updated_at: new Date().toISOString() };
    ['teamName','clubName','league','country','formation','playingStyle','subscriptionPlan','status'].forEach(key => {
      if (req.body[key] === undefined) return;
      const column = {
        teamName:'team_name', clubName:'club_name', league:'league', country:'country',
        formation:'formation', playingStyle:'playing_style', subscriptionPlan:'subscription_plan', status:'status'
      }[key];
      patch[column] = text(req.body[key], 240) || null;
    });
    if (req.body.limitOverrides !== undefined) {
      patch.limit_overrides = req.body.limitOverrides && typeof req.body.limitOverrides === 'object' ? req.body.limitOverrides : {};
    }
    const result = await supabase.from('scout_teams').update(patch).eq('id', req.params.id).eq('is_demo', false).select().maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Agency not found.' });
    await audit(req, 'admin_scout_agency_updated', 'scout_teams', req.params.id, { fields: Object.keys(patch) });
    res.json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Agency could not be updated.' });
  }
});

router.post('/agencies/:id/archive', requireOperations, async (req, res) => {
  try {
    const result = await supabase.from('scout_teams').update({
      status: 'archived',
      updated_at: new Date().toISOString()
    }).eq('id', req.params.id).eq('is_demo', false).select('id,team_name,status').maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Agency not found.' });
    await audit(req, 'admin_scout_agency_archived', 'scout_teams', req.params.id, {});
    res.json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Agency could not be archived.' });
  }
});

router.get('/time-off', async (req, res) => {
  try {
    const [timeOff, admins] = await Promise.all([
      supabase.from('stratex_time_off').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('stratex').select('id,first_name,last_name,email,job_title,manager_id,is_active').eq('is_demo', false)
    ]);
    throwDb(timeOff.error); throwDb(admins.error);
    const byId = new Map((admins.data || []).map(row => [row.id, row]));
    res.json({
      data: (timeOff.data || []).map(row => ({ ...row, person: byId.get(row.stratex_id) || null })),
      people: admins.data || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Leave records could not be loaded.' });
  }
});

router.post('/time-off', requireOperations, async (req, res) => {
  try {
    const payload = {
      stratex_id: text(req.body.stratexId, 80),
      leave_type: text(req.body.leaveType, 80) || 'Annual leave',
      start_date: text(req.body.startDate, 20),
      end_date: text(req.body.endDate, 20),
      status: text(req.body.status, 60) || 'pending',
      notes: text(req.body.notes, 2000) || null
    };
    if (!payload.stratex_id || !payload.start_date || !payload.end_date) {
      return res.status(400).json({ error: 'Person, start date and end date are required.' });
    }
    const result = await supabase.from('stratex_time_off').insert(payload).select().single();
    throwDb(result.error);
    await audit(req, 'admin_time_off_created', 'stratex_time_off', result.data.id, { stratexId: payload.stratex_id });
    res.status(201).json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Leave record could not be created.' });
  }
});

router.patch('/time-off/:id', requireOperations, async (req, res) => {
  try {
    const patch = {};
    if (req.body.leaveType !== undefined) patch.leave_type = text(req.body.leaveType, 80);
    if (req.body.startDate !== undefined) patch.start_date = text(req.body.startDate, 20);
    if (req.body.endDate !== undefined) patch.end_date = text(req.body.endDate, 20);
    if (req.body.status !== undefined) patch.status = text(req.body.status, 60);
    if (req.body.notes !== undefined) patch.notes = text(req.body.notes, 2000) || null;
    const result = await supabase.from('stratex_time_off').update(patch).eq('id', req.params.id).select().maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Leave record not found.' });
    await audit(req, 'admin_time_off_updated', 'stratex_time_off', req.params.id, { fields: Object.keys(patch) });
    res.json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Leave record could not be updated.' });
  }
});

router.get('/meetings', async (req, res) => {
  try {
    const result = await supabase.from('stratex_meetings').select('*').order('meeting_date', { ascending: false }).limit(500);
    throwDb(result.error);
    res.json({ data: result.data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Meetings could not be loaded.' });
  }
});

router.post('/meetings', requireOperations, async (req, res) => {
  try {
    const title = text(req.body.title, 220);
    const meetingDate = text(req.body.meetingDate, 80);
    if (!title || !meetingDate) return res.status(400).json({ error: 'Meeting title and date are required.' });
    const attendees = Array.isArray(req.body.attendees) ? req.body.attendees.map(item => text(item, 180)).filter(Boolean) : [];
    const payload = {
      created_by: req.user.id,
      title,
      meeting_date: meetingDate,
      location: text(req.body.location, 240) || null,
      attendees,
      notes: text(req.body.notes, 5000) || null
    };
    const result = await supabase.from('stratex_meetings').insert(payload).select().single();
    throwDb(result.error);
    await audit(req, 'admin_meeting_created', 'stratex_meetings', result.data.id, { title });
    res.status(201).json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Meeting could not be created.' });
  }
});

router.patch('/meetings/:id', requireOperations, async (req, res) => {
  try {
    const patch = {};
    if (req.body.title !== undefined) patch.title = text(req.body.title, 220);
    if (req.body.meetingDate !== undefined) patch.meeting_date = text(req.body.meetingDate, 80);
    if (req.body.location !== undefined) patch.location = text(req.body.location, 240) || null;
    if (req.body.attendees !== undefined) patch.attendees = Array.isArray(req.body.attendees) ? req.body.attendees.map(item => text(item, 180)).filter(Boolean) : [];
    if (req.body.notes !== undefined) patch.notes = text(req.body.notes, 5000) || null;
    const result = await supabase.from('stratex_meetings').update(patch).eq('id', req.params.id).select().maybeSingle();
    throwDb(result.error);
    if (!result.data) return res.status(404).json({ error: 'Meeting not found.' });
    await audit(req, 'admin_meeting_updated', 'stratex_meetings', req.params.id, { fields: Object.keys(patch) });
    res.json({ data: result.data });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Meeting could not be updated.' });
  }
});

router.get('/website-activity', async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const result = await supabase
      .from('stratex_website_activity_events')
      .select('event_type,page_path,page_title,referrer,visitor_hash,session_hash,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10000);
    throwDb(result.error);
    const rows = result.data || [];
    const pageViews = rows.filter(row => row.event_type === 'page_view' || !row.event_type);
    const visitors = new Set(rows.map(row => row.visitor_hash).filter(Boolean));
    const sessions = new Set(rows.map(row => row.session_hash).filter(Boolean));
    const byPage = {};
    const byDay = {};
    pageViews.forEach(row => {
      byPage[row.page_path || '/'] = (byPage[row.page_path || '/'] || 0) + 1;
      const day = String(row.created_at || '').slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    res.json({
      data: {
        pageViews: pageViews.length,
        visitors: visitors.size,
        sessions: sessions.size,
        topPages: Object.entries(byPage).map(([pagePath, views]) => ({ pagePath, views })).sort((a, b) => b.views - a.views).slice(0, 20),
        daily: Object.entries(byDay).map(([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Website activity could not be loaded.' });
  }
});

router.get('/audit-log', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 250, 1), 1000);
    const result = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    throwDb(result.error);
    res.json({ data: result.data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Audit log could not be loaded.' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = text(req.query.q, 100).toLowerCase();
    if (q.length < 2) return res.json({ data: [] });

    const [players, coaches, scouts, teams, admins] = await Promise.all([
      listReal('players', 'id,first_name,last_name,player_id,team_name,age_group,primary_position'),
      listReal('coaches', 'id,first_name,last_name,email,team_name,role_at_club'),
      listReal('scouts', 'id,first_name,last_name,email,club_name'),
      listReal('school_academy_teams', 'id,team_name,county,league'),
      listReal('stratex', 'id,first_name,last_name,email,job_title')
    ]);

    const matches = [];
    function collect(type, route, rows, fields) {
      rows.forEach(row => {
        const haystack = fields.map(field => row[field]).join(' ').toLowerCase();
        if (!haystack.includes(q)) return;
        matches.push({
          type,
          id: row.id,
          title: fields.slice(0, 2).map(field => row[field]).filter(Boolean).join(' ') || row.team_name || row.email,
          subtitle: fields.slice(2).map(field => row[field]).filter(Boolean).join(' · '),
          route
        });
      });
    }

    collect('Player', '/admin/scoutlink/players', players, ['first_name','last_name','player_id','team_name','age_group','primary_position']);
    collect('Coach', '/admin/scoutlink/coaches', coaches, ['first_name','last_name','email','team_name','role_at_club']);
    collect('Scout', '/admin/scoutlink/scouts', scouts, ['first_name','last_name','email','club_name']);
    collect('Team', '/admin/scoutlink/teams', teams, ['team_name','county','league']);
    collect('Stratex user', '/admin/admin-users', admins, ['first_name','last_name','email','job_title']);

    res.json({ data: matches.slice(0, 40) });
  } catch (error) {
    res.status(500).json({ error: 'Admin search could not be completed.' });
  }
});

module.exports = router;
