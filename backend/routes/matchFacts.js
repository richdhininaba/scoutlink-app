'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { applyRealDataFilter } = require('../utils/demo');
const engines = require('../engines');
const scoringService = require('../services/playerScoringService');

const COACH_FORMATIONS = {
  5: ['1-2-1','2-1-1','1-1-2'],
  6: ['2-2-1','1-3-1','2-1-2'],
  7: ['2-3-1','3-2-1','2-2-2'],
  8: ['3-3-1','2-3-2','3-2-2'],
  9: ['3-3-2','3-2-3','4-3-1'],
  10: ['3-4-2','4-3-2','4-4-1'],
  11: ['4-3-3','4-2-3-1','4-4-2','3-5-2','3-4-3']
};

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function wholeRating(value, label) {
  if (value === null || value === undefined || value === '') return null;

  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 10) {
    throw requestError(
      `${label} must be a whole number from 1 to 10 or Not observed.`
    );
  }
  return number;
}

function wholeNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

function flattenRatings(value, output = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return output;
  }

  Object.entries(value).forEach(([key, child]) => {
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenRatings(child, output);
    } else {
      output[key] = child;
    }
  });

  return output;
}

function supportedFormatNumber(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  const match = raw.match(
    /^(3|5|6|7|8|9|10|11)(?:v|x|-a-side)?(3|5|6|7|8|9|10|11)?$/
  );

  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2] || match[1]);

  return first === second ? first : null;
}

function formatName(value) {
  const number = supportedFormatNumber(value);
  return number ? `${number}v${number}` : null;
}

function normaliseCoachFormation(value, formatNumber, required) {
  const formation = String(value || '').trim();

  if (!formation) {
    if (required) {
      throw requestError(
        'Formation is required for Coach Match Facts.'
      );
    }
    return null;
  }

  const allowed = COACH_FORMATIONS[Number(formatNumber)] || [];

  if (!allowed.includes(formation)) {
    throw requestError(
      `Formation ${formation} is not supported for ${formatNumber || 'this'}-a-side Match Facts.`
    );
  }

  return formation;
}

function positionFromSlot(key) {
  const raw = String(key || '')
    .toUpperCase()
    .replace(/\d+$/g, '');

  const aliases = {
    LAM:'AM',
    RAM:'AM',
    CAM:'AM'
  };

  return engines.utils.normalisePosition(aliases[raw] || raw);
}

function normaliseMatchRatings(player, raw, playedPosition) {
  const position =
    engines.utils.normalisePosition(playedPosition) ||
    engines.utils.getPrimaryPosition(player);

  const group = engines.utils.getPositionGroup(position);
  const allowed = new Set(engines.utils.attributesForGroup(group));
  const flat = flattenRatings(raw || {});
  const output = {};

  Object.entries(flat).forEach(([key, value]) => {
    if (!allowed.has(key)) {
      throw requestError(
        `${key} is not valid for the ${group || 'selected'} match position.`
      );
    }

    const rating = wholeRating(value, key);
    if (rating !== null) output[key] = rating;
  });

  return output;
}

async function coachRecord(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,team_id,team_name,is_super_user')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Coach not found.', 404);
  return data;
}

async function playerMap(req, ids) {
  const unique = engines.utils.unique(ids.filter(Boolean));
  if (!unique.length) return {};

  let query = supabase
    .from('players')
    .select([
      'id','team_id','team_name','assigned_coach_id','age_group',
      'position_group','specific_position','primary_position',
      'positions','attribute_ratings','is_active','is_demo'
    ].join(','))
    .in('id', unique)
    .eq('is_active', true);

  /*
   * A real Coach session can never submit facts against demo players, and a
   * Stratex test/demo Coach session can never submit against real players.
   */
  if (req.user.accountType === 'Coach') {
    query = applyRealDataFilter(query, req);
  }

  const { data, error } = await query;
  if (error) throw error;

  return Object.fromEntries(
    (data || []).map(player => [String(player.id), player])
  );
}

async function updatePlayerStats(playerId) {
  const { data: facts, error } = await supabase
    .from('match_facts')
    .select('goals,assists,yellow_cards,red_cards,clean_sheet')
    .eq('player_id', playerId);

  if (error) throw error;

  const totals = (facts || []).reduce(
    (result, fact) => ({
      appearances:result.appearances + 1,
      goals:result.goals + (Number(fact.goals) || 0),
      assists:result.assists + (Number(fact.assists) || 0),
      yellow_cards:
        result.yellow_cards + (Number(fact.yellow_cards) || 0),
      red_cards:
        result.red_cards + (Number(fact.red_cards) || 0),
      clean_sheets:
        result.clean_sheets + (fact.clean_sheet ? 1 : 0)
    }),
    {
      appearances:0,
      goals:0,
      assists:0,
      yellow_cards:0,
      red_cards:0,
      clean_sheets:0
    }
  );

  const { error: updateError } = await supabase
    .from('players')
    .update(totals)
    .eq('id', playerId);

  if (updateError) throw updateError;
}

