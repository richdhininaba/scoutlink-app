'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

router.get('/', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    const { limit = 20, unreadOnly } = req.query;
    let q = supabase.from('notifications').select('*', { count:'exact' }).eq('recipient_id', req.user.id);
    if (unreadOnly === 'true') q = q.eq('is_read', false);
    q = q.order('created_at', { ascending: false }).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    const unreadCount = (data || []).filter(n => !n.is_read).length;
    res.json({ data: data || [], total: count || 0, unreadCount });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/:id/read', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('recipient_id', req.user.id);
    res.json({ message: 'Marked as read' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Mark all notifications as read for current user
router.patch('/read-all', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', req.user.id).eq('is_read', false);
    res.json({ message: 'All notifications marked as read' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
