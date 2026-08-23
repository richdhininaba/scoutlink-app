'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const COACH_ONBOARDING_VERSION = 16;
const SCOUT_ONBOARDING_VERSION = 6;

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
}

function cleanList(value, maxItems = 50, maxLength = 120) {
  const list = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  return Array.from(new Set(
    list
      .map(item => cleanText(item, maxLength))
      .filter(Boolean)
  )).slice(0, maxItems);
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

  return {
    version: COACH_ONBOARDING_VERSION,
    step: Math.max(0, Math.min(3, Number(raw.step) || 0)),
    maxUnlocked: Math.max(0, Math.min(3, Number(raw.maxUnlocked) || 0)),
    state: {
      firstName: cleanText(state.firstName || state.coachFirst, 120),
      lastName: cleanText(state.lastName || state.coachLast, 120),
      email: cleanText(state.email || state.coachEmail, 240),
      phone: cleanText(state.phone, 80),
      country: cleanText(state.country, 120) || 'United Kingdom',
      role: cleanText(state.role || state.roleAtClub, 120) || 'Head coach — youth',

      teamName: cleanText(state.teamName, 240),
      teamType: cleanText(state.teamType, 120) || 'Grassroots club',
      ageGroup: cleanText(
        state.ageGroup || (Array.isArray(state.ageGroups) ? state.ageGroups[0] : ''),
        20
      ),
      ageGroups: cleanAgeGroups(state.ageGroups || state.ageGroup),
      region: cleanText(state.region || state.homeVenue || state.city, 500),
      league: cleanText(state.league, 240),

      squadSize: cleanText(state.squadSize, 80),
      teamCount: cleanText(state.teamCount, 20) || '1',
      squadMethod: ['bulk','one','later'].includes(state.squadMethod)
        ? state.squadMethod
        : '',
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

async function scoutRecord(userId) {
  const { data, error } = await supabase
    .from('scouts')
    .select([
      'id','first_name','last_name','email','phone','club_name','club_league',
      'scout_team_id','scout_preferences','preferences_set',
      'subscription_plan','plan_start','plan_end','is_super_user','is_demo'
    ].join(','))
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const e = new Error('Scout not found');
    e.status = 404;
    throw e;
  }
  return data;
}

async function ensureExistingTeamInviteCompleted(userId) {
  const coach = await coachRecord(userId);

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

function scoutWizardInput(body, scout) {
  const person = cleanObject(body.person);
  const organisation = cleanObject(
    body.organisation || body.organization || body.team
  );
  const setup = cleanObject(
    body.compatibilitySetup || body.setup || body.scoutSetup
  );

  const fullName = cleanText(body.fullName || body.full_name, 240);
  const fullParts = fullName.split(/\s+/).filter(Boolean);

  const firstName =
    cleanText(person.firstName || body.firstName || body.first_name, 120) ||
    (fullParts.length ? fullParts[0] : '') ||
    scout.first_name;

  const lastName =
    cleanText(person.lastName || body.lastName || body.last_name, 120) ||
    (fullParts.length > 1 ? fullParts.slice(1).join(' ') : '') ||
    scout.last_name;

  const organisationName =
    cleanText(
      organisation.name ||
      organisation.teamName ||
      organisation.organisationName ||
      organisation.organizationName ||
      body.organisationName ||
      body.organizationName ||
      body.clubName ||
      body.club_name ||
      scout.club_name,
      240
    );

  const role =
    cleanText(
      person.role ||
      person.scoutingRole ||
      body.scoutingRole ||
      body.scouting_role,
      120
    ) || 'Scout';

  const teamWeaknesses = cleanList(
    setup.teamWeaknesses ||
    setup.teamNeeds ||
    body.teamWeaknesses ||
    body.team_weaknesses
  );

  const preferredPositions = cleanList(
    setup.preferredPositions ||
    setup.positions ||
    body.preferredPositions ||
    body.preferred_positions
  );

  const roleExpectations = cleanList(
    setup.roleExpectations ||
    setup.requiredRoles ||
    body.roleExpectations ||
    body.role_expectations
  );

  const playingStyle =
    cleanText(
      setup.playingStyle ||
      body.playingStyle ||
      body.playing_style,
      180
    );

  const formation =
    cleanText(
      setup.formation ||
      body.formation,
      80
    );

  const developmentPathways = cleanList(
    setup.developmentPathways ||
    setup.longTermGoals ||
    body.developmentPathways ||
    body.long_term_goals
  );

  const ageGroups = cleanAgeGroups(
    setup.ageGroups ||
    body.ageGroups ||
    body.age_groups
  );

  const scoutCountry =
    cleanText(
      person.country ||
      body.scoutCountry ||
      body.scout_country,
      120
    ) || 'United Kingdom';

  const scoutRegion =
    cleanText(
      organisation.region ||
      setup.scoutRegion ||
      body.scoutRegion ||
      body.scout_region,
      180
    );

  const website =
    cleanText(
      organisation.website ||
      organisation.teamWebsite ||
      body.teamWebsite ||
      body.website,
      500
    );

  const organisationType =
    cleanText(
      organisation.type ||
      organisation.organisationType ||
      organisation.organizationType ||
      body.organisationType ||
      body.organizationType,
      160
    );

  const expectedScouts =
    cleanText(
      organisation.expectedScouts ||
      organisation.expectedUsers ||
      body.expectedScouts ||
      body.expectedUsers,
      40
    );

  const alertPreference =
    cleanText(
      body.alertPreference ||
      body.alert_preference,
      80
    ) || 'weekly_digest';

  return {
    person: {
      firstName,
      lastName,
      phone: cleanText(person.phone || body.phone || scout.phone, 80),
      country: scoutCountry,
      role
    },
    organisation: {
      name: organisationName,
      type: organisationType,
      region: scoutRegion,
      website,
      expectedScouts
    },
    setup: {
      teamWeaknesses,
      preferredPositions,
      roleExpectations,
      playingStyle,
      formation,
      developmentPathways,
      ageGroups
    },
    alertPreference,
    setupSummary: cleanText(body.setupSummary, 1000)
  };
}

async function saveScoutTeam(scout, input) {
  const organisation = input.organisation;
  const setup = input.setup;
  const now = new Date().toISOString();
  let team = null;

  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (result.error) throw result.error;
    team = result.data || null;
  }

  const teamPatch = {
    team_name:
      organisation.name ||
      team?.team_name ||
      scout.club_name ||
      `${input.person.firstName} ${input.person.lastName} Scout Workspace`.trim(),
    club_name:
      organisation.name ||
      team?.club_name ||
      scout.club_name ||
      null,
    country: input.person.country || team?.country || 'England',
    scout_region: organisation.region || team?.scout_region || null,
    preferred_positions: setup.preferredPositions,
    age_groups: setup.ageGroups,
    role_expectations: setup.roleExpectations,
    long_term_goals: setup.developmentPathways,
    formation: setup.formation || team?.formation || null,
    playing_style: setup.playingStyle || team?.playing_style || null,
    team_website_url: organisation.website || team?.team_website_url || null,
    scoring_setup: {
      version: 'v4.0.0',
      source: 'scout-onboarding-v6',
      teamWeaknesses: setup.teamWeaknesses,
      preferredPositions: setup.preferredPositions,
      roleExpectations: setup.roleExpectations,
      playingStyle: setup.playingStyle,
      formation: setup.formation,
      developmentPathways: setup.developmentPathways,
      ageGroups: setup.ageGroups
    },
    updated_at: now
  };

  if (team) {
    if (scout.is_super_user) {
      const { data, error } = await supabase
        .from('scout_teams')
        .update(teamPatch)
        .eq('id', team.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    return team;
  }

  const { data, error } = await supabase
    .from('scout_teams')
    .insert({
      ...teamPatch,
      status: 'active',
      subscription_plan: scout.subscription_plan || 'Core',
      subscription_start_at: scout.plan_start || now,
      subscription_renewal_at: scout.plan_end || null,
      activated_at: now,
      plan_limits: {},
      limit_overrides: {}
    })
    .select('*')
    .single();

  if (error) throw error;

  const { error: scoutError } = await supabase
    .from('scouts')
    .update({
      scout_team_id: data.id,
      is_super_user: true,
      updated_at: now
    })
    .eq('id', scout.id);

  if (scoutError) throw scoutError;

  return data;
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
      const scout = await scoutRecord(req.user.id);
      const input = scoutWizardInput(body, scout);
      const team = await saveScoutTeam(scout, input);
      const now = new Date().toISOString();

      const prefs = {
        ...(scout.scout_preferences || {}),
        teamWeaknesses: input.setup.teamWeaknesses,
        preferredPositions: input.setup.preferredPositions,
        ageGroups: input.setup.ageGroups,
        scoutCountry: input.person.country,
        scoutRegion: input.organisation.region,
        alertPreference: input.alertPreference,
        setupSummary: input.setupSummary,
        scoutingRole: input.person.role,
        organisation: {
          name: input.organisation.name,
          type: input.organisation.type,
          region: input.organisation.region,
          website: input.organisation.website,
          expectedScouts: input.organisation.expectedScouts
        },
        compatibilitySetup: {
          teamWeaknesses: input.setup.teamWeaknesses,
          preferredPositions: input.setup.preferredPositions,
          roleExpectations: input.setup.roleExpectations,
          playingStyle: input.setup.playingStyle,
          formation: input.setup.formation,
          developmentPathways: input.setup.developmentPathways,
          ageGroups: input.setup.ageGroups
        },
        setupSource: 'scout-desk-field-v6',
        setupVersion: SCOUT_ONBOARDING_VERSION
      };

      const { error: scoutError } = await supabase
        .from('scouts')
        .update({
          first_name: input.person.firstName,
          last_name: input.person.lastName,
          phone: input.person.phone || null,
          club_name: input.organisation.name || scout.club_name || null,
          scout_team_id: team.id,
          scout_preferences: prefs,
          preferences_set: true,
          is_super_user: scout.scout_team_id
            ? scout.is_super_user
            : true,
          updated_at: now
        })
        .eq('id', req.user.id);

      if (scoutError) throw scoutError;

      const wizardData = {
        person: input.person,
        organisation: input.organisation,
        compatibilitySetup: input.setup,
        scoutTeamId: team.id,
        scoutTeamName: team.team_name,
        onboardingVersion: SCOUT_ONBOARDING_VERSION,
        completedAt: now
      };

      const progress = await upsertProgress('Scout', req.user.id, {
        setup_wizard_completed: true,
        wizard_data: wizardData
      });

      res.json({
        message: 'Scout setup saved',
        data: progress,
        preferences: prefs,
        scoutTeam: {
          id: team.id,
          teamName: team.team_name,
          subscriptionPlan: team.subscription_plan,
          isSuperUser: scout.scout_team_id
            ? scout.is_super_user
            : true
        }
      });
    } catch (error) {
      console.error('[Scout onboarding]', error);
      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
