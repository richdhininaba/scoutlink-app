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
function cleanAgeGroups(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(list.map(v => String(v || '').trim().toUpperCase()).filter(v => /^U(?:[7-9]|1[0-6])$/.test(v))));
}
async function getProgress(accountType, userId) {
  const { data, error } = await supabase.from('onboarding_progress')
    .select('*').eq('account_type', accountType).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data || null;
}
async function upsertProgress(accountType, userId, patch) {
  const row = { account_type: accountType, user_id: userId, updated_at: new Date().toISOString(), ...patch };
  const { data, error } = await supabase.from('onboarding_progress')
    .upsert(row, { onConflict: 'account_type,user_id' }).select().single();
  if (error) throw error;
  return data;
}
function normaliseCoachDraft(raw) {
  raw = cleanObject(raw);
  const state = cleanObject(raw.state);
  return {
    version: 14,
    step: Math.max(0, Math.min(3, Number(raw.step) || 0)),
    maxUnlocked: Math.max(0, Math.min(3, Number(raw.maxUnlocked) || 0)),
    state: {
      coachFirst: cleanText(state.coachFirst, 120),
      coachLast: cleanText(state.coachLast, 120),
      coachEmail: cleanText(state.coachEmail, 240),
      roleAtClub: cleanText(state.roleAtClub, 120) || 'Head Coach',
      phone: cleanText(state.phone, 80),
      teamName: cleanText(state.teamName, 240),
      league: cleanText(state.league, 240),
      ageGroups: cleanAgeGroups(state.ageGroups || state.ageGroup),
      homeVenue: cleanText(state.homeVenue || state.city, 500),
      squadSize: cleanText(state.squadSize, 20),
      squadMethod: ['bulk','one','later'].includes(state.squadMethod) ? state.squadMethod : '',
      assistantEmail: cleanText(state.assistantEmail, 240),
      squadList: cleanText(state.squadList, 12000),
      // Legacy V10 fields are retained so any in-flight draft remains readable.
      ageGroup: cleanText(state.ageGroup, 20),
      city: cleanText(state.city, 160),
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

router.post('/coach-draft', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const current = await getProgress('Coach', req.user.id);
    if (current && current.setup_wizard_completed) {
      return res.json({ message: 'Coach setup is already complete', data: current });
    }
    const draft = normaliseCoachDraft(req.body && (req.body.draft || req.body));
    const currentData = cleanObject(current && current.wizard_data);
    const progress = await upsertProgress('Coach', req.user.id, {
      setup_wizard_completed: false,
      wizard_data: {
        ...currentData,
        draft,
        draftSavedAt: new Date().toISOString(),
        draftVersion: 14
      }
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
    const person = cleanObject(body.person);
    const ageGroups = cleanAgeGroups(team.ageGroups || team.ageGroup);
    const squadSize = Number(body.squadSize || body.squad_size || 0) || null;
    const updates = {
      first_name: cleanText(person.firstName, 120) || undefined,
      last_name: cleanText(person.lastName, 120) || undefined,
      phone: cleanText(person.phone, 80) || null,
      role_at_club: cleanText(person.roleAtClub, 120) || undefined,
      team_name: cleanText(team.teamName, 240) || undefined,
      team_league: cleanText(team.league, 240) || null,
      team_age_groups: ageGroups,
      team_home_venue: cleanText(team.homeVenue || team.city, 500) || null,
      updated_at: new Date().toISOString()
    };
    Object.keys(updates).forEach(k => { if (updates[k] === undefined) delete updates[k]; });

    const { data: me, error: meError } = await supabase.from('coaches')
      .select('id,team_id').eq('id', req.user.id).single();
    if (meError) throw meError;
    let q = supabase.from('coaches').update(updates);
    q = me && me.team_id ? q.eq('team_id', me.team_id) : q.eq('id', req.user.id);
    const { error: coachUpdateError } = await q;
    if (coachUpdateError) throw coachUpdateError;

    const firstPlayer = cleanObject(body.firstPlayer);
    const squadMethod = ['bulk','one','later'].includes(body.squadMethod) ? body.squadMethod : 'later';
    const wizardData = {
      person: {
        firstName: cleanText(person.firstName,120),
        lastName: cleanText(person.lastName,120),
        roleAtClub: cleanText(person.roleAtClub,120),
        phone: cleanText(person.phone,80)
      },
      team: {
        teamName: cleanText(team.teamName, 240),
        ageGroups,
        ageGroup: ageGroups[0] || cleanText(team.ageGroup,20),
        league: cleanText(team.league, 240),
        homeVenue: cleanText(team.homeVenue || team.city, 500),
        city: cleanText(team.city || team.homeVenue, 160)
      },
      squadSize,
      squadMethod,
      squadList: cleanText(body.squadList, 12000),
      conciergeOffer: Boolean(squadSize && squadSize >= 8),
      assistantInviteEmail: cleanText(body.assistantInviteEmail, 240),
      firstPlayer: Object.keys(firstPlayer).length ? firstPlayer : null,
      draft: null,
      draftVersion: 14,
      completedAt: new Date().toISOString()
    };
    const progress = await upsertProgress('Coach', req.user.id, {
      setup_wizard_completed: true,
      wizard_data: wizardData
    });
    res.json({ message: 'Coach setup saved', data: progress, conciergeOffer: wizardData.conciergeOffer, squadMethod });
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
      .update({ scout_preferences: prefs, preferences_set: true }).eq('id', req.user.id);
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