async function coachTeam(req, requestedTeamId) {
  if (req.user.accountType !== 'Coach') {
    return {
      teamId:requestedTeamId || null,
      coach:null
    };
  }

  const coach = await coachRecord(req.user.id);

  if (
    requestedTeamId &&
    coach.team_id &&
    String(requestedTeamId) !== String(coach.team_id)
  ) {
    throw requestError('The match must belong to your team.', 403);
  }

  return {
    teamId:coach.team_id || requestedTeamId || null,
    coach
  };
}

async function fixtureContext(fixtureId, teamId, coach) {
  if (!fixtureId) return null;

  const { data, error } = await supabase
    .from('fixtures')
    .select('*')
    .eq('id', fixtureId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Fixture not found.', 404);

  if (
    teamId &&
    data.team_id &&
    String(data.team_id) !== String(teamId)
  ) {
    throw requestError('Fixture is not linked to your team.', 403);
  }

  if (
    coach &&
    !coach.team_id &&
    String(data.coach_id || '') !== String(coach.id)
  ) {
    throw requestError('Fixture is not linked to your Coach workspace.', 403);
  }

  return data;
}

function matchResult(ourScore, opponentScore) {
  if (
    ourScore === undefined ||
    ourScore === null ||
    opponentScore === undefined ||
    opponentScore === null
  ) {
    return null;
  }

  const ours = Number(ourScore);
  const theirs = Number(opponentScore);

  if (!Number.isFinite(ours) || !Number.isFinite(theirs)) return null;
  if (ours > theirs) return 'win';
  if (ours < theirs) return 'loss';
  return 'draw';
}

function cleanSheetFor(
  player,
  requested,
  opponentScore,
  playerPositions,
  playedPosition
) {
  if (requested !== undefined && requested !== null) {
    return Boolean(requested);
  }

  if (Number(opponentScore) !== 0) return false;

  const slot = Object.keys(playerPositions || {}).find(
    key => String(playerPositions[key]) === String(player.id)
  );

  const position =
    engines.utils.normalisePosition(playedPosition) ||
    positionFromSlot(slot) ||
    engines.utils.getPrimaryPosition(player);

  const group = engines.utils.getPositionGroup(position);

  return group === 'Goalkeeper' || group === 'Defender';
}

const ADVANCED_INTEGER_FIELDS = [
  'shots',
  'shots_on_target',
  'passes',
  'passes_attempted',
  'passes_completed',
  'progressive_passes',
  'line_breaking_passes',
  'progressive_carries',
  'chances_created',
  'take_ons_attempted',
  'take_ons_completed',
  'dribbles',
  'tackles',
  'interceptions',
  'fouls',
  'saves',
  'goals_conceded',
  'high_claims',
  'punches',
  'duels_attempted',
  'duels_won',
  'aerial_duels_attempted',
  'aerial_duels_won',
  'pressures',
  'successful_pressures',
  'recoveries',
  'blocks',
  'clearances',
  'errors_leading_to_shot',
  'box_entries',
  'box_touches'
];

function advancedFields(input) {
  const output = {};

  ADVANCED_INTEGER_FIELDS.forEach(key => {
    const camel = key.replace(
      /_([a-z])/g,
      (_, character) => character.toUpperCase()
    );

    const value = Object.prototype.hasOwnProperty.call(input, key)
      ? input[key]
      : input[camel];

    const parsed = wholeNonNegative(value);
    if (parsed !== null) output[key] = parsed;
  });

  if (
    input.passAccuracy !== undefined ||
    input.pass_accuracy !== undefined
  ) {
    const raw = Number(
      input.passAccuracy ?? input.pass_accuracy
    );

    if (Number.isFinite(raw)) {
      output.pass_accuracy = Math.max(0, Math.min(100, raw));
    }
  }

  return output;
}

function playerRecord(input, player, context) {
  const slot = Object.keys(context.playerPositions || {}).find(
    key => String(context.playerPositions[key]) === String(player.id)
  );

  const played = engines.utils.normalisePosition(
    input.positionPlayed ||
    input.position_played ||
    positionFromSlot(slot) ||
    engines.utils.getPrimaryPosition(player)
  );

  if (!played) {
    throw requestError('A supported position played is required.');
  }

  /*
   * Coach Match Facts V6 deliberately contains one overall /10 assessment.
   * Do not let an older frontend accidentally reintroduce per-attribute
   * post-match ratings. Stratex retains the legacy parser for admin/data
   * maintenance compatibility only.
   */
  const ratings = context.allowAttributeRatings
    ? normaliseMatchRatings(
        player,
        input.attributeRatings ||
          input.attribute_ratings ||
          input.ratings ||
          {},
        played
      )
    : {};

  const performance = wholeRating(
    input.performanceScore ??
      input.overallPerformance ??
      input.overall_performance,
    'Overall match performance'
  );

  return {
    player_id:player.id,
    team_id:context.teamId,
    coach_id:context.coachId,
    fixture_id:context.fixtureId,
    match_date:context.matchDate,
    opponent:context.opponent,
    format:context.formatValue,
    match_format:context.matchFormat,
    formation:context.formation,
    formation_played:context.formation,
    mode:context.mode,
    home_score:context.homeScore,
    away_score:context.awayScore,
    result:context.result,
    goals:Number(input.goals || 0),
    assists:Number(input.assists || 0),
    yellow_cards:Number(
      input.yellowCards ?? input.yellow_cards ?? 0
    ),
    red_cards:Number(
      input.redCards ?? input.red_cards ?? 0
    ),
    clean_sheet:cleanSheetFor(
      player,
      input.cleanSheet ?? input.clean_sheet,
      context.awayScore,
      context.playerPositions,
      played
    ),
    minutes_played:wholeNonNegative(
      input.minutesPlayed ?? input.minutes_played
    ),
    performance_score:performance,
    coach_notes:input.notes || context.coachNotes || null,
    events:context.events,
    player_positions:context.playerPositions,
    position_played:played,
    side_played:input.sidePlayed || input.side_played || null,
    role_played:input.rolePlayed || input.role_played || null,
    attribute_ratings:ratings,
    ratings,
    rating_scale:'ten',
    assessment_version:engines.config.ATTRIBUTE_RUBRIC_VERSION,
    rubric_version:engines.config.ATTRIBUTE_RUBRIC_VERSION,
    competition_level:
      input.competitionLevel || input.competition_level || null,
    opposition_level:
      input.oppositionLevel || input.opposition_level || null,
    source_type:'coach_match_fact',
    evidence_source:'coach_match_fact',
    confirmed:context.confirmed,
    scoring_version:engines.config.SCORING_VERSION,
    ...advancedFields(input)
  };
}

function scopeCoachFacts(query, coach) {
  if (coach.team_id) {
    return query.eq('team_id', coach.team_id);
  }
  return query.eq('coach_id', coach.id);
}

router.get(
  '/',
  requireAuth,
  requireRole('Coach','Stratex','Scout','Player'),
  async (req, res) => {
    try {
      const {
        playerId,
        coachId,
        teamId,
        fixtureId,
        limit = 20
      } = req.query;

      let query = supabase
        .from('match_facts')
        .select('*', { count:'exact' });

      if (req.user.accountType === 'Coach') {
        const coach = await coachRecord(req.user.id);

        /*
         * Apply authenticated Coach scope first. A known playerId, fixtureId,
         * coachId or teamId can narrow the result but can never expand access.
         */
        query = scopeCoachFacts(query, coach);

        if (playerId) query = query.eq('player_id', playerId);
        if (fixtureId) query = query.eq('fixture_id', fixtureId);
      } else if (req.user.accountType === 'Player') {
        query = query.eq('player_id', req.user.id);
        if (fixtureId) query = query.eq('fixture_id', fixtureId);
      } else {
        if (playerId) query = query.eq('player_id', playerId);
        if (fixtureId) query = query.eq('fixture_id', fixtureId);
        if (coachId) query = query.eq('coach_id', coachId);
        if (teamId) query = query.eq('team_id', teamId);
      }

      const { data, error, count } = await query
        .order('match_date', { ascending:false })
        .limit(
          Math.max(
            1,
            Math.min(Number(limit) || 20, 100)
          )
        );

      if (error) throw error;

      res.json({
        data:data || [],
        total:count || 0
      });
    } catch (error) {
      console.error('[Match facts GET]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

router.post(
  '/',
  requireAuth,
  requireRole('Coach','Stratex'),
  async (req, res) => {
    try {
      const body = req.body || {};
      const scope = await coachTeam(
        req,
        body.teamId || body.team_id || null
      );

      const teamId = scope.teamId;
      const coach = scope.coach;

      const fixture = await fixtureContext(
        body.fixtureId || body.fixture_id || null,
        teamId,
        coach
      );

      const playersInput =
        Array.isArray(body.players) && body.players.length
          ? body.players
          : body.playerId || body.player_id
            ? [{
                ...body,
                playerId:body.playerId || body.player_id
              }]
            : [];

      if (!playersInput.length) {
        throw requestError('At least one player is required.');
      }

      const byId = await playerMap(
        req,
        playersInput.map(
          item => item.playerId || item.player_id
        )
      );

      const finalDate =
        body.matchDate ||
        body.match_date ||
        fixture?.fixture_date ||
        new Date().toISOString().slice(0, 10);

      const finalOpponent =
        body.opponent ||
        fixture?.opponent ||
        null;

      if (!finalOpponent) {
        throw requestError('Opponent is required.');
      }

      const rawFormat =
        body.format ||
        body.matchFormat ||
        body.match_format ||
        fixture?.format ||
        null;

      const formatNumber = supportedFormatNumber(rawFormat);
      const matchFormat = formatName(rawFormat);

      if (
        req.user.accountType === 'Coach' &&
        (!formatNumber || formatNumber < 5 || formatNumber > 11)
      ) {
        throw requestError(
          'Coach Match Facts format must be between 5-a-side and 11-a-side.'
        );
      }

      const formation = normaliseCoachFormation(
        body.formation,
        formatNumber,
        req.user.accountType === 'Coach'
      );

      const context = {
        teamId,
        coachId:
          req.user.accountType === 'Coach'
            ? req.user.id
            : (body.coachId || body.coach_id || null),
        fixtureId:body.fixtureId || body.fixture_id || null,
        matchDate:finalDate,
        opponent:finalOpponent,
        formatValue:formatNumber ? String(formatNumber) : rawFormat,
        matchFormat,
        formation,
        mode:body.mode || 'post',
        homeScore:
          body.homeScore === undefined || body.homeScore === null
            ? null
            : Number(body.homeScore),
        awayScore:
          body.awayScore === undefined || body.awayScore === null
            ? null
            : Number(body.awayScore),
        result:matchResult(body.homeScore, body.awayScore),
        events:Array.isArray(body.events) ? body.events : [],
        playerPositions:
          body.playerPositions &&
          typeof body.playerPositions === 'object'
            ? body.playerPositions
            : {},
        coachNotes:body.coachNotes || body.coach_notes || null,
        confirmed:Boolean(body.confirmed),
        allowAttributeRatings:req.user.accountType !== 'Coach'
      };

      const saved = [];
      const errors = [];
      let insertedCount = 0;
      let updatedCount = 0;

      for (const item of playersInput) {
        const id = String(
          item.playerId || item.player_id || ''
        );
        const player = byId[id];

        if (!player) {
          errors.push({
            playerId:id,
            error:'Player not found'
          });
          continue;
        }

        if (
          teamId &&
          player.team_id &&
          String(player.team_id) !== String(teamId)
        ) {
          errors.push({
            playerId:id,
            error:'Player is not on this team'
          });
          continue;
        }

        if (
          req.user.accountType === 'Coach' &&
          coach &&
          !coach.is_super_user &&
          String(player.assigned_coach_id || '') !== String(coach.id)
        ) {
          errors.push({
            playerId:id,
            error:'This player is not assigned to your Coach workspace.'
          });
          continue;
        }

        try {
          const payload = playerRecord(
            item,
            player,
            context
          );

          let existing = null;

          if (context.fixtureId) {
            const { data, error } = await supabase
              .from('match_facts')
              .select('id,coach_id')
              .eq('fixture_id', context.fixtureId)
              .eq('player_id', player.id)
              .maybeSingle();

            if (error) throw error;
            existing = data || null;
          }

          let fact;

          if (existing) {
            const updatePayload = {
              ...payload,
              /*
               * Keep the original Coach attribution when another permitted
               * team Coach edits the same fixture record.
               */
              coach_id:existing.coach_id || payload.coach_id
            };

            const { data, error } = await supabase
              .from('match_facts')
              .update(updatePayload)
              .eq('id', existing.id)
              .select()
              .single();

            if (error) throw error;
            fact = data;
            updatedCount += 1;
          } else {
            const { data, error } = await supabase
              .from('match_facts')
              .insert(payload)
              .select()
              .single();

            if (error) throw error;
            fact = data;
            insertedCount += 1;
          }

          /*
           * Stats are recalculated from the complete Match Facts table after
           * each upsert, so editing a score/event changes totals instead of
           * incrementing them a second time.
           */
          await updatePlayerStats(player.id);
          const analysis =
            await scoringService.recalculatePlayer(player.id);

          saved.push({
            ...fact,
            analysis,
            operation:existing ? 'updated' : 'created'
          });
        } catch (error) {
          errors.push({
            playerId:player.id,
            error:error.message
          });
        }
      }

      if (!saved.length && errors.length) {
        return res.status(400).json({
          error:'Could not save match facts.',
          details:errors
        });
      }

      const status =
        insertedCount > 0
          ? 201
          : 200;

      res.status(status).json({
        message:
          `Match facts saved for ${saved.length} player` +
          `${saved.length === 1 ? '' : 's'}.`,
        matchFacts:saved,
        created:insertedCount,
        updated:updatedCount,
        errors
      });
    } catch (error) {
      console.error('[Match facts POST]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
module.exports.normaliseMatchRatings = normaliseMatchRatings;
