'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { applyRealDataFilter } = require('../utils/demo');

const COACH_ONLY = [requireAuth, requireRole('Coach')];
const PUBLIC_COACH_DEMO_TEAM = 'Northgate United (Demo)';

const DEFAULT_NOTIFICATION_PREFERENCES = {
  scout_interest: { in_app:true, email:true, urgent_only:false },
  scout_message: { in_app:true, email:true, urgent_only:false },
  fixture_attendance: { in_app:true, email:true, urgent_only:false },
  match_facts_reminder: { in_app:true, email:false, urgent_only:false },
  video_upload: { in_app:true, email:true, urgent_only:false },
  safeguarding: { in_app:true, email:true, always_on:true },
  product_updates: { in_app:true, email:false, urgent_only:false },
  account_system: { in_app:true, email:true, always_on:true }
};

function rows(result) {
  if (!result) return [];
  return Array.isArray(result.data) ? result.data : [];
}

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function cleanAgeGroups(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(
    list
      .map(item => String(item || '').trim().toUpperCase())
      .filter(item => /^U(?:[7-9]|1[0-6])$/.test(item))
  ));
}

async function coachContext(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select([
      'id','first_name','last_name','email','phone',
      'team_id','team_name','team_county','team_league',
      'team_age_groups','team_home_venue','team_website',
      'team_contact_email','role_at_club','is_super_user',
      'registration_complete','notification_preferences','is_demo'
    ].join(','))
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Coach not found', 404);
  return data;
}

function scopePlayers(query, coach) {
  if (coach.is_super_user) {
    if (coach.team_id) return query.eq('team_id', coach.team_id);
    if (coach.team_name) return query.eq('team_name', coach.team_name);
  }
  return query.eq('assigned_coach_id', coach.id);
}

function scopeTeam(query, coach) {
  if (coach.team_id) return query.eq('team_id', coach.team_id);
  return query.eq('coach_id', coach.id);
}

async function visiblePlayers(req, coach) {
  let query = supabase
    .from('players')
    .select([
      'id','first_name','last_name','age_group','position_group',
      'specific_position','primary_position','alternative_positions','foot',
      'height_category','height_range_cm','build_category','weight_range_kg',
      'assigned_coach_id','team_id','team_name','overall_rating','transfer_value',
      'appearances','goals','assists','clean_sheets','availability',
      'attribute_ratings','scoring_result','scored_at','created_at','is_active'
    ].join(','))
    .eq('is_active', true)
    .order('last_name');

  query = applyRealDataFilter(query, req);
  query = scopePlayers(query, coach);

  const result = await query;
  if (result.error) throw result.error;
  return rows(result);
}

async function scoutDirectory(ids) {
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from('scouts')
    .select('id,first_name,last_name,club_name,club_league')
    .in('id', ids);

  if (error) throw error;

  return (data || []).reduce((result, scout) => {
    result[scout.id] = scout;
    return result;
  }, {});
}

function normalisePreferences(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};

  const next = {};

  Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).forEach(key => {
    const defaults = DEFAULT_NOTIFICATION_PREFERENCES[key];
    const incoming = raw[key] && typeof raw[key] === 'object'
      ? raw[key]
      : {};

    next[key] = {
      in_app: defaults.always_on
        ? true
        : (incoming.in_app === undefined ? defaults.in_app : !!incoming.in_app),
      email: defaults.always_on
        ? true
        : (incoming.email === undefined ? defaults.email : !!incoming.email)
    };

    if (defaults.always_on) {
      next[key].always_on = true;
    } else {
      next[key].urgent_only = incoming.urgent_only === undefined
        ? !!defaults.urgent_only
        : !!incoming.urgent_only;
    }
  });

  return next;
}

/*
 * The current V6 Settings UI intentionally has four simple toggles. Keep that
 * user-facing shape while storing the richer canonical preference object.
 */
