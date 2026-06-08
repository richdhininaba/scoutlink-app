'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { computeOverall } = require('../engines/compatibility');

// List match facts for a player
router.get('/', requireAuth, requireRole('Coach','Stratex','Scout','Player'), async (req, res) => {
  try {
    const { playerId, limit = 20 } = req.query;
    let q = supabase.from('match_facts').select('*', { count: 'exact' });
    if (playerId) q = q.eq('player_id', playerId);
    else if (req.user.accountType === 'Player') q = q.eq('player_id', req.user.id);
    q = q.order('match_date', { ascending: false }).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add match facts (Coach or Stratex)
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { playerId, matchDate, opponent, result, minutesPlayed = 0,
            goals = 0, assists = 0, shots = 0, shotsOnTarget = 0,
            passes = 0, passAccuracy = null, dribbles = 0, tackles = 0,
            interceptions = 0, fouls = 0, yellowCards = 0, redCards = 0,
            saves = 0, goalsConceded = 0, cleanSheet = false,
            highClaims = 0, punches = 0, coachNotes,
            tacklesWon, passesCompleted } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    const { data, error } = await supabase.from('match_facts').insert({
      player_id: playerId, match_date: matchDate || new Date().toISOString().split('T')[0],
      opponent: opponent || null, result: result || null,
      minutes_played: minutesPlayed, goals, assists,
      shots: shots || 0, shots_on_target: shotsOnTarget || 0,
      passes: passesCompleted || passes || 0,
      pass_accuracy: passAccuracy, dribbles, tackles: tacklesWon || tackles,
      interceptions, fouls, yellow_cards: yellowCards, red_cards: redCards,
      saves, goals_conceded: goalsConceded, clean_sheet: cleanSheet,
      high_claims: highClaims, punches,
      created_by: req.user.id
    }).select().single();
    if (error) throw error;

    // Update player aggregate stats
    const { data: allFacts } = await supabase.from('match_facts').select('goals,assists,yellow_cards,red_cards,clean_sheet,minutes_played').eq('player_id', playerId);
    if (allFacts) {
      const totals = allFacts.reduce((acc, f) => ({
        appearances: acc.appearances + (f.minutes_played > 0 ? 1 : 0),
        goals: acc.goals + (f.goals || 0),
        assists: acc.assists + (f.assists || 0),
        yellow_cards: acc.yellow_cards + (f.yellow_cards || 0),
        red_cards: acc.red_cards + (f.red_cards || 0),
        clean_sheets: acc.clean_sheets + (f.clean_sheet ? 1 : 0)
      }), { appearances: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, clean_sheets: 0 });
      await supabase.from('players').update(totals).eq('id', playerId);
    }

    res.status(201).json({ message: 'Match facts saved', matchFact: data });
  } catch(err) { console.error('[MatchFacts] error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
