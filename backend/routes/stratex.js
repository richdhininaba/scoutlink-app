'use strict';
const express = require('express');
const router  = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');

router.get('/dashboard', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const [{ count: totalPlayers }, { count: totalCoaches }, { count: totalScouts }, { count: pendingReqs }, { data: recentReqs }] = await Promise.all([
      supabase.from('players').select('id',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('coaches').select('id',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('scouts').select('id',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('registration_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
      supabase.from('registration_requests').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(10),
    ]);
    res.json({ totalPlayers, totalCoaches, totalScouts, pendingReqs, recentPendingRegistrations: recentReqs });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/rankings', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const { posGroup, minAge, maxAge, page=1, limit=50 } = req.query;
    let q = supabase.from('players').select('id,first_name,last_name,age,position_group,specific_position,team_name,overall_rating,transfer_value,predicted_salary_weekly,nationality_code,height_category,build_category',{count:'exact'}).eq('is_active',true).not('overall_rating','is',null);
    if (posGroup) q = q.eq('position_group', posGroup);
    if (minAge)   q = q.gte('age', Number(minAge));
    if (maxAge)   q = q.lte('age', Number(maxAge));
    const off = (Number(page)-1)*Number(limit);
    q = q.order('overall_rating',{ascending:false}).range(off, off+Number(limit)-1);
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data.map((p,i) => ({ rank: off+i+1, ...p })), total: count });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/compare', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const { playerIds, teamId } = req.body;
    if (!Array.isArray(playerIds)||playerIds.length<2||playerIds.length>4) return res.status(400).json({ error: 'Provide 2-4 playerIds' });
    const { data: players } = await supabase.from('players').select('*').in('id', playerIds);
    let team = { tier: 5 };
    if (teamId) { const { data: t } = await supabase.from('scout_teams').select('*').eq('id', teamId).single(); if (t) team = t; }
    const comparisons = await Promise.all(players.map(async p => {
      const { data: m } = await supabase.from('match_facts').select('*').eq('player_id', p.id).order('match_date',{ascending:false}).limit(10);
      return { player: p, analysis: analysePlayer(p, team, m||[]) };
    }));
    res.json({ comparisons, team });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;