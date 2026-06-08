'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

router.get('/my-players', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data: coach, error: coachErr } = await supabase.from('coaches').select('id,team_name').eq('id', req.user.id).single();
    if (coachErr || !coach) return res.status(404).json({ error: 'Coach not found', userId: req.user.id });
    if (!coach.team_name) return res.json({ data: [], teamName: null });
    const { data, error } = await supabase.from('players')
      .select('id,first_name,last_name,age,position_group,specific_position,primary_position,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,foot,team_name')
      .eq('team_name', coach.team_name)
      .eq('is_active', true)
      .order('last_name');
    if (error) throw error;
    res.json({ data: data || [], teamName: coach.team_name });
  } catch(err) { console.error('[Coaches] my-players error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/profile', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('coaches').select('*').eq('id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Not found' });
    res.json({ coach: data });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