function uiPreferences(canonicalValue) {
  const value = normalisePreferences(canonicalValue);

  return {
    scout_activity: {
      inApp:
        value.scout_interest.in_app !== false &&
        value.fixture_attendance.in_app !== false
    },
    messages: {
      inApp: value.scout_message.in_app !== false
    },
    evidence_review: {
      inApp: value.video_upload.in_app !== false
    },
    weekly_summary: {
      email: value.product_updates.email === true
    }
  };
}

function applyPreferenceInput(existingValue, incomingValue) {
  const existing = normalisePreferences(existingValue);
  const incoming =
    incomingValue && typeof incomingValue === 'object' && !Array.isArray(incomingValue)
      ? incomingValue
      : {};

  const hasUiShape =
    Object.prototype.hasOwnProperty.call(incoming, 'scout_activity') ||
    Object.prototype.hasOwnProperty.call(incoming, 'messages') ||
    Object.prototype.hasOwnProperty.call(incoming, 'evidence_review') ||
    Object.prototype.hasOwnProperty.call(incoming, 'weekly_summary');

  if (!hasUiShape) {
    return normalisePreferences({
      ...existing,
      ...incoming
    });
  }

  const next = JSON.parse(JSON.stringify(existing));

  if (incoming.scout_activity) {
    const on = incoming.scout_activity.inApp !== false;
    next.scout_interest.in_app = on;
    next.fixture_attendance.in_app = on;
  }

  if (incoming.messages) {
    next.scout_message.in_app = incoming.messages.inApp !== false;
  }

  if (incoming.evidence_review) {
    next.video_upload.in_app = incoming.evidence_review.inApp !== false;
  }

  if (incoming.weekly_summary) {
    next.product_updates.email = incoming.weekly_summary.email === true;
  }

  return normalisePreferences(next);
}

async function publicDemoCoach() {
  const { data, error } = await supabase
    .from('coaches')
    .select([
      'id','first_name','last_name','email','phone',
      'team_id','team_name','team_county','team_league',
      'team_age_groups','team_home_venue','team_website',
      'team_contact_email','role_at_club','is_super_user',
      'registration_complete','notification_preferences'
    ].join(','))
    .eq('is_demo', true)
    .eq('is_active', true)
    .eq('is_super_user', true)
    .eq('team_name', PUBLIC_COACH_DEMO_TEAM)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Public Coach demo workspace not found', 404);
  return data;
}

async function publicDemoPlayers(coach) {
  let query = supabase
    .from('players')
    .select([
      'id','player_id','first_name','last_name','age_group','position_group',
      'specific_position','primary_position','alternative_positions','foot',
      'height_category','height_range_cm','build_category','weight_range_kg',
      'assigned_coach_id','team_id','team_name','overall_rating','transfer_value',
      'appearances','goals','assists','clean_sheets','availability',
      'attribute_ratings','scoring_result','scored_at','created_at','is_active'
    ].join(','))
    .eq('is_demo', true)
    .eq('is_active', true)
    .order('overall_rating', { ascending:false });

  if (coach.team_id) query = query.eq('team_id', coach.team_id);
  else query = query.eq('team_name', coach.team_name);

  const result = await query;
  if (result.error) throw result.error;
  return rows(result);
}

