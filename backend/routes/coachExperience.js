'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { applyRealDataFilter } = require('../utils/demo');

const COACH_ONLY = [requireAuth, requireRole('Coach')];

function rows(result) {
  if (!result) return [];
  return Array.isArray(result.data) ? result.data : [];
}

async function coachContext(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,first_name,last_name,email,team_id,team_name,team_county,team_league,team_age_groups,team_home_venue,team_website,team_contact_email,role_at_club,is_super_user,registration_complete,notification_preferences')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const e = new Error('Coach not found');
    e.status = 404;
    throw e;
  }
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
  let q = supabase
    .from('players')
    .select('id,first_name,last_name,age_group,position_group,specific_position,primary_position,alternative_positions,foot,height_category,height_range_cm,build_category,weight_range_kg,assigned_coach_id,team_id,team_name,overall_rating,transfer_value,appearances,goals,assists,clean_sheets,availability,attribute_ratings,scoring_result,scored_at,created_at,is_active')
    .eq('is_active', true)
    .order('last_name');
  q = applyRealDataFilter(q, req);
  q = scopePlayers(q, coach);
  const result = await q;
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
  return (data || []).reduce((acc, scout) => {
    acc[scout.id] = scout;
    return acc;
  }, {});
}

const PUBLIC_COACH_DEMO_TEAM = 'Northgate United (Demo)';

async function publicDemoCoach() {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,first_name,last_name,email,team_id,team_name,team_county,team_league,team_age_groups,team_home_venue,team_website,team_contact_email,role_at_club,is_super_user,registration_complete,notification_preferences')
    .eq('is_demo', true)
    .eq('is_active', true)
    .eq('is_super_user', true)
    .eq('team_name', PUBLIC_COACH_DEMO_TEAM)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const e = new Error('Public Coach demo workspace not found');
    e.status = 404;
    throw e;
  }
  return data;
}

async function publicDemoPlayers(coach) {
  let q = supabase
    .from('players')
    .select('id,player_id,first_name,last_name,age_group,position_group,specific_position,primary_position,alternative_positions,foot,height_category,height_range_cm,build_category,weight_range_kg,assigned_coach_id,team_id,team_name,overall_rating,transfer_value,appearances,goals,assists,clean_sheets,availability,attribute_ratings,scoring_result,scored_at,created_at,is_active')
    .eq('is_demo', true)
    .eq('is_active', true)
    .order('overall_rating', { ascending: false });
  if (coach.team_id) q = q.eq('team_id', coach.team_id);
  else q = q.eq('team_name', coach.team_name);
  const result = await q;
  if (result.error) throw result.error;
  return rows(result);
}

