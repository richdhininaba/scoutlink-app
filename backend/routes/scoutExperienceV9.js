'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const {
  requireAuth,
  requireRole,
  generateId,
  generateLoginCode,
  hashPassword,
  verifyPassword
} = require('../utils/auth');
const { effectiveLimits, limitsForPlan } = require('../utils/scoutPlans');
const { getScoutUsageSnapshot } = require('../utils/scoutUsage');
const { analysePlayer } = require('../engines/compatibility');
const { isDemoSession, demoWriteFields } = require('../utils/demo');
const emailService = require('../services/email');
const config = require('../config');

const ALLOWANCE_TYPES = new Set(['interests', 'predictions', 'exports']);
const EVENT_STATUSES = ['published', 'confirmed'];
const POSITION_CODES = new Set([
  'GK','RB','CB','LB','RWB','LWB','DM','CM','AM','RM','LM','RW','LW','CF','ST'
]);

function clean(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function cleanEmail(value) {
  const email = clean(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function integer(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function playerName(player) {
  return [player?.first_name, player?.last_name].filter(Boolean).join(' ') || 'Player';
}

function scoutName(scout) {
  return [scout?.first_name, scout?.last_name].filter(Boolean).join(' ') || 'Scout';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function loadContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!scout) {
    const issue = new Error('Scout account not found.');
    issue.status = 404;
    throw issue;
  }

  let team = null;
  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (result.error) throw result.error;
    team = result.data || null;
  }

  return {
    scout,
    team,
    prefs: scout.scout_preferences || {}
  };
}

function limitsForContext(context) {
  const plan = context.team?.subscription_plan || context.scout.subscription_plan || 'Core';
  const limits = context.scout.scout_team_id
    ? effectiveLimits(plan, context.team?.limit_overrides || {})
    : limitsForPlan(plan);
  return { plan, limits };
}

async function seatSnapshot(context) {
  const { plan, limits } = limitsForContext(context);
  let count = 1;

  if (context.scout.scout_team_id) {
    const result = await supabase
      .from('scouts')
      .select('id', { count: 'exact', head: true })
      .eq('scout_team_id', context.scout.scout_team_id)
      .eq('is_active', true);
    if (result.error) throw result.error;
    count = result.count || 0;
  }

  const limit = Number(limits.seats) || 1;
  return {
    plan,
    used: count,
    limit,
    remaining: Math.max(0, limit - count),
    canInvite: Boolean(context.scout.is_super_user && context.scout.scout_team_id && count < limit)
  };
}

async function teamScouts(context) {
  if (!context.scout.scout_team_id) {
    return [{
      id: context.scout.id,
      first_name: context.scout.first_name,
      last_name: context.scout.last_name,
      email: context.scout.email,
      is_super_user: context.scout.is_super_user,
      is_active: context.scout.is_active
    }];
  }

  const { data, error } = await supabase
    .from('scouts')
    .select('id,first_name,last_name,email,phone,club_name,is_super_user,is_active,registration_complete,created_at,last_login')
    .eq('scout_team_id', context.scout.scout_team_id)
    .eq('is_active', true)
    .order('is_super_user', { ascending: false })
    .order('first_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function activePipelineForPlayer(context, playerId) {
  let query = supabase
    .from('recruitment_pipeline')
    .select('*')
    .eq('player_id', playerId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (context.scout.scout_team_id) {
    query = query.eq('scout_team_id', context.scout.scout_team_id);
  } else {
    query = query.eq('scout_id', context.scout.id);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data || [])[0] || null;
}

async function coachesForPlayer(player) {
  if (!player) return [];
  let query = supabase
    .from('coaches')
    .select('id,first_name,last_name,team_id,team_name,is_active')
    .eq('is_active', true);

  if (player.assigned_coach_id) {
    query = query.eq('id', player.assigned_coach_id);
  } else if (player.team_id) {
    query = query.eq('team_id', player.team_id);
  } else {
    return [];
  }

  const { data, error } = await query.limit(20);
  if (error) throw error;
  return data || [];
}

function normaliseSavedSearch(raw, index) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const positions = unique((Array.isArray(item.positions) ? item.positions : [])
    .map(value => clean(value, 10).toUpperCase())
    .filter(value => POSITION_CODES.has(value)));
  const ageGroups = unique((Array.isArray(item.ageGroups) ? item.ageGroups : [])
    .map(value => clean(value, 10).toUpperCase())
    .filter(value => /^U(?:[7-9]|1[0-6])$/.test(value)));

  return {
    id: clean(item.id, 80) || `saved-search-${Date.now()}-${index}`,
    name: clean(item.name, 120) || `Saved search ${index + 1}`,
    positions,
    ageGroups,
    region: clean(item.region, 160),
    availability: clean(item.availability, 80) || 'Any',
    foot: clean(item.foot, 30) || 'Any',
    minOverall: Math.max(0, Math.min(100, integer(item.minOverall, 0)))
  };
}

async function latestEventWorkspace(context, eventId) {
  const { data, error } = await supabase
    .from('scout_activity_events')
    .select('*')
    .eq('scout_id', context.scout.id)
    .in('event_type', ['showcase_event_note', 'showcase_watch_added', 'showcase_watch_removed'])
    .contains('data', { eventId })
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  let note = '';
  let noteFound = false;
  const watchState = new Map();

  (data || []).forEach(row => {
    if (row.event_type === 'showcase_event_note' && !noteFound) {
      note = row.body || row.data?.note || '';
      noteFound = true;
      return;
    }
    if (!row.player_id || watchState.has(row.player_id)) return;
    watchState.set(row.player_id, row.event_type === 'showcase_watch_added');
  });

  return {
    note,
    watchlistPlayerIds: [...watchState.entries()]
      .filter(([, active]) => active)
      .map(([playerId]) => playerId)
  };
}

async function resolveEvent(value) {
  let query = supabase
    .from('showcase_events')
    .select('*')
    .in('status', EVENT_STATUSES);
  query = isUuid(value) ? query.eq('id', value) : query.eq('slug', clean(value, 180));
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) {
    const issue = new Error('Event not found.');
    issue.status = 404;
    throw issue;
  }
  return data;
}

async function eventPlayerRows(eventId) {
  const { data: linkedRows, error: linkedError } = await supabase
    .from('showcase_players')
    .select('id,player_id,status,added_at')
    .eq('event_id', eventId)
    .order('added_at', { ascending: true });
  if (linkedError) throw linkedError;

  const ids = unique((linkedRows || []).map(row => row.player_id));
  let players = [];
  if (ids.length) {
    const result = await supabase
      .from('players')
      .select('id,first_name,last_name,age_group,primary_position,specific_position,position_group,team_name,overall_rating,transfer_value')
      .in('id', ids)
      .eq('is_active', true);
    if (result.error) throw result.error;
    players = result.data || [];
  }

  const byId = Object.fromEntries(players.map(player => [player.id, player]));
  return (linkedRows || [])
    .map(row => ({ ...row, player: byId[row.player_id] || null }))
    .filter(row => row.player);
}

async function ensureUniqueLoginCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateLoginCode();
    const checks = await Promise.all(
      ['scouts', 'coaches', 'players', 'stratex'].map(table =>
        supabase.from(table).select('id').eq('login_code', code).maybeSingle()
      )
    );
    if (!checks.some(result => result.data)) return code;
  }
  throw new Error('Could not generate a unique login code.');
}

