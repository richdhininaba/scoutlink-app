'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateId } = require('../utils/auth');
const email = require('../services/email');
const config = require('../config');
const { isDemoSession, applyRealDataFilter, demoWriteFields } = require('../utils/demo');
const { sendDbError } = require('../utils/dbErrors');
const { maybeRunSeasonalAgeGroupRollover } = require('../services/playerAgeGroups');

const COACH_PROFILE_SELECT = [
  'id','coach_id','first_name','last_name','email','phone',
  'team_id','team_name','team_county','team_league','team_age_groups',
  'team_home_venue','team_website','team_contact_email',
  'role_at_club','data_policy_agreed','last_login','is_active',
  'created_at','updated_at','registration_complete','is_super_user',
  'notification_preferences','is_demo'
].join(',');

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function sameTeam(a, b) {
  if (!a || !b) return false;
  if (a.team_id && b.team_id) return String(a.team_id) === String(b.team_id);
  return !!(a.team_name && b.team_name && String(a.team_name) === String(b.team_name));
}

async function coachRecord(id) {
  const { data, error } = await supabase
    .from('coaches')
    .select(COACH_PROFILE_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw requestError('Coach not found', 404);
  return data;
}

async function uniqueLoginCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const checks = await Promise.all(
      ['scouts','coaches','players','stratex'].map(table =>
        supabase.from(table).select('id').eq('login_code', code).maybeSingle()
      )
    );
    if (!checks.some(result => result.data)) return code;
  }
  throw requestError('Could not generate unique login code', 500);
}

async function markInvitedCoachOnboardingComplete(newCoach, inviterId) {
  const now = new Date().toISOString();
  const row = {
    account_type: 'Coach',
    user_id: newCoach.id,
    setup_wizard_completed: true,
    wizard_data: {
      joinedExistingTeam: true,
      invitedBy: inviterId,
      teamId: newCoach.team_id || null,
      teamName: newCoach.team_name || null,
      completedAt: now,
      onboardingVersion: 16
    },
    updated_at: now
  };
  const { error } = await supabase
    .from('onboarding_progress')
    .upsert(row, { onConflict: 'account_type,user_id' });
  if (error) throw error;
}

