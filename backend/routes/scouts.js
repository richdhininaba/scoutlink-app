'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

// Set scout preferences (first login flow)
router.post('/preferences', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { preferredPositions, formationFocus, playingStyle, heightPreference, buildPreference,
            ageRangeMin, ageRangeMax, otherRequirements, footPreference } = req.body;
    const prefs = { preferredPositions: preferredPositions||[], formationFocus: formationFocus||'',
      playingStyle: playingStyle||'', heightPreference: heightPreference||'',
      buildPreference: buildPreference||'', ageRangeMin: ageRangeMin||14,
      ageRangeMax: ageRangeMax||21, otherRequirements: otherRequirements||'',
      footPreference: footPreference||'any', updatedAt: new Date().toISOString() };
    await supabase.from('scouts').update({ scout_preferences: prefs, preferences_set: true }).eq('id', req.user.id);
    res.json({ message: 'Preferences saved', preferences: prefs });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/preferences', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data } = await supabase.from('scouts').select('scout_preferences,preferences_set').eq('id', req.user.id).single();
    res.json({ preferences: data?.scout_preferences||null, preferencesSet: data?.preferences_set||false });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/pipeline', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const scoutId = req.user.accountType === 'Scout' ? req.user.id : req.query.scoutId;
    let q = supabase.from('recruitment_pipeline')
      .select('id,stage,notes,interest_level,created_at,players(id,first_name,last_name,specific_position,primary_position,overall_rating,transfer_value,team_name,age,position_group),scouts(id,first_name,last_name,club_name)', { count:'exact' });
    if (scoutId) q = q.eq('scout_id', scoutId);
    if (req.query.stage) q = q.eq('stage', req.query.stage);
    const { limit = 50 } = req.query;
    q = q.order('updated_at',{ascending:false}).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
