'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

function getSeasonLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // Season starts Aug 1, ends Jul 31
  const startYear = month >= 8 ? year : year - 1;
  return startYear + '-' + String(startYear + 1).slice(2);
}

// POST /api/season/end — archive season and reset stats
router.post('/end', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const coachId = req.user.id;
    const { data: coach } = await supabase.from('coaches').select('id,team_id,team_name').eq('id', coachId).single();
    if (!coach) return res.status(404).json({ error: 'Coach not found' });

    // Get all players for this coach's team
    let playerQuery = supabase.from('players')
      .select('id,first_name,last_name,position_group,specific_position,overall_rating,transfer_value,appearances,goals,assists,clean_sheets,yellow_cards,red_cards')
      .eq('is_active', true);
    
    if (coach.team_id) playerQuery = playerQuery.eq('team_id', coach.team_id);
    else if (coach.team_name) playerQuery = playerQuery.eq('team_name', coach.team_name);
    else return res.status(400).json({ error: 'Coach has no team assigned' });
    
    const { data: players, error: playersErr } = await playerQuery;
    if (playersErr) throw playersErr;

    const seasonLabel = getSeasonLabel();
    
    // Build player summaries for archive
    const playerSummaries = (players || []).map(p => ({
      id: p.id,
      name: p.first_name + ' ' + p.last_name,
      position: p.specific_position || p.position_group,
      overall_rating: p.overall_rating,
      transfer_value: p.transfer_value,
      appearances: p.appearances || 0,
      goals: p.goals || 0,
      assists: p.assists || 0,
      clean_sheets: p.clean_sheets || 0,
      yellow_cards: p.yellow_cards || 0,
      red_cards: p.red_cards || 0
    }));

    // Insert season archive
    const { data: archive, error: archErr } = await supabase.from('season_archives').insert({
      coach_id: coachId,
      team_id: coach.team_id || null,
      season_label: seasonLabel,
      archived_at: new Date().toISOString(),
      player_summaries: playerSummaries,
      player_count: playerSummaries.length
    }).select().single();
    if (archErr) throw archErr;

    // Reset season stats (keep ratings and overall_rating)
    const resetData = { appearances: 0, goals: 0, assists: 0, clean_sheets: 0, yellow_cards: 0, red_cards: 0 };
    const playerIds = (players || []).map(p => p.id);
    if (playerIds.length > 0) {
      await supabase.from('players').update(resetData).in('id', playerIds);
    }

    res.json({ message: 'Season ' + seasonLabel + ' has been archived. Squad statistics reset for the new season.', archive, seasonLabel });
  } catch(e) { console.error('[Season End]', e); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/season/archives — list archived seasons for this coach
router.get('/archives', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('season_archives')
      .select('id,season_label,archived_at,player_count')
      .eq('coach_id', req.user.id)
      .order('archived_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch(e) { res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/season/archives/:id — get full archive with player summaries
router.get('/archives/:id', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('season_archives')
      .select('*').eq('id', req.params.id).eq('coach_id', req.user.id).single();
    if (error || !data) return res.status(404).json({ error: 'Archive not found' });
    res.json({ archive: data });
  } catch(e) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