router.get('/public-demo', async (_req, res) => {
  try {
    const coach = await publicDemoCoach();
    const players = await publicDemoPlayers(coach);
    const playerIds = players.map(player => player.id);

    let fixturesQ = supabase
      .from('fixtures')
      .select('id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,venue_address,venue_postcode,city,country,home_or_away,format,notes,created_at')
      .order('fixture_date', { ascending: true });
    fixturesQ = scopeTeam(fixturesQ, coach);

    let videosQ = supabase
      .from('player_videos')
      .select('id,player_id,team_id,coach_id,title,category,description,video_type,video_url,url,file_path,fixture_id,moderation_status,moderation_reason,moderated_at,created_at,uploaded_by_type')
      .order('created_at', { ascending: false });
    if (playerIds.length) videosQ = videosQ.in('player_id', playerIds);
    else videosQ = videosQ.eq('coach_id', coach.id);

    let matchQ = supabase
      .from('match_facts')
      .select('id,player_id,fixture_id,team_id,coach_id,match_date,opponent,result,minutes_played,goals,assists,performance_score,home_score,away_score,format,formation,confirmed,position_played,role_played,events,player_positions,ratings,attribute_ratings,passes_attempted,passes_completed,progressive_passes,line_breaking_passes,progressive_carries,chances_created,take_ons_attempted,take_ons_completed,duels_attempted,duels_won,aerial_duels_attempted,aerial_duels_won,pressures,successful_pressures,recoveries,blocks,clearances,box_entries,box_touches,created_at')
      .order('match_date', { ascending: false })
      .limit(500);
    if (playerIds.length) matchQ = matchQ.in('player_id', playerIds);
    else matchQ = scopeTeam(matchQ, coach);

    const [fixturesR, videosR, matchR, threadsR, notificationsR, teamCoachesR] = await Promise.all([
      fixturesQ,
      videosQ,
      matchQ,
      supabase.from('chat_threads').select('id,scout_id,coach_id,player_id,status,last_message_at,created_at').eq('coach_id', coach.id).order('last_message_at', { ascending: false }),
      supabase.from('notifications').select('id,notification_type,title,body,data,is_read,created_at').eq('recipient_id', coach.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('coaches').select('id,first_name,last_name,email,role_at_club,is_super_user,team_id,team_name').eq('is_demo', true).eq('is_active', true).eq('team_id', coach.team_id).order('last_name')
    ]);
    for (const result of [fixturesR, videosR, matchR, threadsR, notificationsR, teamCoachesR]) {
      if (result && result.error) throw result.error;
    }

    const fixtures = rows(fixturesR);
    const videos = rows(videosR);
    const matchFacts = rows(matchR);
    const threads = rows(threadsR);
    const notifications = rows(notificationsR);
    const teamCoaches = rows(teamCoachesR);

    let interest = [];
    if (playerIds.length) {
      const interestR = await supabase
        .from('recruitment_pipeline')
        .select('id,scout_id,player_id,stage,interest_level,created_at,updated_at,interest_registered_at,is_active')
        .in('player_id', playerIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (interestR.error) throw interestR.error;
      interest = rows(interestR);
    }

    const fixtureIds = fixtures.map(fixture => fixture.id);
    let attendance = [];
    if (fixtureIds.length) {
      const attendanceR = await supabase
        .from('fixture_attendance')
        .select('id,fixture_id,scout_id,status,created_at')
        .in('fixture_id', fixtureIds)
        .order('created_at', { ascending: false });
      if (attendanceR.error) throw attendanceR.error;
      attendance = rows(attendanceR);
    }

    const threadIds = threads.map(thread => thread.id);
    let chatMessages = [];
    if (threadIds.length) {
      const messagesR = await supabase
        .from('chat_messages')
        .select('id,thread_id,sender_id,sender_type,body,is_read,message_kind,reference_type,reference_id,metadata,created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: true });
      if (messagesR.error) throw messagesR.error;
      chatMessages = rows(messagesR);
    }

    const scoutIds = Array.from(new Set(
      interest.map(item => item.scout_id)
        .concat(attendance.map(item => item.scout_id))
        .concat(threads.map(item => item.scout_id))
        .filter(Boolean)
    ));
    const scouts = await scoutDirectory(scoutIds);

    res.set('Cache-Control', 'public, max-age=15, s-maxage=60');
    res.json({
      coach,
      teamCoaches,
      players,
      fixtures,
      attendance,
      videos,
      matchFacts,
      threads,
      chatMessages,
      notifications,
      interest,
      scouts,
      notificationPreferences: normalisePreferences(coach.notification_preferences),
      demo: true,
      teamName: coach.team_name
    });
  } catch (err) {
    console.error('[CoachExperience public demo]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load public Coach demo data' });
  }
});

router.get('/overview', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const players = await visiblePlayers(req, coach);
    const playerIds = players.map(p => p.id);

    let fixturesQ = supabase
      .from('fixtures')
      .select('id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,venue_address,venue_postcode,city,country,home_or_away,format,notes,created_at')
      .order('fixture_date', { ascending: true });
    fixturesQ = scopeTeam(fixturesQ, coach);

    let videosQ = supabase
      .from('player_videos')
      .select('id,player_id,team_id,coach_id,title,category,description,video_type,video_url,url,file_path,fixture_id,moderation_status,moderation_reason,moderated_at,created_at,uploaded_by_type')
      .order('created_at', { ascending: false });
    videosQ = coach.is_super_user && coach.team_id ? videosQ.eq('team_id', coach.team_id) : videosQ.eq('coach_id', coach.id);

    let matchQ = supabase
      .from('match_facts')
      .select('id,player_id,fixture_id,team_id,coach_id,match_date,opponent,home_score,away_score,format,formation,confirmed,performance_score,player_positions,ratings,events,created_at')
      .order('match_date', { ascending: false })
      .limit(100);
    matchQ = scopeTeam(matchQ, coach);

    const promises = [
      fixturesQ,
      videosQ,
      matchQ,
      supabase.from('chat_threads').select('id,scout_id,coach_id,player_id,status,last_message_at,created_at').eq('coach_id', coach.id).order('last_message_at', { ascending: false }),
      supabase.from('notifications').select('id,notification_type,title,body,data,is_read,created_at').eq('recipient_id', coach.id).order('created_at', { ascending: false }).limit(100)
    ];

    if (playerIds.length) {
      promises.push(
        supabase
          .from('recruitment_pipeline')
          .select('id,scout_id,player_id,stage,interest_level,created_at,updated_at,interest_registered_at,is_active')
          .in('player_id', playerIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      );
    } else {
      promises.push(Promise.resolve({ data: [], error: null }));
    }

    const results = await Promise.all(promises);
    for (const result of results) if (result && result.error) throw result.error;

    const fixtures = rows(results[0]);
    const videos = rows(results[1]);
    const matches = rows(results[2]);
    const threads = rows(results[3]);
    const notifications = rows(results[4]);
    const pipeline = rows(results[5]);

    const fixtureIds = fixtures.map(f => f.id);
    let attendance = [];
    if (fixtureIds.length) {
      const attendanceResult = await supabase
        .from('fixture_attendance')
        .select('id,fixture_id,scout_id,status,created_at')
        .in('fixture_id', fixtureIds)
        .order('created_at', { ascending: false });
      if (attendanceResult.error) throw attendanceResult.error;
      attendance = rows(attendanceResult);
    }

    const scoutIds = Array.from(new Set(
      pipeline.map(x => x.scout_id)
        .concat(attendance.map(x => x.scout_id))
        .concat(threads.map(x => x.scout_id))
        .filter(Boolean)
    ));
    const scouts = await scoutDirectory(scoutIds);

    res.json({
      coach,
      players,
      fixtures,
      attendance,
      videos,
      matchFacts: matches,
      threads,
      notifications,
      interest: pipeline,
      scouts
    });
  } catch (err) {
    console.error('[CoachExperience overview]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load coach experience data' });
  }
});

