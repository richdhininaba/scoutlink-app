'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

// Get videos for a player or coach
router.get('/', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    const { playerId, coachId } = req.query;
    let q = supabase.from('player_videos').select('*', { count:'exact' });
    if (playerId) {
      q = q.eq('player_id', playerId);
    } else if (req.user.accountType === 'Player') {
      q = q.eq('player_id', req.user.id);
    } else if (req.user.accountType === 'Coach') {
      q = q.eq('coach_id', req.user.id);
    }
    q = q.order('created_at', { ascending: false });
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) {
    console.error('[Videos GET] Error:', err.message, err.code, err.details);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// Add video (URL-based) for coaches
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { playerId, title, videoUrl, videoType, category, description } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

    // Get coach team_id
    let coachTeamId = null;
    if (req.user.accountType === 'Coach') {
      const { data: coachData, error: coachErr } = await supabase
        .from('coaches')
        .select('id,team_id')
        .eq('id', req.user.id)
        .maybeSingle();
      if (coachErr) console.error('[Videos POST] coach lookup error:', coachErr.message);
      coachTeamId = coachData ? coachData.team_id : null;
    }

    const insertData = {
      player_id: playerId || null,
      coach_id: req.user.accountType === 'Coach' ? req.user.id : null,
      team_id: coachTeamId,
      title,
      video_url: videoUrl,
      category: category || videoType || 'Highlight',
    };

    console.log('[Videos POST] inserting:', JSON.stringify(insertData));

    const { data, error } = await supabase
      .from('player_videos')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Videos POST] insert error:', error.message, error.code, error.details, error.hint);
      throw error;
    }

    res.status(201).json({ message: 'Video added', video: data });
  } catch(err) {
    console.error('[Videos POST] catch error:', err.message, err.code, err.details);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// Delete a video
router.delete('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { error } = await supabase.from('player_videos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Video deleted' });
  } catch(err) {
    console.error('[Videos DELETE] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
