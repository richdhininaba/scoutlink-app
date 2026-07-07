'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { FILTERS, formatNotification } = require('../services/notifications');

const ROLE_MAP = {
  Player: 'Player',
  Coach: 'Coach',
  Scout: 'Scout',
  Stratex: 'Stratex'
};

function normalizeFilter(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'all') return 'all';
  if (['message', 'messages', 'chat', 'chat_message', 'chat_started', 'admin_message'].includes(raw)) return 'messages';
  if (['fixture', 'fixtures', 'event', 'events', 'fixture_attendance', 'showcase_event', 'fixtures_events'].includes(raw)) return 'fixtures_events';
  if (['scout-interest', 'scout_interest'].includes(raw)) return 'scout_interest';
  if (['match-fact', 'match-facts', 'match_fact'].includes(raw)) return 'match_fact';
  if (['recruitment', 'pipeline'].includes(raw)) return 'recruitment';
  return 'system';
}

function ownNotificationsQuery(req) {
  let q = supabase.from('notifications')
    .select('*', { count: 'exact' })
    .eq('recipient_id', req.user.id);
  const role = ROLE_MAP[req.user.accountType];
  if (role) q = q.eq('recipient_type', role);
  return q;
}

async function markAllForUser(req) {
  let q = supabase.from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', req.user.id)
    .eq('is_read', false);
  const role = ROLE_MAP[req.user.accountType];
  if (role) q = q.eq('recipient_type', role);
  const { error } = await q;
  if (error) throw error;
}

router.get('/', requireAuth, requireRole('Player', 'Coach', 'Scout', 'Stratex'), async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50) || 50));
    const unreadOnly = req.query.unreadOnly === 'true';
    const requestedFilter = normalizeFilter(req.query.filter || req.query.type);

    let q = ownNotificationsQuery(req);
    if (unreadOnly) q = q.eq('is_read', false);
    q = q.order('created_at', { ascending: false }).limit(limit);

    const [{ data, error, count }, unreadResult] = await Promise.all([
      q,
      ownNotificationsQuery(req).eq('is_read', false)
    ]);
    if (error) throw error;
    if (unreadResult.error) throw unreadResult.error;

    let rows = (data || []).map(formatNotification);
    if (requestedFilter !== 'all') rows = rows.filter((row) => row.filterGroup === requestedFilter);

    res.json({
      data: rows,
      total: count || rows.length,
      unreadCount: unreadResult.count || 0,
      filters: FILTERS
    });
  } catch (err) {
    console.error('[Notifications GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, requireRole('Player', 'Coach', 'Scout', 'Stratex'), async (req, res) => {
  try {
    const { data, error } = await ownNotificationsQuery(req).eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Notification not found' });
    res.json({ data: formatNotification(data) });
  } catch (err) {
    console.error('[Notifications GET id]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/mark-all-read', requireAuth, requireRole('Player', 'Coach', 'Scout', 'Stratex'), async (req, res) => {
  try {
    await markAllForUser(req);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[Notifications mark all]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/read-all', requireAuth, requireRole('Player', 'Coach', 'Scout', 'Stratex'), async (req, res) => {
  try {
    await markAllForUser(req);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('[Notifications read all]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/read', requireAuth, requireRole('Player', 'Coach', 'Scout', 'Stratex'), async (req, res) => {
  try {
    const { data: existing, error: findErr } = await ownNotificationsQuery(req).eq('id', req.params.id).maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('recipient_id', req.user.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    res.json({ message: 'Marked as read', data: data ? formatNotification(data) : formatNotification({ ...existing, is_read: true }) });
  } catch (err) {
    console.error('[Notifications read]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
