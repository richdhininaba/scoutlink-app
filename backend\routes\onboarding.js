'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

function cleanText(v) {
  return String(v || '').trim();
}

async function upsertProgress(accountType, userId, patch) {
  const row = {
    account_type: accountType,
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...patch
  };
  const { data, error } = await supabase.from('onboarding_progress')
    .upsert(row, { onConflict: 'account_type,user_id' })
    .select().single();
  if (error) throw error;
  return data;
}

const TOUR_ROLES = ['Coach','Scout','Stratex','Player'];

router.get('/me', requireAuth, requireRole(...TOUR_ROLES), async (req, res) => {
  try {
    const { data } = await supabase.from('onboarding_progress')
      .select('*').eq('account_type', req.user.accountType).eq('user_id', req.user.id).maybeSingle();
    res.json({ data: data || {
      account_type: req.user.accountType,
      user_id: req.user.id,
      setup_wizard_completed: false,
      product_tour_completed: false,
      wizard_data: {},
      tour_data: {}
    }});
  } catch(err) {
    console.error('[Onboarding me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/coach-wizard', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const body = req.body || {};
    const team = body.team || {};
    const squadSize = Number(body.squadSize || body.squad_size || 0) || null;
    const updates = {};
    if (cleanText(team.teamName)) updates.team_name = cleanText(team.teamName);
    if (cleanText(team.league)) updates.team_league = cleanText(team.league);
    if (cleanText(team.city)) updates.team_county = cleanText(team.city);
    if (Object.keys(updates).length) await supabase.from('coaches').update(updates).eq('id', req.user.id);

    const wizardData = {
      team,
      squadSize,
      conciergeOffer: squadSize && squadSize >= 8,
      assistantInviteEmail: cleanText(body.assistantInviteEmail),
      firstPlayer: body.firstPlayer || null,
      completedAt: new Date().toISOString()
    };
    const progress = await upsertProgress('Coach', req.user.id, {
      setup_wizard_completed: true,
      wizard_data: wizardData
    });
    res.json({ message: 'Coach setup saved', data: progress, conciergeOffer: wizardData.conciergeOffer });
  } catch(err) {
    console.error('[Coach onboarding]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/scout-wizard', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const body = req.body || {};
    const prefs = {
      teamWeaknesses: body.teamWeaknesses || body.team_weaknesses || [],
      preferredPositions: body.preferredPositions || body.preferred_positions || [],
      ageGroups: body.ageGroups || body.age_groups || [],
      scoutCountry: body.scoutCountry || body.scout_country || '',
      scoutRegion: body.scoutRegion || body.scout_region || '',
      alertPreference: body.alertPreference || body.alert_preference || 'weekly_digest',
      setupSummary: body.setupSummary || '',
      setupSource: 'wizard'
    };
    await supabase.from('scouts').update({ scout_preferences: prefs, preferences_set: true }).eq('id', req.user.id);
    const progress = await upsertProgress('Scout', req.user.id, {
      setup_wizard_completed: true,
      wizard_data: { ...prefs, completedAt: new Date().toISOString() }
    });
    res.json({ message: 'Scout setup saved', data: progress, preferences: prefs });
  } catch(err) {
    console.error('[Scout onboarding]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/tour', requireAuth, requireRole(...TOUR_ROLES), async (req, res) => {
  try {
    const body = req.body || {};
    const allowed = ['started','completed','dismissed'];
    const status = allowed.includes(body.status) ? body.status : 'completed';
    const now = new Date().toISOString();
    const tourData = {
      status,
      stepIndex: Number.isFinite(Number(body.stepIndex)) ? Number(body.stepIndex) : 0,
      checkpoints: Array.isArray(body.checkpoints) ? body.checkpoints : [],
      updatedAt: now
    };
    if (status === 'completed') tourData.completedAt = now;
    if (status === 'dismissed') tourData.dismissedAt = now;
    const progress = await upsertProgress(req.user.accountType, req.user.id, {
      product_tour_completed: status === 'completed' || status === 'dismissed',
      tour_data: tourData
    });
    res.json({ message: 'Product tour progress saved', data: progress });
  } catch(err) {
    console.error('[Tour onboarding]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
