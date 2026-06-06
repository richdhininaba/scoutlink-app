'use strict';
const express = require('express');
const router  = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth } = require('../utils/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { unreadOnly='false', limit=30 } = req.query;
    let q = supabase.from('notifications').select('*').eq('recipient_id', req.user.id).order('created_at',{ascending:false}).limit(Number(limit));
    if (unreadOnly==='true') q = q.eq('is_read', false);
    const { data, error } = await q;
    if (error) throw error;
    res.json({ data, unreadCount: data.filter(n=>!n.is_read).length });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', req.params.id).eq('recipient_id', req.user.id);
    res.json({ message: 'Marked as read' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', req.user.id).eq('is_read', false);
    res.json({ message: 'All marked as read' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;