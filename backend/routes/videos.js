'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

// Get videos for a player
router.get('/', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    const { playerId } = req.query;
    let q = supabase.from('player_videos').select('*', { count:'exact' });
    if (playerId) {
      q = q.eq('player_id', playerId);
    } else if (req.user.accountType === 'Player') {
      q = q.eq('player_id', req.user.id);
    }
    q = q.order('created_at', { ascending: false });
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add video for a player (coaches can add for their players)
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { playerId, title, videoUrl, videoType, category, description } = req.body;
    if (!title || !videoUrl) return res.status(400).json({ error: 'title and videoUrl required' });
    // Get coach_id and team_id from the auth user
    let coachTeamId = null;
    if (req.user.accountType === 'Coach') {
      const { data: coachData } = await supabase.from('coaches').select('id,team_id').eq('id', req.user.id).maybeSingle();
      coachTeamId = coachData?.team_id || null;
    }
    const insertData = {
      player_id: playerId || null,
      coach_id: req.user.accountType === 'Coach' ? req.user.id : null,
      team_id: coachTeamId,
      title,
      video_url: videoUrl,
      category: category || videoType || 'Highlight',
      description: description || null
    };
    const { data, error } = await supabase.from('player_videos').insert(insertData).select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Video added', video: data });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Delete a video
router.delete('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { error } = await supabase.from('player_videos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Video deleted' });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
