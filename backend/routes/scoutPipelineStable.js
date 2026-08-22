'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

function pipelineLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

router.get(
  '/pipeline',
  requireAuth,
  requireRole('Scout', 'Stratex'),
  async (req, res) => {
    try {
      const scoutId =
        req.user.accountType === 'Scout'
          ? req.user.id
          : req.query.scoutId;

      let query = supabase
        .from('recruitment_pipeline')
        .select(
          [
            'id',
            'scout_id',
            'player_id',
            'stage',
            'notes',
            'interest_level',
            'created_at',
            'updated_at',
            'players:players!recruitment_pipeline_player_id_fkey(',
            'id,',
            'first_name,',
            'last_name,',
            'specific_position,',
            'primary_position,',
            'overall_rating,',
            'transfer_value,',
            'team_name,',
            'age,',
            'age_group,',
            'position_group,',
            'appearances,',
            'assigned_coach_id,',
            'team_id',
            ')',
            'scouts:scouts!recruitment_pipeline_scout_id_fkey(',
            'id,',
            'first_name,',
            'last_name,',
            'club_name',
            ')'
          ].join(''),
          { count: 'exact' }
        );

      if (scoutId) {
        query = query.eq('scout_id', scoutId);
      }

      if (req.query.stage) {
        query = query.eq('stage', req.query.stage);
      }

      query = query
        .order('updated_at', { ascending: false })
        .limit(pipelineLimit(req.query.limit));

      const { data, error, count } = await query;

      if (error) {
        console.error('[Scout Pipeline GET]', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return res.status(500).json({
          error: 'Internal server error'
        });
      }

      return res.json({
        data: data || [],
        total: count || 0
      });
    } catch (error) {
      console.error('[Scout Pipeline GET]', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

router.patch(
  '/pipeline/:id',
  requireAuth,
  requireRole('Scout', 'Stratex'),
  async (req, res) => {
    try {
      const { stage } = req.body || {};
      const validStages = [
        'watching',
        'interested',
        'shortlisted',
        'approached',
        'trial_pending',
        'negotiating'
      ];

      if (!stage || !validStages.includes(stage)) {
        return res.status(400).json({
          error:
            'Invalid stage. Must be one of: ' +
            validStages.join(', ')
        });
      }

      let query = supabase
        .from('recruitment_pipeline')
        .update({
          stage,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);

      if (req.user.accountType === 'Scout') {
        query = query.eq('scout_id', req.user.id);
      }

      const { data, error } = await query
        .select()
        .single();

      if (error) {
        console.error('[Scout Pipeline PATCH]', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return res.status(500).json({
          error: 'Internal server error'
        });
      }

      return res.json({ data });
    } catch (error) {
      console.error('[Scout Pipeline PATCH]', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

module.exports = router;
