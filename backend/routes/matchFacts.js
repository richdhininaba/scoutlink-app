'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { computeOverall, grassrootsTransferValue, getPosGroup } = require('../engines/compatibility');

// Helper: recalculate and save overall_rating and transfer_value for a player
async function recalcPlayer(playerId) {
  try {
    const { data: p } = await supabase.from('players').select('*').eq('id', playerId).single();
    if (!p) return;
    const overall100 = computeOverall(p);
    const overall10 = Math.round(overall100 * 10) / 100; // store as 0-10 with 1dp
    const tvData = grassrootsTransferValue ? grassrootsTransferValue({ ...p, overall_rating: overall100 }) : { value: 0 };
    await supabase.from('players').update({
      overall_rating: parseFloat(overall10.toFixed(1)),
      transfer_value: tvData.value || 0
    }).eq('id', playerId);
  } catch(e) { console.error('[recalcPlayer]', playerId, e.message); }
}

// Helper: update aggregate stats for a player from all their match facts
async function updatePlayerStats(playerId) {
  try {
    const { data: facts } = await supabase.from('match_facts')
      .select('goals,assists,yellow_cards,red_cards,clean_sheet,home_score,away_score,result')
      .eq('player_id', playerId);
    if (!facts || !facts.length) return;
    const totals = facts.reduce((acc, f) => ({
      appearances: acc.appearances + 1,
      goals: acc.goals + (Number(f.goals) || 0),
      assists: acc.assists + (Number(f.assists) || 0),
      yellow_cards: acc.yellow_cards + (Number(f.yellow_cards) || 0),
      red_cards: acc.red_cards + (Number(f.red_cards) || 0),
      clean_sheets: acc.clean_sheets + (f.clean_sheet ? 1 : 0)
    }), { appearances: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0, clean_sheets: 0 });
    await supabase.from('players').update(totals).eq('id', playerId);
  } catch(e) { console.error('[updatePlayerStats]', e.message); }
}