router.get('/my-players', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    await maybeRunSeasonalAgeGroupRollover();
    const coach = await coachRecord(req.user.id);

    let query = supabase
      .from('players')
      .select([
        'id','first_name','last_name','age','age_group','position_group',
        'specific_position','primary_position','overall_rating','transfer_value',
        'predicted_salary_weekly','height_category','build_category','foot',
        'team_id','team_name','assigned_coach_id','avatar_config',
        'appearances','goals','assists','clean_sheets','yellow_cards','red_cards',
        'availability','attribute_ratings'
      ].join(','))
      .eq('is_active', true)
      .order('last_name');

    query = applyRealDataFilter(query, req);

    if (coach.is_super_user) {
      if (coach.team_id) query = query.eq('team_id', coach.team_id);
      else if (coach.team_name) query = query.eq('team_name', coach.team_name);
      else return res.json({ data: [], teamName: null, isSuperUser: true });
    } else {
      query = query.eq('assigned_coach_id', req.user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      data: data || [],
      teamName: coach.team_name || null,
      isSuperUser: !!coach.is_super_user
    });
  } catch (error) {
    console.error('[Coaches my-players]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

router.get('/profile', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    res.json({ coach: await coachRecord(req.user.id) });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

/*
 * Every Coach may see the people who belong to the same Coach workspace.
 * Mutating the team remains Head-Coach-only.
 *
 * Returning the signed-in Coach as part of this list is important: the
 * Settings screen must append invited coaches rather than visually replacing
 * the person who sent the invitation.
 */
router.get('/team-coaches', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const me = await coachRecord(req.user.id);

    let query = supabase
      .from('coaches')
      .select([
        'id','first_name','last_name','email','phone','role_at_club',
        'is_super_user','registration_complete','team_id','team_name','is_demo'
      ].join(','))
      .eq('is_active', true)
      .order('is_super_user', { ascending: false })
      .order('last_name', { ascending: true });

    query = applyRealDataFilter(query, req);

    if (me.team_id) query = query.eq('team_id', me.team_id);
    else if (me.team_name) query = query.eq('team_name', me.team_name);
    else query = query.eq('id', me.id);

    const { data, error } = await query;
    if (error) throw error;

    const list = data || [];
    if (!list.some(coach => String(coach.id) === String(me.id))) {
      list.unshift(me);
    }

    res.json({
      data: list,
      currentCoachId: me.id,
      isSuperUser: !!me.is_super_user
    });
  } catch (error) {
    console.error('[Coaches team-coaches]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

router.post('/add-coach', requireAuth, requireRole('Coach'), async (req, res) => {
  let newCoach = null;

  try {
    const me = await coachRecord(req.user.id);
    if (!me.is_super_user) {
      return res.status(403).json({ error: 'Only the Head Coach can add coaches.' });
    }

    const firstName = String(req.body?.firstName || '').trim();
    const lastName = String(req.body?.lastName || '').trim();
    const emailAddr = String(req.body?.emailAddr || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const isSuperUser = req.body?.isSuperUser === true;

    if (!firstName || !lastName || !emailAddr) {
      return res.status(400).json({ error: 'firstName, lastName, email required' });
    }
    if (!isValidEmail(emailAddr)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    for (const table of ['scouts','coaches','players','stratex']) {
      const { data: existing, error } = await supabase
        .from(table)
        .select('id')
        .eq('email', emailAddr)
        .maybeSingle();
      if (error) throw error;
      if (existing) {
        return res.status(409).json({
          error: table === 'coaches'
            ? 'A coach with this email already exists.'
            : 'This email is already registered on ScoutLink.'
        });
      }
    }

    if (phone) {
      for (const table of ['scouts','coaches']) {
        const { data: existing, error } = await supabase
          .from(table)
          .select('id')
          .eq('phone', phone)
          .maybeSingle();
        if (error) throw error;
        if (existing) {
          return res.status(409).json({
            error: table === 'coaches'
              ? 'A coach with this phone number already exists.'
              : 'This phone number is already registered.'
          });
        }
      }
    }

    const loginCode = await uniqueLoginCode();
    const expires = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

    const { data, error } = await supabase
      .from('coaches')
      .insert({
        coach_id: generateId('CHC'),
        first_name: firstName,
        last_name: lastName,
        email: emailAddr,
        phone: phone || null,
        team_name: me.team_name || null,
        team_id: me.team_id || null,
        team_county: me.team_county || null,
        team_league: me.team_league || null,
        team_age_groups: me.team_age_groups || [],
        team_home_venue: me.team_home_venue || null,
        team_website: me.team_website || null,
        team_contact_email: me.team_contact_email || null,
        role_at_club: isSuperUser ? 'Head Coach' : 'Assistant Coach',
        data_policy_agreed: true,
        login_code: loginCode,
        login_code_expires: expires,
        is_active: true,
        is_super_user: isSuperUser,
        registration_complete: false,
        ...demoWriteFields(req)
      })
      .select()
      .single();

    if (error) throw error;
    newCoach = data;

    /*
     * This person is joining an existing workspace. Their account still needs
     * activation/password creation, but it must not run the team-creation
     * wizard afterwards.
     */
    await markInvitedCoachOnboardingComplete(newCoach, req.user.id);

    const baseUrl = config.brandUrl || 'https://scoutlink.app';
    const completeLink =
      baseUrl +
      '/complete-registration?code=' + encodeURIComponent(loginCode) +
      '&email=' + encodeURIComponent(emailAddr) +
      '&type=Coach';

    const emailResult = isDemoSession(req)
      ? { success: true, template: 'demo-no-email' }
      : await email.sendCompleteSignup({
          to: emailAddr,
          email: emailAddr,
          firstName,
          loginCode,
          accountType: 'Coach',
          completeLink
        }).catch(mailError => {
          console.error('[Coach invite email]', mailError.message);
          return { success: false, error: mailError.message };
        });

    if (!emailResult || !emailResult.success) {
      await Promise.all([
        supabase.from('onboarding_progress')
          .delete()
          .eq('account_type', 'Coach')
          .eq('user_id', newCoach.id),
        supabase.from('coaches').delete().eq('id', newCoach.id)
      ]);

      return res.status(502).json({
        error: 'SendGrid did not accept the coach invite email. Coach was not created.',
        details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error'
      });
    }

    res.status(201).json({
      message: 'Coach added. Complete-registration email sent.',
      coachId: newCoach.id,
      coach: newCoach,
      loginCode,
      completeLink,
      emailSent: !isDemoSession(req),
      emailTemplate: emailResult.template || null
    });
  } catch (error) {
    console.error('[Coaches add-coach]', error);

    /*
     * If a failure happens after the Coach row exists but before the endpoint
     * completes, avoid leaving a half-created invitation behind.
     */
    if (newCoach?.id) {
      try {
        await supabase
          .from('onboarding_progress')
          .delete()
          .eq('account_type', 'Coach')
          .eq('user_id', newCoach.id);
      } catch (_) {}

      try {
        await supabase
          .from('coaches')
          .delete()
          .eq('id', newCoach.id);
      } catch (_) {}
    }

    sendDbError(res, error);
  }
});

router.post('/assign-player/:playerId', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const coach = await coachRecord(req.user.id);
    const targetCoachId = req.body?.coachId || req.user.id;

    if (!coach.is_super_user && String(targetCoachId) !== String(req.user.id)) {
      return res.status(403).json({
        error: 'Only the Head Coach can reassign players.'
      });
    }

    let targetQuery = supabase
      .from('coaches')
      .select('id,team_id,team_name,is_active,is_demo')
      .eq('id', targetCoachId)
      .eq('is_active', true);
    targetQuery = applyRealDataFilter(targetQuery, req);

    const { data: targetCoach, error: targetError } = await targetQuery.maybeSingle();
    if (targetError) throw targetError;
    if (!targetCoach) return res.status(404).json({ error: 'Target coach not found' });
    if (!sameTeam(coach, targetCoach) && String(targetCoach.id) !== String(coach.id)) {
      return res.status(403).json({ error: 'Target coach must be on your team' });
    }

    let playerQuery = supabase
      .from('players')
      .select('id,team_id,team_name,assigned_coach_id,is_demo')
      .eq('id', req.params.playerId)
      .eq('is_active', true);
    playerQuery = applyRealDataFilter(playerQuery, req);

    const { data: player, error: playerError } = await playerQuery.maybeSingle();
    if (playerError) throw playerError;
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if (!sameTeam(coach, player)) {
      return res.status(403).json({ error: 'Player must be on your team' });
    }

    const { error } = await supabase
      .from('players')
      .update({
        assigned_coach_id: targetCoach.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', player.id);
    if (error) throw error;

    res.json({ message: 'Player assigned to coach', coachId: targetCoach.id });
  } catch (error) {
    console.error('[Coaches assign-player]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

router.get('/dashboard', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const coach = await coachRecord(req.user.id);

    let playerQuery = supabase
      .from('players')
      .select('id,first_name,last_name,overall_rating,transfer_value')
      .eq('is_active', true);
    playerQuery = applyRealDataFilter(playerQuery, req);

    if (coach.is_super_user) {
      if (coach.team_id) playerQuery = playerQuery.eq('team_id', coach.team_id);
      else if (coach.team_name) playerQuery = playerQuery.eq('team_name', coach.team_name);
      else playerQuery = playerQuery.eq('assigned_coach_id', coach.id);
    } else {
      playerQuery = playerQuery.eq('assigned_coach_id', coach.id);
    }

    const { data: players, error: playerError } = await playerQuery;
    if (playerError) throw playerError;

    const playerList = players || [];
    const totalPlayers = playerList.length;
    const sorted = [...playerList].sort(
      (a, b) => (Number(b.overall_rating) || 0) - (Number(a.overall_rating) || 0)
    );
    const topRated = sorted[0] || null;
    const totalSquadValue = playerList.reduce(
      (sum, player) => sum + (Number(player.transfer_value) || 0),
      0
    );

    let scoutsInterested = 0;
    let newInterestCount = 0;

    if (playerList.length) {
      const playerIds = playerList.map(player => player.id);
      const { data: pipeline, error: pipelineError } = await supabase
        .from('recruitment_pipeline')
        .select('scout_id,created_at')
        .in('player_id', playerIds)
        .eq('is_active', true);
      if (pipelineError) throw pipelineError;

      scoutsInterested = new Set(
        (pipeline || []).map(row => row.scout_id).filter(Boolean)
      ).size;

      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      newInterestCount = (pipeline || []).filter(row => {
        const time = new Date(row.created_at || 0).getTime();
        return Number.isFinite(time) && time >= sevenDaysAgo;
      }).length;
    }

    res.json({
      totalPlayers,
      totalSquadValue,
      scoutsInterested,
      newInterestCount,
      topRatedPlayer: topRated
        ? {
            id: topRated.id,
            name: `${topRated.first_name || ''} ${topRated.last_name || ''}`.trim(),
            overall_rating: topRated.overall_rating
          }
        : null,
      teamName: coach.team_name || '',
      isSuperUser: !!coach.is_super_user
    });
  } catch (error) {
    console.error('[Coach dashboard]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

/*
 * Legacy removal endpoint retained for compatibility, but brought under the
 * same workspace permission rules as the V6 archive flow.
 */
router.delete('/players/:playerId', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const coach = await coachRecord(req.user.id);

    let playerQuery = supabase
      .from('players')
      .select('id,team_id,team_name,assigned_coach_id,is_demo')
      .eq('id', req.params.playerId)
      .eq('is_active', true);
    playerQuery = applyRealDataFilter(playerQuery, req);

    const { data: player, error } = await playerQuery.maybeSingle();
    if (error) throw error;
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const allowed = coach.is_super_user
      ? sameTeam(coach, player)
      : String(player.assigned_coach_id || '') === String(coach.id);

    if (!allowed) return res.status(403).json({ error: 'Not authorised' });

    const stamp = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('players')
      .update({
        is_active: false,
        archived_at: stamp,
        archived_reason: 'Removed by coach',
        updated_at: stamp
      })
      .eq('id', player.id);
    if (updateError) throw updateError;

    res.json({ message: 'Player removed from squad' });
  } catch (error) {
    console.error('[Coaches legacy player removal]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