router.use(requireAuth, requireRole('Scout'));

router.get('/workspace', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const [usage, seats, scouts] = await Promise.all([
      getScoutUsageSnapshot(context),
      seatSnapshot(context),
      teamScouts(context)
    ]);

    res.set('Cache-Control', 'no-store');
    res.json({
      scout: context.scout,
      scoutTeam: context.team,
      usage,
      seats,
      teamScouts: scouts,
      discoveryPreferences: context.prefs.discoveryPreferences || {
        savedSearches: [],
        defaultSavedSearchId: null,
        defaultEnabled: false
      }
    });
  } catch (error) {
    console.error('[Scout V9 workspace]', error);
    res.status(error.status || 500).json({ error: error.message || 'Scout workspace could not be loaded.' });
  }
});

router.get('/player/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    let query = supabase
      .from('players')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true);

    query = isDemoSession(req) ? query.eq('is_demo', true) : query.eq('is_demo', false);
    const { data: player, error } = await query.maybeSingle();
    if (error) throw error;
    if (!player) return res.status(404).json({ error: 'Player not found.' });

    const [factsResult, videosResult, pipeline, coaches] = await Promise.all([
      supabase.from('match_facts').select('*').eq('player_id', player.id).order('match_date', { ascending: false }).limit(100),
      supabase.from('player_videos').select('*').eq('player_id', player.id).order('created_at', { ascending: false }).limit(100),
      activePipelineForPlayer(context, player.id),
      coachesForPlayer(player)
    ]);
    if (factsResult.error) throw factsResult.error;
    if (videosResult.error) throw videosResult.error;

    let team = null;
    let upcomingFixtures = [];
    if (player.team_id) {
      const [teamResult, fixtureResult] = await Promise.all([
        supabase.from('school_academy_teams').select('*').eq('id', player.team_id).maybeSingle(),
        supabase.from('fixtures').select('*').eq('team_id', player.team_id)
          .gte('fixture_date', new Date().toISOString().slice(0, 10))
          .order('fixture_date', { ascending: true })
          .limit(50)
      ]);
      if (teamResult.error) throw teamResult.error;
      if (fixtureResult.error) throw fixtureResult.error;
      team = teamResult.data || null;
      upcomingFixtures = fixtureResult.data || [];
    }

    let analysis = {};
    try {
      analysis = analysePlayer(player, context.team || {}, factsResult.data || [], context.prefs || {}) || {};
    } catch (analysisError) {
      console.warn('[Scout V9 player analysis skipped]', analysisError.message);
      analysis = {};
    }

    const enrichedPlayer = {
      ...player,
      team,
      compatibilityScore: analysis.compatibilityScore ?? player.compatibility_score ?? null,
      compatibility: analysis.compatibility || {},
      compatibilityBreakdown: analysis.compatibilityBreakdown || {},
      overallBreakdown: analysis.overallBreakdown || {},
      positionRatings: analysis.positionRatings || {},
      _analysis: analysis,
      _facts: factsResult.data || []
    };

    res.set('Cache-Control', 'no-store');
    res.json({
      player: enrichedPlayer,
      team,
      analysis,
      recentMatches: factsResult.data || [],
      videos: videosResult.data || [],
      upcomingFixtures,
      pipeline,
      pipelineStatus: pipeline?.stage || null,
      inPipeline: Boolean(pipeline),
      canMessageCoach: Boolean(pipeline && coaches.length),
      coaches
    });
  } catch (error) {
    console.error('[Scout V9 player detail]', error);
    res.status(error.status || 500).json({ error: error.message || 'Player profile could not be loaded.' });
  }
});

