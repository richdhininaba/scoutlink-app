'use strict';
const express = require('express');
const router  = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

router.get('/my-players', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data: coach } = await supabase.from('coaches').select('team_name').eq('id', req.user.id).single();
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    const { data, error } = await supabase.from('players').select('*').eq('team_name', coach.team_name).eq('is_active', true).order('last_name');
    if (error) throw error;
    res.json({ data, teamName: coach.team_name });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/profile', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('coaches').select('*').eq('id', req.user.id).single();
    if (error||!data) return res.status(404).json({ error: 'Not found' });
    res.json({ coach: data });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;