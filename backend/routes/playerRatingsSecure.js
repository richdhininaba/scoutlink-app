'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { applyRealDataFilter } = require('../utils/demo');
const engines = require('../engines');
const scoringService = require('../services/playerScoringService');
const playerRoutes = require('./players');

const normaliseAttributeRatings = playerRoutes.normaliseAttributeRatings;

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function coachRecord(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,team_id,team_name,is_super_user')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Coach not found', 404);
  return data;
}

function coachMayManagePlayer(coach, player) {
  if (!coach || !player) return false;

  if (!coach.is_super_user) {
    return String(player.assigned_coach_id || '') === String(coach.id);
  }

  if (
    coach.team_id &&
    player.team_id &&
    String(coach.team_id) === String(player.team_id)
  ) {
    return true;
  }

  if (
    !coach.team_id &&
    coach.team_name &&
    player.team_name &&
    String(coach.team_name) === String(player.team_name)
  ) {
    return true;
  }

  return String(player.assigned_coach_id || '') === String(coach.id);
}

/*
 * Compatibility guard for the legacy PATCH /api/players/:id/ratings route.
 *
 * This router is mounted before routes/players.js. The active V6 profile
 * currently saves assessments through PUT /api/players/:id, but older clients
 * can still call this endpoint. Keep it working while applying the same Coach
 * workspace permission rules as the current Player update route.
 */
router.patch(
  '/:id/ratings',
  requireAuth,
  requireRole('Coach','Stratex'),
  async (req, res) => {
    try {
      let query = supabase
        .from('players')
        .select([
          'id','team_id','team_name','assigned_coach_id','position_group',
          'specific_position','primary_position','positions',
          'attribute_ratings','is_active','is_demo'
        ].join(','))
        .eq('id', req.params.id)
        .eq('is_active', true);

      if (req.user.accountType === 'Coach') {
        query = applyRealDataFilter(query, req);
      }

      const { data: player, error } = await query.maybeSingle();
      if (error) throw error;
      if (!player) {
        return res.status(404).json({ error:'Player not found' });
      }

      if (req.user.accountType === 'Coach') {
        const coach = await coachRecord(req.user.id);

        if (!coachMayManagePlayer(coach, player)) {
          return res.status(403).json({
            error:'You can only update players you are permitted to manage.'
          });
        }
      }

      const position = engines.utils.getPrimaryPosition(player);
      const attributeRatings = normaliseAttributeRatings(
        req.body.attributeRatings ||
          req.body.attribute_ratings ||
          {},
        position
      );

      const { error: updateError } = await supabase
        .from('players')
        .update({
          attribute_ratings:attributeRatings,
          attribute_rating_scale:'ten',
          attribute_assessment_version:engines.config.ATTRIBUTE_RUBRIC_VERSION,
          attribute_assessed_at:new Date().toISOString(),
          attribute_assessed_by:req.user.id,
          updated_at:new Date().toISOString()
        })
        .eq('id', player.id);

      if (updateError) throw updateError;

      const analysis =
        await scoringService.recalculatePlayer(player.id);

      const { data: refreshed, error: refreshError } = await supabase
        .from('players')
        .select('*')
        .eq('id', player.id)
        .single();

      if (refreshError) throw refreshError;

      res.json({
        player:refreshed,
        analysis,
        message:'Ratings updated.'
      });
    } catch (error) {
      console.error('[Secure legacy player ratings]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
