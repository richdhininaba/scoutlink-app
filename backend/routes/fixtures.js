'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

// GET /api/fixtures — list fixtures (filtered by team_id or coach_id)
router.get('/', requireAuth, requireRole('Coach','Scout','Stratex'), async (req, res) => {
try {
  const { teamId, coachId, upcoming, past } = req.query;
  let q = supabase.from('fixtures').select('*', { count: 'exact' });
  if (teamId) q = q.eq('team_id', teamId);
  if (coachId) q = q.eq('coach_id', coachId);
  else if (req.user.accountType === 'Coach') q = q.eq('coach_id', req.user.id);
  
  if (upcoming === 'true') q = q.gte('fixture_date', new Date().toISOString().slice(0,10));
  if (past === 'true') q = q.lt('fixture_date', new Date().toISOString().slice(0,10));
  
  q = q.order('fixture_date', { ascending: true }).limit(100);
  const { data, error, count } = await q;
  if (error) throw error;
  res.json({ data: data || [], total: count || 0 });
} catch(err) { console.error('[Fixtures]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// POST /api/fixtures — add a fixture (Coach or Stratex)
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
try {
  const { opponent, fixtureDate, fixtureTime, venue, venueAddress, venuePostcode, city, country, homeOrAway, format, notes, teamId } = req.body;
  if (!opponent || !fixtureDate) return res.status(400).json({ error: 'opponent and fixtureDate required' });
  
  let coachTeamId = teamId;
  if (!coachTeamId && req.user.accountType === 'Coach') {
    const { data: coach } = await supabase.from('coaches').select('team_id').eq('id', req.user.id).single();
    coachTeamId = coach?.team_id || null;
  }
  
  const { data, error } = await supabase.from('fixtures').insert({
    team_id: coachTeamId || null,
    coach_id: req.user.id,
    opponent: opponent.trim(),
    fixture_date: fixtureDate,
    fixture_time: fixtureTime || null,
    venue: venue || null,
    venue_address: venueAddress || null,
    venue_postcode: venuePostcode || null,
    city: city || null,
    country: country || 'England',
    home_or_away: homeOrAway || 'Home',
    format: format || '11',
    notes: notes || null,
    created_at: new Date().toISOString()
  }).select().single();
  if (error) throw error;
  res.status(201).json({ fixture: data, message: 'Fixture added' });
} catch(err) { console.error('[Fixtures POST]', err); res.status(500).json({ error: 'Internal server error' }); }
});

// PUT /api/fixtures/:id — update a fixture
router.put('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
try {
  const { opponent, fixtureDate, fixtureTime, venue, venueAddress, venuePostcode, city, country, homeOrAway, format, notes } = req.body;
  const updates = {};
  if (opponent) updates.opponent = opponent;
  if (fixtureDate) updates.fixture_date = fixtureDate;
  if (fixtureTime !== undefined) updates.fixture_time = fixtureTime;
  if (venue !== undefined) updates.venue = venue;
  if (venueAddress !== undefined) updates.venue_address = venueAddress;
  if (venuePostcode !== undefined) updates.venue_postcode = venuePostcode;
  if (city !== undefined) updates.city = city;
  if (country !== undefined) updates.country = country;
  if (homeOrAway) updates.home_or_away = homeOrAway;
  if (format) updates.format = format;
  if (notes !== undefined) updates.notes = notes;
  const { data, error } = await supabase.from('fixtures').update(updates).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json({ fixture: data, message: 'Fixture updated' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// DELETE /api/fixtures/:id
router.delete('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
try {
  const { error } = await supabase.from('fixtures').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ message: 'Fixture deleted' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