async function workspaceSnapshot(coach, playerIds, demoMode) {
  let fixturesQuery = supabase
    .from('fixtures')
    .select([
      'id','team_id','coach_id','opponent','fixture_date','fixture_time',
      'venue','venue_address','venue_postcode','city','country',
      'home_or_away','format','notes','created_at'
    ].join(','))
    .order('fixture_date', { ascending:true });

  fixturesQuery = scopeTeam(fixturesQuery, coach);

  let videosQuery = supabase
    .from('player_videos')
    .select([
      'id','player_id','team_id','coach_id','title','category','description',
      'video_type','video_url','url','file_path','fixture_id',
      'moderation_status','moderation_reason','moderated_at',
      'created_at','uploaded_by_type'
    ].join(','))
    .order('created_at', { ascending:false });

  if (demoMode) {
    if (playerIds.length) videosQuery = videosQuery.in('player_id', playerIds);
    else videosQuery = videosQuery.eq('coach_id', coach.id);
  } else {
    videosQuery = coach.is_super_user && coach.team_id
      ? videosQuery.eq('team_id', coach.team_id)
      : videosQuery.eq('coach_id', coach.id);
  }

  let matchQuery = supabase
    .from('match_facts')
    .select([
      'id','player_id','fixture_id','team_id','coach_id','match_date',
      'opponent','result','minutes_played','goals','assists',
      'yellow_cards','red_cards','performance_score',
      'home_score','away_score','format','formation','confirmed',
      'position_played','role_played','events','player_positions',
      'ratings','attribute_ratings','created_at'
    ].join(','))
    .order('match_date', { ascending:false })
    .limit(demoMode ? 500 : 100);

  if (demoMode && playerIds.length) matchQuery = matchQuery.in('player_id', playerIds);
  else matchQuery = scopeTeam(matchQuery, coach);

  const [
    fixturesResult,
    videosResult,
    matchResult,
    threadsResult,
    notificationsResult
  ] = await Promise.all([
    fixturesQuery,
    videosQuery,
    matchQuery,
    supabase
      .from('chat_threads')
      .select('id,scout_id,coach_id,player_id,status,last_message_at,created_at')
      .eq('coach_id', coach.id)
      .order('last_message_at', { ascending:false }),
    supabase
      .from('notifications')
      .select('id,notification_type,title,body,data,is_read,created_at')
      .eq('recipient_id', coach.id)
      .order('created_at', { ascending:false })
      .limit(100)
  ]);

  for (const result of [
    fixturesResult,
    videosResult,
    matchResult,
    threadsResult,
    notificationsResult
  ]) {
    if (result?.error) throw result.error;
  }

  const fixtures = rows(fixturesResult);
  const videos = rows(videosResult);
  const matchFacts = rows(matchResult);
  const threads = rows(threadsResult);
  const notifications = rows(notificationsResult);

  let interest = [];
  if (playerIds.length) {
    const interestResult = await supabase
      .from('recruitment_pipeline')
      .select([
        'id','scout_id','player_id','stage','interest_level',
        'created_at','updated_at','interest_registered_at','is_active'
      ].join(','))
      .in('player_id', playerIds)
      .eq('is_active', true)
      .order('created_at', { ascending:false });

    if (interestResult.error) throw interestResult.error;
    interest = rows(interestResult);
  }

  const fixtureIds = fixtures.map(fixture => fixture.id);
  let attendance = [];

  if (fixtureIds.length) {
    const attendanceResult = await supabase
      .from('fixture_attendance')
      .select('id,fixture_id,scout_id,status,created_at')
      .in('fixture_id', fixtureIds)
      .order('created_at', { ascending:false });

    if (attendanceResult.error) throw attendanceResult.error;
    attendance = rows(attendanceResult);
  }

  const scoutIds = Array.from(new Set(
    interest.map(item => item.scout_id)
      .concat(attendance.map(item => item.scout_id))
      .concat(threads.map(item => item.scout_id))
      .filter(Boolean)
  ));

  return {
    fixtures,
    videos,
    matchFacts,
    threads,
    notifications,
    interest,
    attendance,
    scouts: await scoutDirectory(scoutIds)
  };
}

