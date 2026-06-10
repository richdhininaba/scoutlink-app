'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const THREAD_SELECT = '*,players(id,first_name,last_name,team_name,specific_position,primary_position),scouts(id,first_name,last_name,club_name,email),coaches(id,first_name,last_name,team_name,email)';

function displayName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(' ') || 'ScoutLink user';
}

async function assertThreadAccess(threadId, user) {
  const { data: thread, error } = await supabase
    .from('chat_threads')
    .select(THREAD_SELECT)
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  if (!thread) {
    const e = new Error('Chat thread not found');
    e.status = 404;
    throw e;
  }
  const allowed = (user.accountType === 'Scout' && thread.scout_id === user.id) ||
    (user.accountType === 'Coach' && thread.coach_id === user.id);
  if (!allowed) {
    const e = new Error('You cannot access this chat');
    e.status = 403;
    throw e;
  }
  return thread;
}

async function latestThreadForPair(scoutId, coachId) {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('scout_id', scoutId)
    .eq('coach_id', coachId)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data || [])[0] || null;
}

async function loadPipelinePlayer(scoutId, playerId) {
  const { data: pipeline, error } = await supabase
    .from('recruitment_pipeline')
    .select('id,player_id,scout_id,is_active,stage,players(id,first_name,last_name,team_id,team_name,assigned_coach_id,specific_position,primary_position,age_group,overall_rating,transfer_value)')
    .eq('scout_id', scoutId)
    .eq('player_id', playerId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return pipeline || null;
}

async function resolveCoachForPlayer(player) {
  if (player.assigned_coach_id) {
    const { data } = await supabase.from('coaches').select('id,first_name,last_name,team_name,email').eq('id', player.assigned_coach_id).maybeSingle();
    if (data) return data;
  }
  let q = supabase.from('coaches').select('id,first_name,last_name,team_name,email,is_super_user').eq('is_active', true);
  if (player.team_id) q = q.eq('team_id', player.team_id);
  else if (player.team_name) q = q.eq('team_name', player.team_name);
  const { data } = await q.order('is_super_user', { ascending: false }).limit(1);
  return (data || [])[0] || null;
}

function shareBody(type, meta) {
  if (type === 'player') return 'Shared player: ' + (meta.playerName || 'Player') + (meta.position ? ' (' + meta.position + ')' : '');
  if (type === 'fixture') return 'Shared fixture: ' + (meta.opponent || 'Fixture') + (meta.fixtureDate ? ' on ' + meta.fixtureDate : '');
  if (type === 'prediction') return 'Shared prediction: ' + (meta.predictionType || 'Prediction') + (meta.playerName ? ' for ' + meta.playerName : '');
  return 'Shared ScoutLink item';
}

async function createShareMessage(thread, user, type, referenceId, meta, dedupe = false) {
  if (dedupe) {
    const { data: existing } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('thread_id', thread.id)
      .eq('message_kind', 'share')
      .eq('reference_type', type)
      .eq('reference_id', referenceId)
      .limit(1);
    if ((existing || []).length) return existing[0];
  }
  const { data: message, error } = await supabase.from('chat_messages').insert({
    thread_id: thread.id,
    sender_id: user.id,
    sender_type: user.accountType,
    body: shareBody(type, meta),
    message_kind: 'share',
    reference_type: type,
    reference_id: referenceId,
    metadata: meta || {}
  }).select().single();
  if (error) throw error;
  await supabase.from('chat_threads').update({ last_message_at: message.created_at, updated_at: message.created_at }).eq('id', thread.id);
  return message;
}

async function validatePlayerShare(thread, scoutId, playerId) {
  const pipeline = await loadPipelinePlayer(scoutId, playerId);
  if (!pipeline || !pipeline.players) {
    const e = new Error('Add this player to your pipeline before sharing them.');
    e.status = 403;
    throw e;
  }
  const coach = await resolveCoachForPlayer(pipeline.players);
  if (!coach || coach.id !== thread.coach_id) {
    const e = new Error('This player is not assigned to the coach in this chat.');
    e.status = 403;
    throw e;
  }
  const p = pipeline.players;
  return {
    playerId: p.id,
    playerName: displayName(p),
    teamName: p.team_name || '',
    position: p.specific_position || p.primary_position || '',
    ageGroup: p.age_group || '',
    stage: pipeline.stage || 'watching',
    overall: p.overall_rating || null,
    transferValue: p.transfer_value || null,
    profileUrl: '/player/profile?id=' + p.id
  };
}

async function validateFixtureShare(thread, scoutId, fixtureId) {
  const { data: fixture, error } = await supabase.from('fixtures').select('*').eq('id', fixtureId).maybeSingle();
  if (error) throw error;
  if (!fixture) {
    const e = new Error('Fixture not found');
    e.status = 404;
    throw e;
  }
  const { data: pipeline } = await supabase
    .from('recruitment_pipeline')
    .select('players(id,team_id,assigned_coach_id,first_name,last_name)')
    .eq('scout_id', scoutId)
    .eq('is_active', true)
    .limit(100);
  const eligible = (pipeline || []).some(row => {
    const p = row.players || {};
    return p.team_id === fixture.team_id && (!fixture.coach_id || fixture.coach_id === thread.coach_id || p.assigned_coach_id === thread.coach_id);
  });
  if (!eligible) {
    const e = new Error('You can only share fixtures connected to players in your pipeline.');
    e.status = 403;
    throw e;
  }
  return {
    fixtureId: fixture.id,
    opponent: fixture.opponent || 'Fixture',
    fixtureDate: fixture.fixture_date || '',
    fixtureTime: fixture.fixture_time || '',
    venue: fixture.venue || '',
    city: fixture.city || '',
    homeOrAway: fixture.home_or_away || '',
    format: fixture.format || ''
  };
}

async function validatePredictionShare(thread, scoutId, predictionId) {
  const { data: log, error } = await supabase
    .from('predictions_log')
    .select('id,player_id,prediction_type,result,run_at,players(id,first_name,last_name,assigned_coach_id,team_name,specific_position,primary_position)')
    .eq('id', predictionId)
    .eq('scout_id', scoutId)
    .maybeSingle();
  if (error) throw error;
  if (!log) {
    const e = new Error('Prediction not found. Run the prediction before sharing it.');
    e.status = 404;
    throw e;
  }
  const player = log.players || {};
  const coach = await resolveCoachForPlayer(player);
  if (!coach || coach.id !== thread.coach_id) {
    const e = new Error('This prediction is not connected to the coach in this chat.');
    e.status = 403;
    throw e;
  }
  const summary = log.result?.summary || (Array.isArray(log.result?.paragraphs) ? log.result.paragraphs[0] : '');
  return {
    predictionId: log.id,
    playerId: log.player_id,
    playerName: displayName(player),
    predictionType: log.prediction_type || 'Prediction',
    summary: summary || '',
    runAt: log.run_at || '',
    profileUrl: '/player/profile?id=' + log.player_id
  };
}

router.get('/threads', requireAuth, requireRole('Scout','Coach'), async (req, res) => {
  try {
    let q = supabase
      .from('chat_threads')
      .select(THREAD_SELECT)
      .order('updated_at', { ascending: false });
    q = req.user.accountType === 'Scout' ? q.eq('scout_id', req.user.id) : q.eq('coach_id', req.user.id);
    const { data, error } = await q.limit(100);
    if (error) throw error;
    const ids = (data || []).map(t => t.id);
    const unreadByThread = {};
    if (ids.length) {
      const { data: unread } = await supabase
        .from('chat_messages')
        .select('thread_id')
        .in('thread_id', ids)
        .neq('sender_id', req.user.id)
        .eq('is_read', false);
      (unread || []).forEach(m => { unreadByThread[m.thread_id] = (unreadByThread[m.thread_id] || 0) + 1; });
    }
    res.json({ data: (data || []).map(t => ({ ...t, unreadCount: unreadByThread[t.id] || 0 })) });
  } catch(err) {
    console.error('[Chat threads]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

router.post('/threads', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const pipeline = await loadPipelinePlayer(req.user.id, playerId);
    if (!pipeline) return res.status(403).json({ error: 'Add this player to your pipeline before messaging their coach.' });

    const player = pipeline.players;
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const coach = await resolveCoachForPlayer(player);
    if (!coach) return res.status(404).json({ error: 'No coach is assigned to this player yet.' });

    const existing = await latestThreadForPair(req.user.id, coach.id);
    if (existing) {
      await supabase.from('chat_threads').update({
        player_id: playerId,
        pipeline_id: pipeline.id,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);
      const meta = await validatePlayerShare(existing, req.user.id, playerId);
      await createShareMessage(existing, req.user, 'player', playerId, meta, true);
      return res.json({ thread: { ...existing, player_id: playerId, pipeline_id: pipeline.id }, coach, sharedPlayer: meta });
    }

    const { data: thread, error } = await supabase.from('chat_threads').insert({
      scout_id: req.user.id,
      coach_id: coach.id,
      player_id: playerId,
      pipeline_id: pipeline.id,
      last_message_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    const meta = await validatePlayerShare(thread, req.user.id, playerId);
    await createShareMessage(thread, req.user, 'player', playerId, meta, true);
    try {
      const { error: notifErr } = await supabase.from('notifications').insert({
        recipient_id: coach.id,
        recipient_type: 'Coach',
        notification_type: 'chat_started',
        title: 'New scout chat',
        body: 'A scout opened a chat about ' + displayName(player) + '.',
        data: { threadId: thread.id, playerId }
      });
      if (notifErr) console.warn('[Chat notification skipped]', notifErr.message);
    } catch(notifErr) {
      console.warn('[Chat notification skipped]', notifErr.message);
    }
    res.status(201).json({ thread, coach, sharedPlayer: meta });
  } catch(err) {
    console.error('[Chat create]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

router.post('/threads/:id/share', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const thread = await assertThreadAccess(req.params.id, req.user);
    const type = String(req.body.type || '').toLowerCase();
    const referenceId = req.body.referenceId;
    if (!['player','fixture','prediction'].includes(type) || !referenceId) {
      return res.status(400).json({ error: 'type and referenceId are required' });
    }
    let meta;
    if (type === 'player') meta = await validatePlayerShare(thread, req.user.id, referenceId);
    else if (type === 'fixture') meta = await validateFixtureShare(thread, req.user.id, referenceId);
    else meta = await validatePredictionShare(thread, req.user.id, referenceId);
    const message = await createShareMessage(thread, req.user, type, referenceId, meta, false);
    res.status(201).json({ message, shared: meta });
  } catch(err) {
    console.error('[Chat share]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

router.get('/threads/:id/messages', requireAuth, requireRole('Scout','Coach'), async (req, res) => {
  try {
    const thread = await assertThreadAccess(req.params.id, req.user);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: true })
      .limit(300);
    if (error) throw error;
    await supabase.from('chat_messages').update({ is_read: true }).eq('thread_id', thread.id).neq('sender_id', req.user.id);
    res.json({ thread, data: data || [] });
  } catch(err) {
    console.error('[Chat messages]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

router.post('/threads/:id/messages', requireAuth, requireRole('Scout','Coach'), async (req, res) => {
  try {
    const thread = await assertThreadAccess(req.params.id, req.user);
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message cannot be blank' });
    const { data: message, error } = await supabase.from('chat_messages').insert({
      thread_id: thread.id,
      sender_id: req.user.id,
      sender_type: req.user.accountType,
      body
    }).select().single();
    if (error) throw error;
    await supabase.from('chat_threads').update({ last_message_at: message.created_at, updated_at: message.created_at }).eq('id', thread.id);
    const recipientId = req.user.accountType === 'Scout' ? thread.coach_id : thread.scout_id;
    const recipientType = req.user.accountType === 'Scout' ? 'Coach' : 'Scout';
    try {
      const { error: notifErr } = await supabase.from('notifications').insert({
        recipient_id: recipientId,
        recipient_type: recipientType,
        notification_type: 'chat_message',
        title: 'New ScoutLink message',
        body: 'New message about ' + displayName(thread.players) + '.',
        data: { threadId: thread.id, playerId: thread.player_id }
      });
      if (notifErr) console.warn('[Chat message notification skipped]', notifErr.message);
    } catch(notifErr) {
      console.warn('[Chat message notification skipped]', notifErr.message);
    }
    res.status(201).json({ message });
  } catch(err) {
    console.error('[Chat message]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

module.exports = router;