// GET /api/match-facts â list
router.get('/', requireAuth, requireRole('Coach','Stratex','Scout','Player'), async (req, res) => {
  try {
    const { playerId, coachId, teamId, limit = 20 } = req.query;
    let q = supabase.from('match_facts').select('*', { count: 'exact' });
    if (playerId) q = q.eq('player_id', playerId);
    else if (coachId) q = q.eq('coach_id', coachId);
    else if (teamId) q = q.eq('team_id', teamId);
    else if (req.user.accountType === 'Player') q = q.eq('player_id', req.user.id);
    else if (req.user.accountType === 'Coach') q = q.eq('coach_id', req.user.id);
    q = q.order('match_date', { ascending: false }).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) { console.error('[MatchFacts GET]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/match-facts â submit match (supports single player or team submission)
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const {
      // Core match fields
      teamId, coachId, matchDate, opponent, format, formation, mode,
      homeScore, awayScore,
      // Single player fields (legacy)
      playerId,
      goals = 0, assists = 0, yellowCards = 0, redCards = 0, cleanSheet = false,
      coachNotes, positionPlayed,
      // Ratings (single player)
      pace, agility, strength, stamina, jumping, composure,
      shooting, passing, dribbling, defending, crossing,
      vision, positioning, heading, tackling,
      // Multi-player fields
      players: playersList,
      // Live mode fields
      events, playerPositions, confirmed = false
    } = req.body;

    // Determine result from scores
    let result = null;
    if (homeScore !== undefined && awayScore !== undefined) {
      const home = Number(homeScore);
      const away = Number(awayScore);
      result = home > away ? 'win' : home < away ? 'loss' : 'draw';
    }

    // Determine effective coach_id
    const effectiveCoachId = coachId || (req.user.accountType === 'Coach' ? req.user.id : null);
    const effectiveTeamId = teamId || null;

    // ââ MULTI-PLAYER SUBMISSION ââ
    if (Array.isArray(playersList) && playersList.length > 0) {
      const results = [];
      for (const pp of playersList) {
        if (!pp.playerId) continue;
        const ratings = {};
        const ratingKeys = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
        ratingKeys.forEach(k => { if (pp[k] !== undefined && pp[k] !== null) ratings[k] = Number(pp[k]); });

        // Determine clean sheet: GK or Defender AND away_score === 0
        let cs = pp.cleanSheet !== undefined ? !!pp.cleanSheet : false;
        if (!cs && (homeScore !== undefined && awayScore !== undefined)) {
          const { data: pl } = await supabase.from('players').select('position_group').eq('id', pp.playerId).maybeSingle();
          if (pl && (pl.position_group === 'Goalkeeper' || pl.position_group === 'Defender')) {
            cs = Number(awayScore) === 0;
          }
        }

        const { data: mf, error: mfErr } = await supabase.from('match_facts').insert({
          player_id: pp.playerId,
          team_id: effectiveTeamId,
          coach_id: effectiveCoachId,
          match_date: matchDate || new Date().toISOString().split('T')[0],
          opponent: opponent || null,
          format: format || null,
          formation: formation || null,
          mode: mode || 'post',
          home_score: homeScore !== undefined ? Number(homeScore) : null,
          away_score: awayScore !== undefined ? Number(awayScore) : null,
          result: result,
          goals: Number(pp.goals || 0),
          assists: Number(pp.assists || 0),
          yellow_cards: Number(pp.yellowCards || 0),
          red_cards: Number(pp.redCards || 0),
          clean_sheet: cs,
          coach_notes: pp.notes || coachNotes || null,
          events: events ? JSON.stringify(events) : null,
          player_positions: playerPositions ? JSON.stringify(playerPositions) : null,
          ratings: Object.keys(ratings).length ? JSON.stringify(ratings) : null,
          confirmed: !!confirmed,
          ...ratings
        }).select().single();

        if (mfErr) { console.error('[MatchFacts multi]', mfErr.message); continue; }
        await updatePlayerStats(pp.playerId);
        if (Object.keys(ratings).length > 0) await recalcPlayer(pp.playerId);
        results.push(mf);
      }
      return res.status(201).json({ message: 'Match facts saved for ' + results.length + ' players', matchFacts: results });
    }

    // ââ SINGLE PLAYER SUBMISSION ââ
    if (!playerId) return res.status(400).json({ error: 'playerId required (or players array for multi-player)' });

    const ratings = {};
    const ratingKeys = ['pace','agility','strength','stamina','jumping','composure','shooting','passing','dribbling','defending','crossing','vision','positioning','heading','tackling'];
    const body = req.body;
const ratingsObj = (body.ratings && typeof body.ratings === 'object') ? body.ratings : {};
    ratingKeys.forEach(k => { if (body[k] !== undefined && body[k] !== null) ratings[k] = Number(body[k]); else if (ratingsObj[k] !== undefined) ratings[k] = Number(ratingsObj[k]); });

    // Auto clean sheet for GK/Def
    let cs = !!cleanSheet;
    if (!cs && awayScore !== undefined) {
      const { data: pl } = await supabase.from('players').select('position_group').eq('id', playerId).maybeSingle();
      if (pl && (pl.position_group === 'Goalkeeper' || pl.position_group === 'Defender')) {
        cs = Number(awayScore) === 0;
      }
    }

    const { data, error } = await supabase.from('match_facts').insert({
      player_id: playerId,
      team_id: effectiveTeamId,
      coach_id: effectiveCoachId,
      match_date: matchDate || new Date().toISOString().split('T')[0],
      opponent: opponent || null,
      format: format || null,
      formation: formation || null,
      mode: mode || 'post',
      home_score: homeScore !== undefined ? Number(homeScore) : null,
      away_score: awayScore !== undefined ? Number(awayScore) : null,
      result: result,
      goals: Number(goals),
      assists: Number(assists),
      yellow_cards: Number(yellowCards),
      red_cards: Number(redCards),
      clean_sheet: cs,
      coach_notes: coachNotes || null,
      events: events ? JSON.stringify(events) : null,
      player_positions: playerPositions ? JSON.stringify(playerPositions) : null,
      ratings: Object.keys(ratings).length ? JSON.stringify(ratings) : null,
      confirmed: !!confirmed,
      ...ratings
    }).select().single();
    if (error) throw error;

    await updatePlayerStats(playerId);
    if (Object.keys(ratings).length > 0) await recalcPlayer(playerId);

    res.status(201).json({ message: 'Match facts saved', matchFact: data });
  } catch(err) { console.error('[MatchFacts POST]', err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