router.get('/public-demo', async (_req, res) => {
  try {
    const coach = await publicDemoCoach();
    const players = await publicDemoPlayers(coach);
    const snapshot = await workspaceSnapshot(
      coach,
      players.map(player => player.id),
      true
    );

    const [
      teamCoachesResult,
      messagesResult
    ] = await Promise.all([
      supabase
        .from('coaches')
        .select([
          'id','first_name','last_name','email','role_at_club',
          'is_super_user','team_id','team_name'
        ].join(','))
        .eq('is_demo', true)
        .eq('is_active', true)
        .eq('team_id', coach.team_id)
        .order('is_super_user', { ascending:false })
        .order('last_name'),
      snapshot.threads.length
        ? supabase
            .from('chat_messages')
            .select([
              'id','thread_id','sender_id','sender_type','body','is_read',
              'message_kind','reference_type','reference_id','metadata','created_at'
            ].join(','))
            .in('thread_id', snapshot.threads.map(thread => thread.id))
            .order('created_at', { ascending:true })
        : Promise.resolve({ data:[], error:null })
    ]);

    if (teamCoachesResult.error) throw teamCoachesResult.error;
    if (messagesResult.error) throw messagesResult.error;

    res.set('Cache-Control', 'public, max-age=15, s-maxage=60');

    res.json({
      coach,
      teamCoaches: rows(teamCoachesResult),
      players,
      fixtures: snapshot.fixtures,
      attendance: snapshot.attendance,
      videos: snapshot.videos,
      matchFacts: snapshot.matchFacts,
      threads: snapshot.threads,
      chatMessages: rows(messagesResult),
      notifications: snapshot.notifications,
      interest: snapshot.interest,
      scouts: snapshot.scouts,
      notificationPreferences: uiPreferences(coach.notification_preferences),
      canonicalNotificationPreferences: normalisePreferences(coach.notification_preferences),
      demo: true,
      teamName: coach.team_name
    });
  } catch (error) {
    console.error('[CoachExperience public demo]', error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Could not load public Coach demo data'
    });
  }
});

router.get('/overview', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const players = await visiblePlayers(req, coach);
    const snapshot = await workspaceSnapshot(
      coach,
      players.map(player => player.id),
      false
    );

    res.json({
      coach,
      players,
      fixtures: snapshot.fixtures,
      attendance: snapshot.attendance,
      videos: snapshot.videos,
      matchFacts: snapshot.matchFacts,
      threads: snapshot.threads,
      notifications: snapshot.notifications,
      interest: snapshot.interest,
      scouts: snapshot.scouts
    });
  } catch (error) {
    console.error('[CoachExperience overview]', error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Could not load coach experience data'
    });
  }
});

router.get('/fixtures/:id', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);

    const { data: fixture, error } = await supabase
      .from('fixtures')
      .select([
        'id','team_id','coach_id','opponent','fixture_date','fixture_time',
        'venue','venue_address','venue_postcode','city','country',
        'home_or_away','format','notes','created_at'
      ].join(','))
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!fixture) return res.status(404).json({ error:'Fixture not found' });

    const allowed =
      (coach.team_id && String(fixture.team_id) === String(coach.team_id)) ||
      String(fixture.coach_id) === String(coach.id);

    if (!allowed) {
      return res.status(403).json({ error:'Fixture is not in your workspace' });
    }

    const [attendanceResult, videosResult, matchResult] = await Promise.all([
      supabase
        .from('fixture_attendance')
        .select('id,fixture_id,scout_id,status,created_at')
        .eq('fixture_id', fixture.id),
      supabase
        .from('player_videos')
        .select('id,player_id,title,category,moderation_status,fixture_id,created_at')
        .eq('fixture_id', fixture.id)
        .order('created_at', { ascending:false }),
      supabase
        .from('match_facts')
        .select([
          'id','player_id','fixture_id','match_date','opponent',
          'home_score','away_score','format','formation','confirmed',
          'performance_score','created_at'
        ].join(','))
        .eq('fixture_id', fixture.id)
        .order('created_at', { ascending:false })
    ]);

    for (const result of [attendanceResult, videosResult, matchResult]) {
      if (result.error) throw result.error;
    }

    const attendance = rows(attendanceResult);
    const scouts = await scoutDirectory(
      Array.from(new Set(attendance.map(item => item.scout_id).filter(Boolean)))
    );

    res.json({
      fixture,
      attendance,
      scouts,
      videos: rows(videosResult),
      matchFacts: rows(matchResult)
    });
  } catch (error) {
    console.error('[CoachExperience fixture]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not load fixture detail'
    });
  }
});

