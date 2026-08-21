'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function titleCase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase());
}

async function coachContext(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,team_id,team_name,is_super_user')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Coach not found', 404);
  return data;
}

function fixtureInCoachWorkspace(fixture, coach) {
  if (!fixture || !coach) return false;

  if (coach.team_id) {
    return String(fixture.team_id || '') === String(coach.team_id);
  }

  return String(fixture.coach_id || '') === String(coach.id);
}

async function loadFixture(id) {
  const { data, error } = await supabase
    .from('fixtures')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Fixture not found', 404);
  return data;
}

router.get(
  '/',
  requireAuth,
  requireRole('Coach','Scout','Stratex'),
  async (req, res) => {
    try {
      const { teamId, coachId, upcoming, past } = req.query;
      let query = supabase.from('fixtures').select('*', { count:'exact' });

      if (req.user.accountType === 'Coach') {
        /*
         * A Coach request is always scoped from the authenticated Coach.
         * Query-string IDs are filters, never permission grants.
         */
        const coach = await coachContext(req.user.id);

        if (coach.team_id) {
          query = query.eq('team_id', coach.team_id);
        } else {
          query = query.eq('coach_id', coach.id);
        }
      } else {
        if (teamId) query = query.eq('team_id', teamId);
        if (coachId) query = query.eq('coach_id', coachId);
      }

      const today = new Date().toISOString().slice(0, 10);

      if (upcoming === 'true') {
        query = query.gte('fixture_date', today);
      }
      if (past === 'true') {
        query = query.lt('fixture_date', today);
      }

      const { data, error, count } = await query
        .order('fixture_date', { ascending:true })
        .limit(100);

      if (error) throw error;

      res.json({
        data:data || [],
        total:count || 0
      });
    } catch (error) {
      console.error('[Fixtures GET]', error);
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
      const {
        opponent,
        fixtureDate,
        fixtureTime,
        venue,
        venueAddress,
        venuePostcode,
        city,
        country,
        homeOrAway,
        format,
        notes
      } = req.body || {};

      if (!String(opponent || '').trim() || !fixtureDate) {
        return res.status(400).json({
          error:'opponent and fixtureDate required'
        });
      }

      let teamId = req.body?.teamId || null;
      let coachId = req.body?.coachId || null;

      if (req.user.accountType === 'Coach') {
        const coach = await coachContext(req.user.id);

        if (
          teamId &&
          coach.team_id &&
          String(teamId) !== String(coach.team_id)
        ) {
          return res.status(403).json({
            error:'A fixture can only be added to your Coach workspace.'
          });
        }

        teamId = coach.team_id || null;
        coachId = coach.id;
      }

      const { data, error } = await supabase
        .from('fixtures')
        .insert({
          team_id:teamId,
          coach_id:coachId,
          opponent:String(opponent).trim(),
          fixture_date:fixtureDate,
          fixture_time:fixtureTime || null,
          venue:venue || null,
          venue_address:venueAddress || null,
          venue_postcode:venuePostcode || null,
          city:city ? titleCase(city) : null,
          country:country ? titleCase(country) : 'England',
          home_or_away:homeOrAway || 'Home',
          format:format || '11',
          notes:notes || null,
          created_at:new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        fixture:data,
        message:'Fixture added'
      });
    } catch (error) {
      console.error('[Fixtures POST]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  requireRole('Coach','Stratex'),
  async (req, res) => {
    try {
      const fixture = await loadFixture(req.params.id);

      if (req.user.accountType === 'Coach') {
        const coach = await coachContext(req.user.id);

        if (!fixtureInCoachWorkspace(fixture, coach)) {
          return res.status(403).json({
            error:'You can only edit fixtures in your Coach workspace.'
          });
        }
      }

      const {
        opponent,
        fixtureDate,
        fixtureTime,
        venue,
        venueAddress,
        venuePostcode,
        city,
        country,
        homeOrAway,
        format,
        notes
      } = req.body || {};

      const updates = {};

      if (opponent !== undefined) {
        const next = String(opponent || '').trim();
        if (!next) {
          return res.status(400).json({ error:'Opponent is required.' });
        }
        updates.opponent = next;
      }
      if (fixtureDate !== undefined) updates.fixture_date = fixtureDate;
      if (fixtureTime !== undefined) updates.fixture_time = fixtureTime || null;
      if (venue !== undefined) updates.venue = venue || null;
      if (venueAddress !== undefined) updates.venue_address = venueAddress || null;
      if (venuePostcode !== undefined) updates.venue_postcode = venuePostcode || null;
      if (city !== undefined) updates.city = city ? titleCase(city) : null;
      if (country !== undefined) updates.country = country ? titleCase(country) : 'England';
      if (homeOrAway !== undefined) updates.home_or_away = homeOrAway || 'Home';
      if (format !== undefined) updates.format = format || '11';
      if (notes !== undefined) updates.notes = notes || null;

      const { data, error } = await supabase
        .from('fixtures')
        .update(updates)
        .eq('id', fixture.id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        fixture:data,
        message:'Fixture updated'
      });
    } catch (error) {
      console.error('[Fixtures PUT]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('Coach','Stratex'),
  async (req, res) => {
    try {
      const fixture = await loadFixture(req.params.id);

      if (req.user.accountType === 'Coach') {
        const coach = await coachContext(req.user.id);

        if (!fixtureInCoachWorkspace(fixture, coach)) {
          return res.status(403).json({
            error:'You can only delete fixtures in your Coach workspace.'
          });
        }
      }

      const { error } = await supabase
        .from('fixtures')
        .delete()
        .eq('id', fixture.id);

      if (error) throw error;

      res.json({ message:'Fixture deleted' });
    } catch (error) {
      console.error('[Fixtures DELETE]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
