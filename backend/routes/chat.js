'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

function displayName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(' ') || 'ScoutLink user';
}

async function assertThreadAccess(threadId, user) {
  const { data: thread, error } = await supabase
    .from('chat_threads')
    .select('*,players(id,first_name,last_name,team_name),scouts(id,first_name,last_name,club_name,email),coaches(id,first_name,last_name,team_name,email)')
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

router.get('/threads', requireAuth, requireRole('Scout','Coach'), async (req, res) => {
  try {
    let q = supabase
      .from('chat_threads')
      .select('*,players(id,first_name,last_name,team_name,specific_position,primary_position),scouts(id,first_name,last_name,club_name,email),coaches(id,first_name,last_name,team_name,email)')
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
    const { data: pipeline, error: pipeErr } = await supabase
      .from('recruitment_pipeline')
      .select('id,player_id,scout_id,is_active')
      .eq('scout_id', req.user.id)
      .eq('player_id', playerId)
      .eq('is_active', true)
      .maybeSingle();
    if (pipeErr) throw pipeErr;
    if (!pipeline) return res.status(403).json({ error: 'Add this player to your pipeline before messaging their coach.' });

    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('id,first_name,last_name,team_id,team_name,assigned_coach_id')
      .eq('id', playerId)
      .maybeSingle();
    if (playerErr) throw playerErr;
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const coach = await resolveCoachForPlayer(player);
    if (!coach) return res.status(404).json({ error: 'No coach is assigned to this player yet.' });

    const { data: existing } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('scout_id', req.user.id)
      .eq('coach_id', coach.id)
      .eq('player_id', playerId)
      .maybeSingle();
    if (existing) return res.json({ thread: existing, coach });

    const { data: thread, error } = await supabase.from('chat_threads').insert({
      scout_id: req.user.id,
      coach_id: coach.id,
      player_id: playerId,
      pipeline_id: pipeline.id,
      last_message_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
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
    res.status(201).json({ thread, coach });
  } catch(err) {
    console.error('[Chat create]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error', code: err.code || null, detail: err.message || null, dbDetail: err.details || null, hint: err.hint || null });
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