router.get('/fixtures/:id', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const { data: fixture, error } = await supabase
      .from('fixtures')
      .select('id,team_id,coach_id,opponent,fixture_date,fixture_time,venue,venue_address,venue_postcode,city,country,home_or_away,format,notes,created_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!fixture) return res.status(404).json({ error: 'Fixture not found' });

    const allowed = (coach.team_id && fixture.team_id === coach.team_id) || fixture.coach_id === coach.id;
    if (!allowed) return res.status(403).json({ error: 'Fixture is not in your workspace' });

    const [attendanceR, videosR, matchR] = await Promise.all([
      supabase.from('fixture_attendance').select('id,fixture_id,scout_id,status,created_at').eq('fixture_id', fixture.id),
      supabase.from('player_videos').select('id,player_id,title,category,moderation_status,fixture_id,created_at').eq('fixture_id', fixture.id).order('created_at', { ascending: false }),
      supabase.from('match_facts').select('id,fixture_id,match_date,opponent,home_score,away_score,format,formation,confirmed,created_at').eq('fixture_id', fixture.id).order('created_at', { ascending: false })
    ]);
    for (const r of [attendanceR, videosR, matchR]) if (r.error) throw r.error;
    const attendance = rows(attendanceR);
    const scouts = await scoutDirectory(Array.from(new Set(attendance.map(a => a.scout_id).filter(Boolean))));
    res.json({ fixture, attendance, scouts, videos: rows(videosR), matchFacts: rows(matchR) });
  } catch (err) {
    console.error('[CoachExperience fixture]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load fixture detail' });
  }
});

router.get('/players/:id/activity', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const players = await visiblePlayers(req, coach);
    const player = players.find(p => String(p.id) === String(req.params.id));
    if (!player) return res.status(404).json({ error: 'Player not found in your workspace' });

    const [interestR, threadsR, videosR] = await Promise.all([
      supabase.from('recruitment_pipeline')
        .select('id,scout_id,player_id,stage,interest_level,created_at,updated_at,interest_registered_at,is_active')
        .eq('player_id', player.id).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('chat_threads')
        .select('id,scout_id,coach_id,player_id,status,last_message_at,created_at')
        .eq('coach_id', coach.id).eq('player_id', player.id).order('last_message_at', { ascending: false }),
      supabase.from('player_videos')
        .select('id,player_id,title,category,description,video_type,video_url,url,file_path,fixture_id,moderation_status,moderation_reason,moderated_at,created_at')
        .eq('player_id', player.id).order('created_at', { ascending: false })
    ]);
    for (const r of [interestR, threadsR, videosR]) if (r.error) throw r.error;

    const interest = rows(interestR);
    const threads = rows(threadsR);
    const scouts = await scoutDirectory(Array.from(new Set(
      interest.map(x => x.scout_id).concat(threads.map(x => x.scout_id)).filter(Boolean)
    )));
    res.json({ player, interest, threads, videos: rows(videosR), scouts });
  } catch (err) {
    console.error('[CoachExperience player activity]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load player activity' });
  }
});

router.get('/last-lineup', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    let q = supabase
      .from('match_facts')
      .select('id,fixture_id,match_date,opponent,format,formation,player_positions,ratings,events,confirmed')
      .eq('confirmed', true)
      .order('match_date', { ascending: false })
      .limit(1);
    q = scopeTeam(q, coach);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ match: (data || [])[0] || null });
  } catch (err) {
    console.error('[CoachExperience last-lineup]', err);
    res.status(500).json({ error: 'Could not load the last line-up' });
  }
});

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

