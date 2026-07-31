'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const engines = require('../engines');
const scoringService = require('../services/playerScoringService');

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function wholeRating(value, label) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    throw requestError(`${label} must be a whole number from 1 to 10 or Not observed.`);
  }
  return number;
}

function flattenRatings(value, output = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
  Object.entries(value).forEach(([key, child]) => {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenRatings(child, output);
    } else {
      output[key] = child;
    }
  });
  return output;
}

function normaliseMatchRatings(player, raw) {
  const position = engines.utils.getPrimaryPosition(player);
  const group = engines.utils.getPositionGroup(position);
  const allowed = new Set(engines.utils.attributesForGroup(group));
  const flat = flattenRatings(raw || {});
  const output = {};

  Object.entries(flat).forEach(([key, value]) => {
    if (!allowed.has(key)) {
      throw requestError(`${key} is not valid for ${group || 'this player'}.`);
    }
    const rating = wholeRating(value, key);
    if (rating !== null) output[key] = rating;
  });
  return output;
}

function formatName(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  const match = raw.match(/^(3|5|7|9|11)(?:v|x|-a-side)?(3|5|7|9|11)?$/);
  if (!match) return null;
  const first = match[1];
  const second = match[2] || first;
  return first === second ? `${first}v${second}` : null;
}

function positionFromSlot(key) {
  const raw = String(key || '').toUpperCase().replace(/\d+$/g, '');
  const aliases = { LAM:'AM', RAM:'AM', CAM:'AM' };
  return engines.utils.normalisePosition(aliases[raw] || raw);
}

async function playerMap(ids) {
  const unique = engines.utils.unique(ids.filter(Boolean));
  if (!unique.length) return {};
  const { data, error } = await supabase
    .from('players')
    .select('id,age_group,position_group,specific_position,primary_position,positions,attribute_ratings')
    .in('id', unique);
  if (error) throw error;
  return Object.fromEntries((data || []).map(player => [String(player.id), player]));
}

async function updatePlayerStats(playerId) {
  const { data: facts, error } = await supabase
    .from('match_facts')
    .select('goals,assists,yellow_cards,red_cards,clean_sheet')
    .eq('player_id', playerId);
  if (error) throw error;

  const totals = (facts || []).reduce((result, fact) => ({
    appearances: result.appearances + 1,
    goals: result.goals + (Number(fact.goals) || 0),
    assists: result.assists + (Number(fact.assists) || 0),
    yellow_cards: result.yellow_cards + (Number(fact.yellow_cards) || 0),
    red_cards: result.red_cards + (Number(fact.red_cards) || 0),
    clean_sheets: result.clean_sheets + (fact.clean_sheet ? 1 : 0)
  }), {
    appearances:0,
    goals:0,
    assists:0,
    yellow_cards:0,
    red_cards:0,
    clean_sheets:0
  });

  const { error: updateError } = await supabase
    .from('players')
    .update(totals)
    .eq('id', playerId);
  if (updateError) throw updateError;
}

async function coachTeam(req, requestedTeamId) {
  if (req.user.accountType !== 'Coach') return requestedTeamId || null;
  const { data, error } = await supabase
    .from('coaches')
    .select('team_id')
    .eq('id', req.user.id)
    .single();
  if (error || !data) throw requestError('Coach not found.', 404);
  if (requestedTeamId && data.team_id && requestedTeamId !== data.team_id) {
    throw requestError('The match must belong to your team.', 403);
  }
  return data.team_id || requestedTeamId || null;
}

