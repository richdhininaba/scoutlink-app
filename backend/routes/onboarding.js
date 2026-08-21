'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const COACH_ONBOARDING_VERSION = 16;

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function cleanAgeGroups(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(
    list
      .map(item => String(item || '').trim().toUpperCase())
      .filter(item => /^U(?:[7-9]|1[0-6])$/.test(item))
  ));
}

async function getProgress(accountType, userId) {
  const { data, error } = await supabase
    .from('onboarding_progress')
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

  const { data, error } = await supabase
    .from('onboarding_progress')
    .upsert(row, { onConflict: 'account_type,user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

function normaliseCoachDraft(raw) {
  raw = cleanObject(raw);
  const state = cleanObject(raw.state);

  /*
   * V16 is the current Coach Desk / Field setup shape. Legacy fields remain
   * alongside it so a draft created by an older deployment can still be
   * resumed without losing useful information.
   */
  return {
    version: COACH_ONBOARDING_VERSION,
    step: Math.max(0, Math.min(3, Number(raw.step) || 0)),
    maxUnlocked: Math.max(0, Math.min(3, Number(raw.maxUnlocked) || 0)),
    state: {
      firstName: cleanText(
        state.firstName || state.coachFirst,
        120
      ),
      lastName: cleanText(
        state.lastName || state.coachLast,
        120
      ),
      email: cleanText(
        state.email || state.coachEmail,
        240
      ),
      phone: cleanText(state.phone, 80),
      country: cleanText(state.country, 120) || 'United Kingdom',
      role: cleanText(
        state.role || state.roleAtClub,
        120
      ) || 'Head coach — youth',

      teamName: cleanText(state.teamName, 240),
      teamType: cleanText(state.teamType, 120) || 'Grassroots club',
      ageGroup: cleanText(
        state.ageGroup || (Array.isArray(state.ageGroups) ? state.ageGroups[0] : ''),
        20
      ),
      ageGroups: cleanAgeGroups(state.ageGroups || state.ageGroup),
      region: cleanText(
        state.region || state.homeVenue || state.city,
        500
      ),
      league: cleanText(state.league, 240),

      squadSize: cleanText(state.squadSize, 80),
      teamCount: cleanText(state.teamCount, 20) || '1',
      squadMethod: ['bulk','one','later'].includes(state.squadMethod)
        ? state.squadMethod
        : '',
      assistantEmail: cleanText(state.assistantEmail, 240),
      squadList: cleanText(state.squadList, 12000),

      /*
       * Older first-player fields are retained only for backwards
       * compatibility. They are not used by the V16 design.
       */
      pFirst: cleanText(state.pFirst, 120),
      pLast: cleanText(state.pLast, 120),
      pAgeGroup: cleanText(state.pAgeGroup, 20),
      pPosition: cleanText(state.pPosition, 40),
      pFoot: cleanText(state.pFoot, 20) || 'Right'
    },
    savedAt: cleanText(raw.savedAt, 80) || new Date().toISOString()
  };
}

async function coachRecord(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select([
      'id','first_name','last_name','phone','role_at_club',
      'team_id','team_name','team_county','team_league',
      'team_age_groups','team_home_venue','team_website',
      'team_contact_email','is_super_user'
    ].join(','))
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const e = new Error('Coach not found');
    e.status = 404;
    throw e;
  }
  return data;
}

async function ensureExistingTeamInviteCompleted(userId) {
  const coach = await coachRecord(userId);

  /*
   * An assistant already linked to a team is joining an existing workspace,
   * not creating a new one. This also heals assistants invited before the
   * invitation workflow began creating onboarding_progress rows.
   */
  if (!coach.team_id || coach.is_super_user) return null;

  return upsertProgress('Coach', coach.id, {
    setup_wizard_completed: true,
    wizard_data: {
      joinedExistingTeam: true,
      teamId: coach.team_id,
      teamName: coach.team_name || null,
      completedAt: new Date().toISOString(),
      onboardingVersion: COACH_ONBOARDING_VERSION
    }
  });
}

async function updateCanonicalTeam(teamId, patch) {
  if (!teamId) return;

  const teamPatch = {};
  if (patch.team_name !== undefined) teamPatch.team_name = patch.team_name;
  if (patch.team_county !== undefined) teamPatch.county = patch.team_county;
  if (patch.team_league !== undefined) {
    teamPatch.league = patch.team_league;
    teamPatch.league_name = patch.team_league;
  }
  if (patch.team_website !== undefined) {
    teamPatch.team_website_url = patch.team_website;
  }
  if (patch.team_contact_email !== undefined) {
    teamPatch.contact_email = patch.team_contact_email;
  }

  if (!Object.keys(teamPatch).length) return;

  const { error } = await supabase
    .from('school_academy_teams')
    .update(teamPatch)
    .eq('id', teamId);

  if (error) throw error;
}

const ONBOARDING_ROLES = ['Coach','Scout','Stratex','Player'];

router.get(
  '/me',
  requireAuth,
  requireRole(...ONBOARDING_ROLES),
  async (req, res) => {
    try {
      let progress = await getProgress(req.user.accountType, req.user.id);

      if (!progress && req.user.accountType === 'Coach') {
        progress = await ensureExistingTeamInviteCompleted(req.user.id);
      }

      res.json({
        data: progress || {
          account_type: req.user.accountType,
          user_id: req.user.id,
          setup_wizard_completed: false,
          wizard_data: {}
        }
      });
    } catch (error) {
      console.error('[Onboarding me]', error);
      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Internal server error'
      });
    }
  }
);