router.get('/exports', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    let query = supabase.from('scout_exports').select('*').order('created_at', { ascending: false }).limit(100);
    query = context.scout.scout_team_id
      ? query.eq('scout_team_id', context.scout.scout_team_id)
      : query.eq('scout_id', context.scout.id);
    const { data, error } = await query;
    if (error) throw error;
    res.set('Cache-Control', 'no-store');
    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Scout V9 exports]', error);
    res.status(500).json({ error: 'Export history could not be loaded.' });
  }
});

router.get('/events/:event', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const event = await resolveEvent(req.params.event);
    const [playerRows, attendanceResult, workspace] = await Promise.all([
      eventPlayerRows(event.id),
      supabase.from('showcase_attendance').select('*').eq('event_id', event.id).eq('scout_id', context.scout.id).maybeSingle(),
      latestEventWorkspace(context, event.id)
    ]);
    if (attendanceResult.error) throw attendanceResult.error;

    const { count, error: countError } = await supabase
      .from('showcase_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'confirmed');
    if (countError) throw countError;

    res.set('Cache-Control', 'no-store');
    res.json({
      event,
      players: playerRows,
      attendance: attendanceResult.data || null,
      confirmedCount: count || 0,
      planning: workspace
    });
  } catch (error) {
    console.error('[Scout V9 event detail]', error);
    res.status(error.status || 500).json({ error: error.message || 'Event details could not be loaded.' });
  }
});