async function fixtureContext(fixtureId, teamId) {
  if (!fixtureId) return null;
  const { data, error } = await supabase
    .from('fixtures')
    .select('*')
    .eq('id', fixtureId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw requestError('Fixture not found.', 404);
  if (teamId && data.team_id && data.team_id !== teamId) {
    throw requestError('Fixture is not linked to your team.', 403);
  }
  return data;
}

function matchResult(homeScore, awayScore) {
  if (homeScore === undefined || awayScore === undefined) return null;
  const home = Number(homeScore);
  const away = Number(awayScore);
  return home > away ? 'win' : home < away ? 'loss' : 'draw';
}

function cleanSheetFor(player, requested, awayScore, playerPositions) {
  if (requested !== undefined) return Boolean(requested);
  if (Number(awayScore) !== 0) return false;

  const slot = Object.keys(playerPositions || {}).find(key => {
    return String(playerPositions[key]) === String(player.id);
  });
  const position = positionFromSlot(slot) || engines.utils.getPrimaryPosition(player);
  const group = engines.utils.getPositionGroup(position);
  return group === 'Goalkeeper' || group === 'Defender';
}

function playerRecord(input, player, context) {
  const ratingsSource = input.attributeRatings || input.attribute_ratings ||
    input.ratings || {};
  const ratings = normaliseMatchRatings(player, ratingsSource);
  const performance = wholeRating(
    input.performanceScore ?? input.overallPerformance ?? input.overall_performance,
    'Overall match performance'
  );
  const slot = Object.keys(context.playerPositions || {}).find(key => {
    return String(context.playerPositions[key]) === String(player.id);
  });
  const played = engines.utils.normalisePosition(
    input.positionPlayed || input.position_played || positionFromSlot(slot) ||
    engines.utils.getPrimaryPosition(player)
  );

  return {
    player_id: player.id,
    team_id: context.teamId,
    coach_id: context.coachId,
    fixture_id: context.fixtureId,
    match_date: context.matchDate,
    opponent: context.opponent,
    format: context.formatValue,
    match_format: context.matchFormat,
    formation: context.formation,
    formation_played: context.formation,
    mode: context.mode,
    home_score: context.homeScore,
    away_score: context.awayScore,
    result: context.result,
    goals: Number(input.goals || 0),
    assists: Number(input.assists || 0),
    yellow_cards: Number(input.yellowCards ?? input.yellow_cards ?? 0),
    red_cards: Number(input.redCards ?? input.red_cards ?? 0),
    clean_sheet: cleanSheetFor(player, input.cleanSheet ?? input.clean_sheet, context.awayScore, context.playerPositions),
    minutes_played: input.minutesPlayed ?? input.minutes_played ?? null,
    performance_score: performance,
    coach_notes: input.notes || context.coachNotes || null,
    events: context.events,
    player_positions: context.playerPositions,
    position_played: played,
    attribute_ratings: ratings,
    ratings,
    rating_scale: 'ten',
    assessment_version: engines.config.ATTRIBUTE_RUBRIC_VERSION,
    rubric_version: engines.config.ATTRIBUTE_RUBRIC_VERSION,
    source_type: 'coach_match_fact',
    evidence_source: 'coach_match_fact',
    confirmed: context.confirmed,
    scoring_version: engines.config.SCORING_VERSION
  };
}

router.get('/', requireAuth, requireRole('Coach','Stratex','Scout','Player'), async (req, res) => {
  try {
    const { playerId, coachId, teamId, limit = 20 } = req.query;
    let query = supabase.from('match_facts').select('*', { count:'exact' });

    if (playerId) query = query.eq('player_id', playerId);
    else if (coachId) query = query.eq('coach_id', coachId);
    else if (teamId) query = query.eq('team_id', teamId);
    else if (req.user.accountType === 'Player') query = query.eq('player_id', req.user.id);
    else if (req.user.accountType === 'Coach') query = query.eq('coach_id', req.user.id);

    const { data, error, count } = await query
      .order('match_date', { ascending:false })
      .limit(Math.max(1, Math.min(Number(limit) || 20, 100)));
    if (error) throw error;
    res.json({ data:data || [], total:count || 0 });
  } catch (error) {
    console.error('[Match facts GET]', error);
    res.status(500).json({ error:'Internal server error' });
  }
});

router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const body = req.body || {};
    const teamId = await coachTeam(req, body.teamId || body.team_id || null);
    const fixture = await fixtureContext(body.fixtureId || body.fixture_id || null, teamId);
    const playersInput = Array.isArray(body.players) && body.players.length
      ? body.players
      : body.playerId || body.player_id
        ? [{ ...body, playerId:body.playerId || body.player_id }]
        : [];

    if (!playersInput.length) throw requestError('At least one player is required.');

    const byId = await playerMap(playersInput.map(item => item.playerId || item.player_id));
    const finalDate = body.matchDate || body.match_date ||
      fixture?.fixture_date || new Date().toISOString().slice(0,10);
    const finalOpponent = body.opponent || fixture?.opponent || null;
    const rawFormat = body.format || body.matchFormat || body.match_format || fixture?.format || null;
    const matchFormat = formatName(rawFormat) || (rawFormat ? `${String(rawFormat).replace(/\D/g, '')}v${String(rawFormat).replace(/\D/g, '')}` : null);

    const context = {
      teamId,
      coachId: body.coachId || body.coach_id ||
        (req.user.accountType === 'Coach' ? req.user.id : null),
      fixtureId: body.fixtureId || body.fixture_id || null,
      matchDate: finalDate,
      opponent: finalOpponent,
      formatValue: rawFormat,
      matchFormat,
      formation: body.formation || null,
      mode: body.mode || 'post',
      homeScore: body.homeScore === undefined ? null : Number(body.homeScore),
      awayScore: body.awayScore === undefined ? null : Number(body.awayScore),
      result: matchResult(body.homeScore, body.awayScore),
      events: Array.isArray(body.events) ? body.events : [],
      playerPositions: body.playerPositions && typeof body.playerPositions === 'object'
        ? body.playerPositions
        : {},
      coachNotes: body.coachNotes || body.coach_notes || null,
      confirmed: Boolean(body.confirmed)
    };

    const saved = [];
    const errors = [];

    for (const item of playersInput) {
      const id = String(item.playerId || item.player_id || '');
      const player = byId[id];
      if (!player) {
        errors.push({ playerId:id, error:'Player not found' });
        continue;
      }

      try {
        const payload = playerRecord(item, player, context);
        const { data, error } = await supabase
          .from('match_facts')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        await updatePlayerStats(player.id);
        const analysis = await scoringService.recalculatePlayer(player.id);
        saved.push({ ...data, analysis });
      } catch (error) {
        errors.push({ playerId:player.id, error:error.message });
      }
    }

    if (!saved.length && errors.length) {
      return res.status(400).json({ error:'Could not save match facts.', details:errors });
    }

    res.status(201).json({
      message:`Match facts saved for ${saved.length} player${saved.length === 1 ? '' : 's'}.`,
      matchFacts:saved,
      errors
    });
  } catch (error) {
    console.error('[Match facts POST]', error);
    res.status(error.status || 500).json({
      error:error.status ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
module.exports.normaliseMatchRatings = normaliseMatchRatings;