function normalisePreferences(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const next = {};
  Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).forEach(key => {
    const defaults = DEFAULT_NOTIFICATION_PREFERENCES[key];
    const incoming = raw[key] && typeof raw[key] === 'object' ? raw[key] : {};
    next[key] = {
      in_app: defaults.always_on ? true : (incoming.in_app === undefined ? defaults.in_app : !!incoming.in_app),
      email: defaults.always_on ? true : (incoming.email === undefined ? defaults.email : !!incoming.email)
    };
    if (defaults.always_on) next[key].always_on = true;
    else next[key].urgent_only = incoming.urgent_only === undefined ? !!defaults.urgent_only : !!incoming.urgent_only;
  });
  return next;
}

router.get('/notification-preferences', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    res.json({ preferences: normalisePreferences(coach.notification_preferences) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load notification preferences' });
  }
});

router.put('/notification-preferences', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const next = normalisePreferences(req.body && req.body.preferences);
    const { data, error } = await supabase
      .from('coaches')
      .update({ notification_preferences: next, updated_at: new Date().toISOString() })
      .eq('id', coach.id)
      .select('notification_preferences')
      .single();
    if (error) throw error;
    res.json({ preferences: normalisePreferences(data.notification_preferences) });
  } catch (err) {
    console.error('[CoachExperience preferences]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save notification preferences' });
  }
});

router.put('/team-settings', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    if (!coach.is_super_user) return res.status(403).json({ error: 'Only the Head Coach can change team settings.' });
    const body = req.body || {};
    const ageGroups = Array.isArray(body.teamAgeGroups)
      ? body.teamAgeGroups
      : String(body.teamAgeGroups || '').split(',');
    const cleanAgeGroups = Array.from(new Set(ageGroups.map(v => String(v || '').trim().toUpperCase()).filter(v => /^U(?:[7-9]|1[0-6])$/.test(v))));
    const patch = {
      team_name: String(body.teamName || coach.team_name || '').trim().slice(0,240) || coach.team_name,
      team_age_groups: cleanAgeGroups,
      team_league: String(body.teamLeague || '').trim().slice(0,240) || null,
      team_county: String(body.teamCounty || '').trim().slice(0,160) || null,
      team_home_venue: String(body.teamHomeVenue || '').trim().slice(0,500) || null,
      team_website: String(body.teamWebsite || '').trim().slice(0,500) || null,
      team_contact_email: String(body.teamContactEmail || '').trim().toLowerCase().slice(0,240) || null,
      updated_at: new Date().toISOString()
    };
    let update = supabase.from('coaches').update(patch);
    if (coach.team_id) update = update.eq('team_id', coach.team_id);
    else update = update.eq('id', coach.id);
    const { error } = await update;
    if (error) throw error;
    const current = await coachContext(coach.id);
    res.json({ coach: current });
  } catch (err) {
    console.error('[CoachExperience team settings]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save team settings' });
  }
});

router.post('/players/bulk-availability', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    const ids = Array.isArray(req.body && req.body.playerIds) ? req.body.playerIds.filter(Boolean) : [];
    const availability = String(req.body && req.body.availability || '').trim();
    if (!ids.length) return res.status(400).json({ error: 'Choose at least one player.' });
    if (!['Available','Injured','Unavailable'].includes(availability)) return res.status(400).json({ error: 'Invalid availability value.' });
    const visible = await visiblePlayers(req, coach);
    const allowed = new Set(visible.map(p => String(p.id)));
    if (ids.some(id => !allowed.has(String(id)))) return res.status(403).json({ error: 'One or more players are outside your workspace.' });
    const { error } = await supabase.from('players').update({ availability, updated_at:new Date().toISOString() }).in('id', ids);
    if (error) throw error;
    res.json({ updated: ids.length, availability });
  } catch (err) {
    console.error('[CoachExperience availability]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not update availability' });
  }
});

router.post('/players/bulk-archive', ...COACH_ONLY, async (req, res) => {
  try {
    const coach = await coachContext(req.user.id);
    if (!coach.is_super_user) return res.status(403).json({ error: 'Only the Head Coach can archive players.' });
    const ids = Array.isArray(req.body && req.body.playerIds) ? req.body.playerIds.filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ error: 'Choose at least one player.' });
    const visible = await visiblePlayers(req, coach);
    const allowed = new Set(visible.map(p => String(p.id)));
    if (ids.some(id => !allowed.has(String(id)))) return res.status(403).json({ error: 'One or more players are outside your workspace.' });
    const stamp = new Date().toISOString();
    const reason = String(req.body && req.body.reason || 'Season archive').trim().slice(0,240);
    const { error } = await supabase.from('players').update({ is_active:false, archived_at:stamp, archived_reason:reason, updated_at:stamp }).in('id', ids);
    if (error) throw error;
    res.json({ archived:ids.length });
  } catch (err) {
    console.error('[CoachExperience archive]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not archive players' });
  }
});

module.exports = router;