router.post('/events/:event/note', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const event = await resolveEvent(req.params.event);
    const note = clean(req.body.note, 5000);
    const { data, error } = await supabase
      .from('scout_activity_events')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        event_type: 'showcase_event_note',
        title: `Private event note · ${event.event_name}`,
        body: note,
        severity: 'info',
        data: { eventId: event.id, eventSlug: event.slug || null, note }
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ data, note });
  } catch (error) {
    console.error('[Scout V9 event note]', error);
    res.status(error.status || 500).json({ error: error.message || 'Event note could not be saved.' });
  }
});

router.post('/events/:event/watchlist', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const event = await resolveEvent(req.params.event);
    const playerId = clean(req.body.playerId, 120);
    const active = req.body.active !== false;
    if (!playerId) return res.status(400).json({ error: 'playerId is required.' });

    const playerRows = await eventPlayerRows(event.id);
    if (!playerRows.some(row => String(row.player_id) === playerId)) {
      return res.status(400).json({ error: 'Choose a player attached to this event.' });
    }

    const { data, error } = await supabase
      .from('scout_activity_events')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        player_id: playerId,
        event_type: active ? 'showcase_watch_added' : 'showcase_watch_removed',
        title: active ? 'Added to event watchlist' : 'Removed from event watchlist',
        body: event.event_name,
        severity: 'info',
        data: { eventId: event.id, eventSlug: event.slug || null, active }
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ data, playerId, active });
  } catch (error) {
    console.error('[Scout V9 event watchlist]', error);
    res.status(error.status || 500).json({ error: error.message || 'Event watchlist could not be updated.' });
  }
});