router.get('/players/:id/activity', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const players = await visiblePlayers(req, coach);
    const player = players.find(
      item => String(item.id) === String(req.params.id)
    );

    if (!player) {
      return res.status(404).json({
        error:'Player not found in your workspace'
      });
    }

    const [interestResult, threadsResult, videosResult] = await Promise.all([
      supabase
        .from('recruitment_pipeline')
        .select([
          'id','scout_id','player_id','stage','interest_level',
          'created_at','updated_at','interest_registered_at','is_active'
        ].join(','))
        .eq('player_id', player.id)
        .eq('is_active', true)
        .order('created_at', { ascending:false }),
      supabase
        .from('chat_threads')
        .select('id,scout_id,coach_id,player_id,status,last_message_at,created_at')
        .eq('coach_id', coach.id)
        .eq('player_id', player.id)
        .order('last_message_at', { ascending:false }),
      supabase
        .from('player_videos')
        .select([
          'id','player_id','title','category','description','video_type',
          'video_url','url','file_path','fixture_id','moderation_status',
          'moderation_reason','moderated_at','created_at'
        ].join(','))
        .eq('player_id', player.id)
        .order('created_at', { ascending:false })
    ]);

    for (const result of [interestResult, threadsResult, videosResult]) {
      if (result.error) throw result.error;
    }

    const interest = rows(interestResult);
    const threads = rows(threadsResult);
    const scouts = await scoutDirectory(
      Array.from(new Set(
        interest.map(item => item.scout_id)
          .concat(threads.map(item => item.scout_id))
          .filter(Boolean)
      ))
    );

    res.json({
      player,
      interest,
      threads,
      videos: rows(videosResult),
      scouts
    });
  } catch (error) {
    console.error('[CoachExperience player activity]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not load player activity'
    });
  }
});

router.get('/last-lineup', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);

    let query = supabase
      .from('match_facts')
      .select([
        'id','fixture_id','match_date','opponent','format','formation',
        'player_positions','ratings','events','confirmed'
      ].join(','))
      .eq('confirmed', true)
      .order('match_date', { ascending:false })
      .limit(1);

    query = scopeTeam(query, coach);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ match:(data || [])[0] || null });
  } catch (error) {
    console.error('[CoachExperience last-lineup]', error);
    res.status(500).json({ error:'Could not load the last line-up' });
  }
});

router.get('/notification-preferences', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const canonical = normalisePreferences(coach.notification_preferences);

    res.json({
      preferences: uiPreferences(canonical),
      canonicalPreferences: canonical
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Could not load notification preferences'
    });
  }
});

router.put('/notification-preferences', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const canonical = applyPreferenceInput(
      coach.notification_preferences,
      req.body && req.body.preferences
    );

    const { data, error } = await supabase
      .from('coaches')
      .update({
        notification_preferences: canonical,
        updated_at: new Date().toISOString()
      })
      .eq('id', coach.id)
      .select('notification_preferences')
      .single();

    if (error) throw error;

    const saved = normalisePreferences(data.notification_preferences);

    res.json({
      preferences: uiPreferences(saved),
      canonicalPreferences: saved
    });
  } catch (error) {
    console.error('[CoachExperience preferences]', error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : 'Could not save notification preferences'
    });
  }
});