router.post(
  '/coach-draft',
  requireAuth,
  requireRole('Coach'),
  async (req, res) => {
    try {
      let current = await getProgress('Coach', req.user.id);

      if (!current) {
        current = await ensureExistingTeamInviteCompleted(req.user.id);
      }

      if (current && current.setup_wizard_completed) {
        return res.json({
          message: 'Coach setup is already complete',
          data: current
        });
      }

      const draft = normaliseCoachDraft(
        req.body && (req.body.draft || req.body)
      );
      const currentData = cleanObject(current && current.wizard_data);

      const progress = await upsertProgress('Coach', req.user.id, {
        setup_wizard_completed: false,
        wizard_data: {
          ...currentData,
          draft,
          draftSavedAt: new Date().toISOString(),
          draftVersion: COACH_ONBOARDING_VERSION
        }
      });

      res.json({
        message: 'Coach setup draft saved',
        data: progress
      });
    } catch (error) {
      console.error('[Coach onboarding draft]', error);
      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Internal server error'
      });
    }
  }
);

router.post(
  '/coach-wizard',
  requireAuth,
  requireRole('Coach'),
  async (req, res) => {
    try {
      const body = req.body || {};
      const team = cleanObject(body.team);
      const person = cleanObject(body.person);
      const me = await coachRecord(req.user.id);
      const ageGroups = cleanAgeGroups(team.ageGroups || team.ageGroup);
      const squadSize = Number(body.squadSize || body.squad_size || 0) || null;

      /*
       * Personal Coach fields always belong to the signed-in Coach only.
       * They must never be propagated across every Coach sharing team_id.
       */
      const personalPatch = {
        first_name: cleanText(person.firstName, 120) || me.first_name,
        last_name: cleanText(person.lastName, 120) || me.last_name,
        phone: cleanText(person.phone, 80) || null,
        role_at_club: cleanText(person.roleAtClub, 120) || me.role_at_club,
        updated_at: new Date().toISOString()
      };

      const { error: personalError } = await supabase
        .from('coaches')
        .update(personalPatch)
        .eq('id', me.id);
      if (personalError) throw personalError;

      /*
       * An invited assistant is already attached to an existing team. Their
       * setup may update their own identity but cannot rewrite the team's
       * shared workspace configuration.
       */
      const mayConfigureTeam = me.is_super_user || !me.team_id;

      let teamPatch = null;
      if (mayConfigureTeam) {
        teamPatch = {
          team_name: cleanText(team.teamName, 240) || me.team_name || null,
          team_league: cleanText(team.league, 240) || null,
          team_county: cleanText(team.region || team.county, 160) || me.team_county || null,
          team_age_groups: ageGroups,
          team_home_venue: cleanText(team.homeVenue, 500) || me.team_home_venue || null,
          updated_at: new Date().toISOString()
        };

        if (me.team_id) {
          /*
           * Only shared team_* values are mirrored to Coaches in the same
           * workspace. Names, phone numbers and roles remain untouched.
           */
          const { error: teamCoachError } = await supabase
            .from('coaches')
            .update(teamPatch)
            .eq('team_id', me.team_id);
          if (teamCoachError) throw teamCoachError;

          await updateCanonicalTeam(me.team_id, teamPatch);
        } else {
          const { error: ownTeamError } = await supabase
            .from('coaches')
            .update(teamPatch)
            .eq('id', me.id);
          if (ownTeamError) throw ownTeamError;
        }
      }

      const firstPlayer = cleanObject(body.firstPlayer);
      const squadMethod = ['bulk','one','later'].includes(body.squadMethod)
        ? body.squadMethod
        : 'later';

      const effectiveTeamName = mayConfigureTeam
        ? cleanText(team.teamName, 240) || me.team_name
        : me.team_name;

      const effectiveAgeGroups = mayConfigureTeam
        ? ageGroups
        : cleanAgeGroups(me.team_age_groups);

      const wizardData = {
        person: {
          firstName: personalPatch.first_name,
          lastName: personalPatch.last_name,
          roleAtClub: personalPatch.role_at_club,
          phone: personalPatch.phone
        },
        team: {
          teamName: effectiveTeamName || '',
          ageGroups: effectiveAgeGroups,
          ageGroup: effectiveAgeGroups[0] || '',
          league: mayConfigureTeam
            ? cleanText(team.league, 240)
            : cleanText(me.team_league, 240),
          homeVenue: mayConfigureTeam
            ? cleanText(team.homeVenue || team.region || team.city, 500)
            : cleanText(me.team_home_venue, 500),
          region: mayConfigureTeam
            ? cleanText(team.region || team.homeVenue || team.city, 160)
            : cleanText(me.team_county || me.team_home_venue, 160)
        },
        squadSize,
        squadMethod,
        squadList: cleanText(body.squadList, 12000),
        teamCount: cleanText(body.teamCount, 20) || '1',
        conciergeOffer: Boolean(squadSize && squadSize >= 8),
        assistantInviteEmail: cleanText(body.assistantInviteEmail, 240),
        firstPlayer: Object.keys(firstPlayer).length ? firstPlayer : null,
        joinedExistingTeam: Boolean(me.team_id && !me.is_super_user),
        draft: null,
        draftVersion: COACH_ONBOARDING_VERSION,
        onboardingVersion: COACH_ONBOARDING_VERSION,
        completedAt: new Date().toISOString()
      };

      const progress = await upsertProgress('Coach', req.user.id, {
        setup_wizard_completed: true,
        wizard_data: wizardData
      });

      res.json({
        message: 'Coach setup saved',
        data: progress,
        conciergeOffer: wizardData.conciergeOffer,
        squadMethod,
        joinedExistingTeam: wizardData.joinedExistingTeam
      });
    } catch (error) {
      console.error('[Coach onboarding]', error);
      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Internal server error'
      });
    }
  }
);

router.post(
  '/scout-wizard',
  requireAuth,
  requireRole('Scout'),
  async (req, res) => {
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

      const { error: scoutError } = await supabase
        .from('scouts')
        .update({
          scout_preferences: prefs,
          preferences_set: true
        })
        .eq('id', req.user.id);
      if (scoutError) throw scoutError;

      const progress = await upsertProgress('Scout', req.user.id, {
        setup_wizard_completed: true,
        wizard_data: {
          ...prefs,
          completedAt: new Date().toISOString()
        }
      });

      res.json({
        message: 'Scout setup saved',
        data: progress,
        preferences: prefs
      });
    } catch (error) {
      console.error('[Scout onboarding]', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