router.post('/usage-request', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const allowanceType = clean(req.body.allowanceType, 40).toLowerCase();
    const quantity = integer(req.body.quantity);
    const reason = clean(req.body.reason, 3000);

    if (!ALLOWANCE_TYPES.has(allowanceType)) {
      return res.status(400).json({ error: 'Allowance type is required.' });
    }
    if (!quantity) {
      return res.status(400).json({ error: 'Additional quantity is required.' });
    }

    const usage = await getScoutUsageSnapshot(context);
    const part = usage[allowanceType];
    const requestCode = `UR-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const payload = {
      request_code: requestCode,
      requester_account_type: 'Scout',
      requester_id: context.scout.id,
      scout_id: context.scout.id,
      coach_id: null,
      scout_team_id: context.scout.scout_team_id || null,
      organisation_name: context.team?.team_name || context.team?.club_name || context.scout.club_name || 'Scout team',
      allowance_type: allowanceType,
      quantity_requested: quantity,
      current_used: part.used,
      current_limit: part.limit,
      urgency: 'Needed this week',
      reason: reason || null,
      status: 'pending'
    };

    const { data, error } = await supabase.from('usage_requests').insert(payload).select().single();
    if (error) throw error;

    const { error: eventError } = await supabase.from('usage_request_events').insert({
      request_id: data.id,
      event_type: 'submitted',
      status: 'pending',
      title: 'Request submitted',
      body: `${quantity} additional ${allowanceType} requested.${reason ? ` ${reason}` : ''}`,
      actor_type: 'Scout',
      actor_id: context.scout.id,
      actor_name: scoutName(context.scout),
      quantity
    });
    if (eventError) throw eventError;

    res.status(201).json({ request: data, usage });
  } catch (error) {
    console.error('[Scout V9 usage request]', error);
    res.status(error.status || 500).json({ error: error.message || 'Usage request could not be submitted.' });
  }
});

router.patch('/preferences', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const raw = req.body.discoveryPreferences && typeof req.body.discoveryPreferences === 'object'
      ? req.body.discoveryPreferences
      : req.body;
    const savedSearches = (Array.isArray(raw.savedSearches) ? raw.savedSearches : [])
      .slice(0, 20)
      .map(normaliseSavedSearch);
    const ids = new Set(savedSearches.map(item => item.id));
    const defaultSavedSearchId = ids.has(clean(raw.defaultSavedSearchId, 80))
      ? clean(raw.defaultSavedSearchId, 80)
      : null;
    const discoveryPreferences = {
      savedSearches,
      defaultSavedSearchId,
      defaultEnabled: Boolean(raw.defaultEnabled && defaultSavedSearchId),
      updatedAt: new Date().toISOString()
    };
    const nextPrefs = {
      ...(context.prefs || {}),
      discoveryPreferences
    };

    const { data, error } = await supabase
      .from('scouts')
      .update({ scout_preferences: nextPrefs, preferences_set: true })
      .eq('id', context.scout.id)
      .select('scout_preferences')
      .single();
    if (error) throw error;
    res.json({ discoveryPreferences, scoutPreferences: data.scout_preferences });
  } catch (error) {
    console.error('[Scout V9 preferences]', error);
    res.status(500).json({ error: 'Search preferences could not be saved.' });
  }
});

router.post('/team/invite', async (req, res) => {
  let insertedScoutId = null;
  try {
    const context = await loadContext(req.user.id);
    if (!context.scout.is_super_user) {
      return res.status(403).json({ error: 'Only the Scout workspace owner can invite another Scout.' });
    }
    if (!context.scout.scout_team_id || !context.team) {
      return res.status(409).json({ error: 'This account is not attached to a shared Scout team.' });
    }

    const seats = await seatSnapshot(context);
    if (seats.remaining <= 0) {
      return res.status(409).json({
        error: `${seats.plan} includes ${seats.limit} Scout seat${seats.limit === 1 ? '' : 's'}, and all seats are currently in use.`,
        seats
      });
    }

    const firstName = clean(req.body.firstName, 100);
    const lastName = clean(req.body.lastName, 100);
    const emailAddr = cleanEmail(req.body.emailAddr || req.body.email);
    const phone = clean(req.body.phone, 60);
    if (!firstName || !lastName || !emailAddr) {
      return res.status(400).json({ error: 'First name, last name and a valid email address are required.' });
    }

    for (const table of ['scouts', 'coaches', 'players', 'stratex']) {
      const { data, error } = await supabase.from(table).select('id').eq('email', emailAddr).maybeSingle();
      if (error) throw error;
      if (data) {
        return res.status(409).json({
          error: table === 'scouts'
            ? 'A Scout with this email already exists.'
            : 'This email is already registered on ScoutLink.'
        });
      }
    }

    if (phone) {
      const { data, error } = await supabase.from('scouts').select('id').eq('phone', phone).maybeSingle();
      if (error) throw error;
      if (data) return res.status(409).json({ error: 'This phone number is already registered.' });
    }

    const loginCode = await ensureUniqueLoginCode();
    const { plan, limits } = limitsForContext(context);
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const { data: newScout, error } = await supabase
      .from('scouts')
      .insert({
        scout_id: generateId('SCT'),
        first_name: firstName,
        last_name: lastName,
        email: emailAddr,
        phone: phone || null,
        club_name: context.team.team_name || context.team.club_name || context.scout.club_name || null,
        scout_team_id: context.scout.scout_team_id,
        login_code: loginCode,
        login_code_expires: expires,
        is_active: true,
        preferences_set: false,
        is_super_user: false,
        registration_complete: false,
        subscription_plan: plan,
        plan_start: new Date(),
        plan_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        exports_remaining: Number(limits.exports) || 0,
        predictions_remaining: Number(limits.predictions) || 0,
        interests_remaining: Number(limits.interests) || 0,
        ...demoWriteFields(req)
      })
      .select()
      .single();
    if (error) throw error;
    insertedScoutId = newScout.id;

    const baseUrl = config.brandUrl || 'https://scoutlink.app';
    const completeLink = `${baseUrl}/confirm-password?code=${encodeURIComponent(loginCode)}&email=${encodeURIComponent(emailAddr)}&type=Scout`;
    const emailResult = isDemoSession(req)
      ? { success: true, template: 'demo-no-email' }
      : await emailService.sendCompleteSignup({
          to: emailAddr,
          email: emailAddr,
          firstName,
          loginCode,
          accountType: 'Scout',
          completeLink
        }).catch(errorValue => ({ success: false, error: errorValue.message }));

    if (!emailResult || !emailResult.success) {
      await supabase.from('scouts').delete().eq('id', newScout.id);
      insertedScoutId = null;
      return res.status(502).json({ error: 'The Scout invite email could not be sent, so the seat was not consumed.' });
    }

    const nextSeats = await seatSnapshot(context);
    res.status(201).json({
      message: 'Scout invited. A secure setup email has been sent.',
      scout: {
        id: newScout.id,
        first_name: newScout.first_name,
        last_name: newScout.last_name,
        email: newScout.email,
        registration_complete: newScout.registration_complete,
        is_super_user: false
      },
      seats: nextSeats
    });
  } catch (error) {
    if (insertedScoutId) {
      await supabase.from('scouts').delete().eq('id', insertedScoutId).catch(() => {});
    }
    console.error('[Scout V9 invite]', error);
    res.status(error.status || 500).json({ error: error.message || 'Scout invite could not be created.' });
  }
});

router.delete('/team/scouts/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    if (!context.scout.is_super_user) {
      return res.status(403).json({ error: 'Only the Scout workspace owner can remove a Scout.' });
    }
    if (String(req.params.id) === String(context.scout.id)) {
      return res.status(400).json({ error: 'You cannot remove your own Scout account from the workspace.' });
    }

    const { data: target, error } = await supabase
      .from('scouts')
      .select('id,scout_team_id,is_super_user,first_name,last_name,email')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!target || target.scout_team_id !== context.scout.scout_team_id) {
      return res.status(404).json({ error: 'Scout is not part of this workspace.' });
    }
    if (target.is_super_user) {
      return res.status(400).json({ error: 'The workspace owner cannot be removed.' });
    }

    const { error: updateError } = await supabase
      .from('scouts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', target.id);
    if (updateError) throw updateError;

    res.json({
      message: `${scoutName(target)} was removed from the Scout workspace.`,
      seats: await seatSnapshot(context)
    });
  } catch (error) {
    console.error('[Scout V9 remove Scout]', error);
    res.status(error.status || 500).json({ error: error.message || 'Scout could not be removed.' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (!currentPassword) return res.status(400).json({ error: 'Current password is required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const { data: scout, error } = await supabase
      .from('scouts')
      .select('id,password_hash')
      .eq('id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!scout?.password_hash || !(await verifyPassword(currentPassword, scout.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const password_hash = await hashPassword(newPassword);
    const { error: updateError } = await supabase
      .from('scouts')
      .update({ password_hash, registration_complete: true, updated_at: new Date().toISOString() })
      .eq('id', scout.id);
    if (updateError) throw updateError;
    res.json({ message: 'Password updated.' });
  } catch (error) {
    console.error('[Scout V9 password]', error);
    res.status(500).json({ error: 'Password could not be updated.' });
  }
});

module.exports = router;
