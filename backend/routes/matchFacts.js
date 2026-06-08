'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { computeOverall, grassrootsTransferValue } = require('../engines/compatibility');

// List match facts for a player
router.get('/', requireAuth, requireRole('Coach','Stratex','Scout','Player'), async (req, res) => {
try {
const { playerId, coachId, limit = 20 } = req.query;
let q = supabase.from('match_facts').select('*', { count: 'exact' });
if (playerId) q = q.eq('player_id', playerId);
else if (coachId) q = q.eq('created_by', coachId);
else if (req.user.accountType === 'Player') q = q.eq('player_id', req.user.id);
else if (req.user.accountType === 'Coach') {
  // Return all match facts for this coach's players
  const { data: coachData } = await supabase.from('coaches').select('id').eq('id', req.user.id).single();
  if (coachData) q = q.eq('created_by', req.user.id);
}
q = q.order('match_date', { ascending: false }).limit(Number(limit));
const { data, error, count } = await q;
if (error) throw error;
res.json({ data: data || [], total: count || 0 });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add match facts with coach ratings (Coach or Stratex) — Section 12
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
try {
const { 
  playerId, matchDate, opponent, result, minutesPlayed = 90, format,
  goals = 0, assists = 0, yellowCards = 0, redCards = 0,
  cleanSheet = false, goalsConceded = 0,
  // Coach attribute ratings (15 ratings per spec)
  pace, agility, strength, stamina, jumping, composure,
  shooting, passing, dribbling, defending, crossing,
  vision, positioning, heading, tackling,
  performanceScore,
  coachNotes, formation, positionPlayed
} = req.body;

if (!playerId) return res.status(400).json({ error: 'playerId required' });

const ratings = { pace, agility, strength, stamina, jumping, composure, shooting, passing, dribbling, defending, crossing, vision, positioning, heading, tackling };
// Only include defined ratings
const ratingUpdates = {};
Object.keys(ratings).forEach(k => { if (ratings[k] !== undefined && ratings[k] !== null) ratingUpdates[k] = Number(ratings[k]); });

const { data, error } = await supabase.from('match_facts').insert({
  player_id: playerId, match_date: matchDate || new Date().toISOString().split('T')[0],
  opponent: opponent || null, result: result || null, format: format || null,
  minutes_played: Number(minutesPlayed) || 90,
  goals: Number(goals) || 0, assists: Number(assists) || 0,
  yellow_cards: Number(yellowCards) || 0, red_cards: Number(redCards) || 0,
  clean_sheet: !!cleanSheet, goals_conceded: Number(goalsConceded) || 0,
  performance_score: performanceScore ? Number(performanceScore) : null,
  coach_notes: coachNotes || null, formation: formation || null,
  position_played: positionPlayed || null,
  ...ratingUpdates,
  created_by: req.user.id
}).select().single();
if (error) throw error;

// Update player aggregate stats from all match facts
const { data: allFacts } = await supabase.from('match_facts').select('goals,assists,yellow_cards,red_cards,clean_sheet,minutes_played').eq('player_id', playerId);
if (allFacts && allFacts.length) {
  const totals = allFacts.reduce((acc, f) => ({
    appearances: acc.appearances + (Number(f.minutes_played) > 0 ? 1 : 0),
    goals: acc.goals + (Number(f.goals) || 0),
    assists: acc.assists + (Number(f.assists) || 0),
    yellow_cards: acc.yellow_cards + (Number(f.yellow_cards) || 0),
    red_cards: acc.red_cards + (Number(f.red_cards) || 0),
    clean_sheets: acc.clean_sheets + (f.clean_sheet ? 1 : 0)
  }), { appearances: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, clean_sheets: 0 });
  await supabase.from('players').update(totals).eq('id', playerId);
}

// If ratings were provided, update player ratings and recalculate overall
if (Object.keys(ratingUpdates).length > 0) {
  const { data: existingPlayer } = await supabase.from('players').select('*').eq('id', playerId).single();
  if (existingPlayer) {
    const merged = Object.assign({}, existingPlayer, ratingUpdates);
    const overall100 = computeOverall(merged);
    const tvData = grassrootsTransferValue ? grassrootsTransferValue(merged) : { value: 0 };
    await supabase.from('players').update({
      ...ratingUpdates,
      overall_rating: Math.round(overall100) / 10, // Store as 0-10
      transfer_value: tvData.value || 0
    }).eq('id', playerId);
  }
}

res.status(201).json({ message: 'Match facts saved', matchFact: data });
} catch(err) { console.error('[MatchFacts] error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;