router.put('/team-settings', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);

    if (!coach.is_super_user) {
      return res.status(403).json({
        error:'Only the Head Coach can change team settings.'
      });
    }

    const body = req.body || {};
    const supplied = key => Object.prototype.hasOwnProperty.call(body, key);
    const ageGroups = supplied('teamAgeGroups')
      ? cleanAgeGroups(body.teamAgeGroups)
      : (Array.isArray(coach.team_age_groups) ? coach.team_age_groups : []);

    const patch = {
      team_name: supplied('teamName')
        ? (cleanText(body.teamName, 240) || coach.team_name || null)
        : (coach.team_name || null),
      team_age_groups: ageGroups,
      team_league: supplied('teamLeague')
        ? (cleanText(body.teamLeague, 240) || null)
        : (coach.team_league || null),
      team_county: supplied('teamCounty')
        ? (cleanText(body.teamCounty, 160) || null)
        : (coach.team_county || null),
      team_home_venue: supplied('teamHomeVenue')
        ? (cleanText(body.teamHomeVenue, 500) || null)
        : (coach.team_home_venue || null),
      team_website: supplied('teamWebsite')
        ? (cleanText(body.teamWebsite, 500) || null)
        : (coach.team_website || null),
      team_contact_email: supplied('teamContactEmail')
        ? (cleanText(body.teamContactEmail, 240).toLowerCase() || null)
        : (coach.team_contact_email || null),
      updated_at: new Date().toISOString()
    };

    if (coach.team_id) {
      /*
       * Canonical team record first.
       */
      const canonicalPatch = {
        team_name: patch.team_name,
        county: patch.team_county,
        league: patch.team_league,
        league_name: patch.team_league,
        team_website_url: patch.team_website,
        contact_email: patch.team_contact_email
      };

      const { error: canonicalError } = await supabase
        .from('school_academy_teams')
        .update(canonicalPatch)
        .eq('id', coach.team_id);
      if (canonicalError) throw canonicalError;

      /*
       * Keep existing denormalised Coach and Player labels aligned with the
       * canonical team record so older screens do not show stale names.
       */
      const [coachesUpdate, playersUpdate] = await Promise.all([
        supabase
          .from('coaches')
          .update(patch)
          .eq('team_id', coach.team_id),
        supabase
          .from('players')
          .update({
            team_name: patch.team_name,
            updated_at: new Date().toISOString()
          })
          .eq('team_id', coach.team_id)
      ]);

      if (coachesUpdate.error) throw coachesUpdate.error;
      if (playersUpdate.error) throw playersUpdate.error;
    } else {
      const { error } = await supabase
        .from('coaches')
        .update(patch)
        .eq('id', coach.id);
      if (error) throw error;
    }

    res.json({ coach:await coachContext(coach.id) });
  } catch (error) {
    console.error('[CoachExperience team settings]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not save team settings'
    });
  }
});

router.post('/players/bulk-availability', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const ids = Array.isArray(req.body?.playerIds)
      ? req.body.playerIds.filter(Boolean)
      : [];
    const availability = cleanText(req.body?.availability, 80);

    if (!ids.length) {
      return res.status(400).json({ error:'Choose at least one player.' });
    }

    const allowedValues = [
      'Available',
      'Injured',
      'Unavailable',
      'Suspended',
      'Left the club'
    ];

    if (!allowedValues.includes(availability)) {
      return res.status(400).json({ error:'Invalid availability value.' });
    }

    const visible = await visiblePlayers(req, coach);
    const allowed = new Set(visible.map(player => String(player.id)));

    if (ids.some(id => !allowed.has(String(id)))) {
      return res.status(403).json({
        error:'One or more players are outside your workspace.'
      });
    }

    const { error } = await supabase
      .from('players')
      .update({
        availability,
        updated_at:new Date().toISOString()
      })
      .in('id', ids);

    if (error) throw error;

    res.json({
      updated:ids.length,
      availability
    });
  } catch (error) {
    console.error('[CoachExperience availability]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not update availability'
    });
  }
});

router.post('/players/bulk-archive', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);

    if (!coach.is_super_user) {
      return res.status(403).json({
        error:'Only the Head Coach can archive players.'
      });
    }

    const ids = Array.isArray(req.body?.playerIds)
      ? req.body.playerIds.filter(Boolean)
      : [];

    if (!ids.length) {
      return res.status(400).json({ error:'Choose at least one player.' });
    }

    const visible = await visiblePlayers(req, coach);
    const allowed = new Set(visible.map(player => String(player.id)));

    if (ids.some(id => !allowed.has(String(id)))) {
      return res.status(403).json({
        error:'One or more players are outside your workspace.'
      });
    }

    const stamp = new Date().toISOString();
    const reason =
      cleanText(req.body?.reason || 'Season archive', 240) ||
      'Season archive';

    const { error } = await supabase
      .from('players')
      .update({
        is_active:false,
        archived_at:stamp,
        archived_reason:reason,
        updated_at:stamp
      })
      .in('id', ids);

    if (error) throw error;

    res.json({ archived:ids.length });
  } catch (error) {
    console.error('[CoachExperience archive]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not archive players'
    });
  }
});

module.exports = router;
