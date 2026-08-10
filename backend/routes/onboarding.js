'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

async function getProgress(accountType, userId) {
  const { data, error } = await supabase.from('onboarding_progress')
    .select('*')
    .eq('account_type', accountType)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
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
    .select()
    .single();
  if (error) throw error;
  return data;
}

function normaliseCoachDraft(raw) {
  raw = cleanObject(raw);
  const state = cleanObject(raw.state);
  return {
    version: 10,
    step: Math.max(0, Math.min(3, Number(raw.step) || 0)),
    maxUnlocked: Math.max(0, Math.min(3, Number(raw.maxUnlocked) || 0)),
    state: {
      coachFirst: cleanText(state.coachFirst, 120),
      coachLast: cleanText(state.coachLast, 120),
      coachEmail: cleanText(state.coachEmail, 240),
      teamName: cleanText(state.teamName, 240),
      ageGroup: cleanText(state.ageGroup, 20),
      league: cleanText(state.league, 240),
      city: cleanText(state.city, 160),
      squadSize: cleanText(state.squadSize, 20),
      assistantEmail: cleanText(state.assistantEmail, 240),
      squadList: cleanText(state.squadList, 12000),
      pFirst: cleanText(state.pFirst, 120),
      pLast: cleanText(state.pLast, 120),
      pAgeGroup: cleanText(state.pAgeGroup, 20),
      pPosition: cleanText(state.pPosition, 40),
      pFoot: cleanText(state.pFoot, 20) || 'Right'
    },
    savedAt: cleanText(raw.savedAt, 80) || new Date().toISOString()
  };
}

const ONBOARDING_ROLES = ['Coach','Scout','Stratex','Player'];

router.get('/me', requireAuth, requireRole(...ONBOARDING_ROLES), async (req, res) => {
  try {
    const progress = await getProgress(req.user.accountType, req.user.id);
    res.json({ data: progress || {
      account_type: req.user.accountType,
      user_id: req.user.id,
      setup_wizard_completed: false,
      wizard_data: {}
    }});
  } catch (err) {
    console.error('[Onboarding me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/*
 * Coach Desk and Coach Field use the same authenticated draft. The route only
 * stores known setup fields and never downgrades a completed onboarding flow.
 */
router.post('/coach-draft', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const current = await getProgress('Coach', req.user.id);
    if (current && current.setup_wizard_completed) {
      return res.json({ message: 'Coach setup is already complete', data: current });
    }

    const draft = normaliseCoachDraft(req.body && (req.body.draft || req.body));
    const currentData = cleanObject(current && current.wizard_data);
    const wizardData = {
      ...currentData,
      draft,
      draftSavedAt: new Date().toISOString(),
      draftVersion: 10
    };

    const progress = await upsertProgress('Coach', req.user.id, {
      setup_wizard_completed: false,
      wizard_data: wizardData
    });
    res.json({ message: 'Coach setup draft saved', data: progress });
  } catch (err) {
    console.error('[Coach onboarding draft]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/coach-wizard', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const body = req.body || {};
    const team = cleanObject(body.team);
    const squadSize = Number(body.squadSize || body.squad_size || 0) || null;
    const updates = {};

    if (cleanText(team.teamName, 240)) updates.team_name = cleanText(team.teamName, 240);
    if (cleanText(team.league, 240)) updates.team_league = cleanText(team.league, 240);
    if (cleanText(team.city, 160)) updates.team_county = cleanText(team.city, 160);
    if (Object.keys(updates).length) {
      const { error: coachUpdateError } = await supabase.from('coaches')
        .update(updates)
        .eq('id', req.user.id);
      if (coachUpdateError) throw coachUpdateError;
    }

    const firstPlayer = cleanObject(body.firstPlayer);
    const wizardData = {
      team: {
        teamName: cleanText(team.teamName, 240),
        ageGroup: cleanText(team.ageGroup, 20),
        league: cleanText(team.league, 240),
        city: cleanText(team.city, 160)
      },
      squadSize,
      squadList: cleanText(body.squadList, 12000),
      conciergeOffer: Boolean(squadSize && squadSize >= 8),
      assistantInviteEmail: cleanText(body.assistantInviteEmail, 240),
      firstPlayer: Object.keys(firstPlayer).length ? firstPlayer : null,
      draft: null,
      draftVersion: 10,
      completedAt: new Date().toISOString()
    };

    const progress = await upsertProgress('Coach', req.user.id, {
      setup_wizard_completed: true,
      wizard_data: wizardData
    });

    res.json({
      message: 'Coach setup saved',
      data: progress,
      conciergeOffer: wizardData.conciergeOffer
    });
  } catch (err) {
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

    const { error: scoutError } = await supabase.from('scouts')
      .update({ scout_preferences: prefs, preferences_set: true })
      .eq('id', req.user.id);
    if (scoutError) throw scoutError;

    const progress = await upsertProgress('Scout', req.user.id, {
      setup_wizard_completed: true,
      wizard_data: { ...prefs, completedAt: new Date().toISOString() }
    });
    res.json({ message: 'Scout setup saved', data: progress, preferences: prefs });
  } catch (err) {
    console.error('[Scout onboarding]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
