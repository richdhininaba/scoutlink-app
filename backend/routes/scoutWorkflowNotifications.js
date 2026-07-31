'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { createNotification, createNotifications } = require('../services/notifications');
const { getScoutUsageSnapshot } = require('../utils/scoutUsage');

const VALID_STAGES = new Set([
  'watching',
  'interested',
  'shortlisted',
  'approached',
  'trial_pending',
  'negotiating',
  'signed',
  'rejected',
  'closed'
]);

const SETUP_ARRAY_FIELDS = new Set([
  'teamWeaknesses',
  'roleExpectations',
  'longTermGoals'
]);

const SETUP_TEXT_FIELDS = new Set([
  'teamName',
  'clubName',
  'country',
  'scoutRegion',
  'formation',
  'playingStyle'
]);

const REMOVED_SEARCH_PREFERENCE_FIELDS = [
  'ageGroups',
  'preferredPositions',
  'salaryCap',
  'minAppearances',
  'heightPreference',
  'buildPreference',
  'footPreference',
  'otherRequirements',
  'ageRangeMin',
  'ageRangeMax',
  'formationFocus'
];

function clean(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function cleanArray(value, maxItems = 20, maxLength = 180) {
  const source = Array.isArray(value)
    ? value
    : value == null || value === ''
      ? []
      : [value];

  return unique(
    source
      .map((item) => clean(item, maxLength))
      .filter(Boolean)
  ).slice(0, maxItems);
}

function playerName(player) {
  return [player?.first_name, player?.last_name]
    .filter(Boolean)
    .join(' ') || 'Player';
}

function scoutName(scout) {
  return [scout?.first_name, scout?.last_name]
    .filter(Boolean)
    .join(' ') || 'Scout';
}

function accountScope(context) {
  return context.scout.scout_team_id
    ? {
        column: 'scout_team_id',
        value: context.scout.scout_team_id
      }
    : {
        column: 'scout_id',
        value: context.scout.id
      };
}

async function loadScoutContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!scout) {
    const notFound = new Error('Scout account not found.');
    notFound.status = 404;
    throw notFound;
  }

  let team = {};

  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();

    if (result.error) throw result.error;
    team = result.data || {};
  }

  return {
    scout,
    team,
    prefs: scout.scout_preferences || {}
  };
}

async function loadPlayer(playerId) {
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;

  if (!player) {
    const notFound = new Error('Player not found.');
    notFound.status = 404;
    throw notFound;
  }

  return player;
}

async function loadTeamScouts(context) {
  let query = supabase
    .from('scouts')
    .select('id,first_name,last_name,email,club_name,is_super_user,scout_team_id')
    .eq('is_active', true)
    .order('first_name', { ascending: true });

  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('id', context.scout.id);

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function loadPlayerCoaches(player) {
  const ids = [];

  if (player.assigned_coach_id) {
    ids.push(player.assigned_coach_id);
  }

  let query = supabase
    .from('coaches')
    .select('id,first_name,last_name,email,team_id,team_name,is_active')
    .eq('is_active', true);

  if (ids.length) {
    query = query.in('id', ids);
  } else if (player.team_id) {
    query = query.eq('team_id', player.team_id);
  } else {
    return [];
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

function canAccessPipeline(context, row) {
  if (!row) return false;

  if (row.scout_id === context.scout.id) {
    return true;
  }

  return !!(
    context.scout.scout_team_id &&
    row.scout_team_id === context.scout.scout_team_id
  );
}

function canManagePipeline(context, row) {
  if (!canAccessPipeline(context, row)) {
    return false;
  }

  return !!(
    row.scout_id === context.scout.id ||
    row.assigned_scout_id === context.scout.id ||
    context.scout.is_super_user
  );
}

async function loadPipelineById(context, pipelineId) {
  const { data, error } = await supabase
    .from('recruitment_pipeline')
    .select('*')
    .eq('id', pipelineId)
    .maybeSingle();

  if (error) throw error;

  if (!data || !canAccessPipeline(context, data)) {
    const notFound = new Error('Pipeline item not found.');
    notFound.status = 404;
    throw notFound;
  }

  return data;
}

async function loadPipelineForPlayer(context, playerId) {
  let query = supabase
    .from('recruitment_pipeline')
    .select('*')
    .eq('player_id', playerId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (context.scout.scout_team_id) {
    query = query.eq('scout_team_id', context.scout.scout_team_id);
  } else {
    query = query.eq('scout_id', context.scout.id);
  }

  const { data, error } = await query.limit(1);

  if (error) throw error;

  return (data || [])[0] || null;
}

function workflowVisibleToScout(context, entry) {
  if (entry.scout_id === context.scout.id) {
    return true;
  }

  if (context.scout.is_super_user && context.scout.scout_team_id) {
    return entry.scout_team_id === context.scout.scout_team_id;
  }

  return Array.isArray(entry.shared_with) &&
    entry.shared_with.includes(context.scout.id);
}

async function loadWorkflowEntries(context, filters) {
  let query = supabase
    .from('scout_player_workflow_entries')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(250);

  if (filters.pipelineId) {
    query = query.eq('pipeline_id', filters.pipelineId);
  }

  if (filters.playerId) {
    query = query.eq('player_id', filters.playerId);
  }

  if (context.scout.scout_team_id) {
    query = query.eq('scout_team_id', context.scout.scout_team_id);
  } else {
    query = query.eq('scout_id', context.scout.id);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).filter((entry) =>
    workflowVisibleToScout(context, entry)
  );
}

async function enrichWorkflowEntries(entries) {
  const scoutIds = unique(
    entries.flatMap((entry) => [
      entry.scout_id,
      entry.created_by,
      ...(entry.shared_with || [])
    ])
  );

  if (!scoutIds.length) {
    return entries;
  }

  const { data, error } = await supabase
    .from('scouts')
    .select('id,first_name,last_name,email,club_name')
    .in('id', scoutIds);

  if (error) throw error;

  const byId = Object.fromEntries(
    (data || []).map((scout) => [scout.id, scout])
  );

  return entries.map((entry) => ({
    ...entry,
    author: byId[entry.created_by] || byId[entry.scout_id] || null,
    sharedWithScouts: (entry.shared_with || [])
      .map((id) => byId[id])
      .filter(Boolean)
  }));
}

async function notifySharedScouts(context, pipeline, player, entry) {
  const recipients = unique(entry.shared_with || [])
    .filter((id) => id !== context.scout.id);

  if (!recipients.length) {
    return [];
  }

  return createNotifications(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      recipient_type: 'Scout',
      notification_type: 'recruitment',
      title: entry.entry_type === 'decision'
        ? 'A recruitment decision was shared with you'
        : 'A player note was shared with you',
      body:
        scoutName(context.scout) +
        ' shared ' +
        (entry.entry_type === 'decision' ? 'a decision' : 'a note') +
        ' for ' +
        playerName(player) +
        '.',
      data: {
        source: 'scout_workflow_share',
        playerId: player.id,
        playerName: playerName(player),
        pipelineId: pipeline?.id || entry.pipeline_id || null,
        workflowEntryId: entry.id,
        actionUrl:
          '/scout/pipeline?pipelineId=' +
          encodeURIComponent(pipeline?.id || entry.pipeline_id || '')
      }
    })),
    { sendEmail: true }
  );
}

async function updatePipelineSummary(pipelineId, entry) {
  if (!pipelineId) return;

  const updates = {
    updated_at: new Date().toISOString()
  };

  if (entry.entry_type === 'note') {
    updates.notes = entry.content;
  }

  if (entry.entry_type === 'decision') {
    updates.decision_status = entry.decision_value || 'recorded';
    updates.decision_summary = entry.content;
    updates.decision_updated_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('recruitment_pipeline')
    .update(updates)
    .eq('id', pipelineId);

  if (error) throw error;
}

function setupPayload(existing, body) {
  const next = {
    ...(existing || {})
  };

  SETUP_TEXT_FIELDS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) {
      next[key] = clean(body[key], 180);
    }
  });

  SETUP_ARRAY_FIELDS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) {
      next[key] = cleanArray(body[key]);
    }
  });

  REMOVED_SEARCH_PREFERENCE_FIELDS.forEach((key) => {
    delete next[key];
  });

  next.updatedAt = new Date().toISOString();
  next.compatibilityRecalculationRequired = true;

  return next;
}

async function sendInterestNotifications(context, pipeline, player, coaches) {
  const rows = [
    {
      recipient_id: context.scout.id,
      recipient_type: 'Scout',
      notification_type: 'recruitment',
      title: 'Interest logged in your pipeline',
      body:
        playerName(player) +
        ' has been added to your recruitment pipeline. ' +
        (coaches.length
          ? 'The player’s coach has been notified.'
          : 'No active coach account was linked to the player.'),
      data: {
        source: 'player_interest_registered',
        playerId: player.id,
        playerName: playerName(player),
        pipelineId: pipeline.id,
        actionUrl:
          '/scout/pipeline?pipelineId=' +
          encodeURIComponent(pipeline.id)
      }
    },
    ...coaches.map((coach) => ({
      recipient_id: coach.id,
      recipient_type: 'Coach',
      notification_type: 'scout_interest',
      title: 'A Scout has registered interest in a player',
      body:
        scoutName(context.scout) +
        ' from ' +
        (context.team.team_name || context.scout.club_name || 'a Scout team') +
        ' has registered interest in ' +
        playerName(player) +
        '. The interest has been logged in ScoutLink.',
      data: {
        source: 'player_interest_registered',
        playerId: player.id,
        playerName: playerName(player),
        pipelineId: pipeline.id,
        scoutId: context.scout.id,
        scoutName: scoutName(context.scout),
        teamName:
          context.team.team_name ||
          context.scout.club_name ||
          null,
        actionUrl:
          '/coach/my-players?playerId=' +
          encodeURIComponent(player.id)
      }
    }))
  ];

  return createNotifications(rows, { sendEmail: true });
}

router.use(requireAuth, requireRole('Scout'));

router.post('/fixture-plan', async (req, res) => {
  try {
    const scoutId = req.user.id;
    const fixtureId = clean(req.body.fixtureId, 120);
    const playerId = clean(req.body.playerId, 120);
    const observationFocus = clean(req.body.observationFocus, 1200);
    const planNotes = clean(req.body.planNotes, 2400);
    const assignedScoutId = clean(req.body.assignedScoutId, 120) || scoutId;

    if (!fixtureId || !playerId || !observationFocus) {
      return res.status(400).json({
        error:
          'fixtureId, playerId and observationFocus are required.'
      });
    }

    const { data: scout, error: scoutError } = await supabase
      .from('scouts')
      .select('id,first_name,last_name,club_name,scout_team_id')
      .eq('id', scoutId)
      .maybeSingle();

    if (scoutError) throw scoutError;

    if (!scout) {
      return res.status(404).json({
        error: 'Scout account not found.'
      });
    }

    const { data: fixture, error: fixtureError } = await supabase
      .from('fixtures')
      .select(
        'id,team_id,fixture_date,fixture_time,opponent_name,opponent,venue_name,venue,address'
      )
      .eq('id', fixtureId)
      .maybeSingle();

    if (fixtureError) throw fixtureError;

    if (!fixture) {
      return res.status(404).json({
        error: 'Fixture not found.'
      });
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select(
        'id,first_name,last_name,team_id,team_name,assigned_coach_id'
      )
      .eq('id', playerId)
      .maybeSingle();

    if (playerError) throw playerError;

    if (!player) {
      return res.status(404).json({
        error: 'Player not found.'
      });
    }

    const planPayload = {
      scout_id: scoutId,
      scout_team_id: scout.scout_team_id || null,
      fixture_id: fixtureId,
      player_id: playerId,
      observation_focus: observationFocus,
      plan_notes: planNotes || null,
      assigned_scout_id: assignedScoutId || null,
      status: 'planned',
      updated_at: new Date().toISOString()
    };

    const { data: existingPlan, error: existingError } = await supabase
      .from('scout_fixture_plans')
      .select('id')
      .eq('scout_id', scoutId)
      .eq('fixture_id', fixtureId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingError) throw existingError;

    let planQuery = existingPlan
      ? supabase
          .from('scout_fixture_plans')
          .update(planPayload)
          .eq('id', existingPlan.id)
      : supabase
          .from('scout_fixture_plans')
          .insert(planPayload);

    const { data: plan, error: planError } =
      await planQuery.select().single();

    if (planError) throw planError;

    const recipientRows = [];

    if (assignedScoutId) {
      recipientRows.push({
        recipient_id: assignedScoutId,
        recipient_type: 'Scout',
        notification_type: 'recruitment',
        title: 'Fixture observation plan ready',
        body:
          'A Scout observation plan was created for ' +
          playerName(player) +
          ' against ' +
          (fixture.opponent_name ||
            fixture.opponent ||
            'the next opponent') +
          '.',
        data: {
          source: 'scout_fixture_plan',
          fixtureId,
          playerId,
          playerName: playerName(player),
          planId: plan.id,
          actionUrl:
            '/scout/fixtures?fixtureId=' +
            encodeURIComponent(fixtureId) +
            '&playerId=' +
            encodeURIComponent(playerId)
        }
      });
    }

    let coachRecipients = [];

    if (player.assigned_coach_id) {
      coachRecipients = [player.assigned_coach_id];
    } else if (player.team_id) {
      const { data: coaches, error: coachError } = await supabase
        .from('coaches')
        .select('id')
        .eq('team_id', player.team_id)
        .eq('is_active', true);

      if (coachError) throw coachError;

      coachRecipients = (coaches || []).map((coach) => coach.id);
    }

    unique(coachRecipients).forEach((coachId) => {
      recipientRows.push({
        recipient_id: coachId,
        recipient_type: 'Coach',
        notification_type: 'fixture_attendance',
        title: 'Scout fixture observation planned',
        body:
          'A Scout has planned to observe ' +
          playerName(player) +
          ' at the fixture against ' +
          (fixture.opponent_name ||
            fixture.opponent ||
            'the next opponent') +
          '.',
        data: {
          source: 'scout_fixture_plan',
          fixtureId,
          playerId,
          playerName: playerName(player),
          planId: plan.id,
          actionUrl:
            '/coach/fixtures?fixtureId=' +
            encodeURIComponent(fixtureId)
        }
      });
    });

    const notifications = await createNotifications(
      recipientRows,
      { sendEmail: true }
    );

    res.status(existingPlan ? 200 : 201).json({
      message: existingPlan
        ? 'Fixture observation plan updated.'
        : 'Fixture observation plan saved.',
      plan,
      notificationsCreated: notifications.length
    });
  } catch (error) {
    console.error('[Scout fixture plan]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The fixture observation plan could not be saved.'
    });
  }
});

router.get('/setup', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);

    res.json({
      preferences: context.prefs,
      preferencesSet: !!context.scout.preferences_set,
      scoutTeam: context.team
    });
  } catch (error) {
    console.error('[Scout workflow setup GET]', error);

    res.status(error.status || 500).json({
      error: error.message || 'Scout setup could not be loaded.'
    });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const preferences = setupPayload(context.prefs, req.body || {});

    const { error: scoutError } = await supabase
      .from('scouts')
      .update({
        scout_preferences: preferences,
        preferences_set: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', context.scout.id);

    if (scoutError) throw scoutError;

    if (context.scout.scout_team_id) {
      const teamUpdates = {
        updated_at: new Date().toISOString()
      };

      if (preferences.formation) {
        teamUpdates.formation = preferences.formation;
      }

      if (preferences.playingStyle) {
        teamUpdates.playing_style = preferences.playingStyle;
      }

      teamUpdates.team_weaknesses =
        preferences.teamWeaknesses || [];
      teamUpdates.role_expectations =
        preferences.roleExpectations || [];
      teamUpdates.long_term_goals =
        preferences.longTermGoals || [];

      const { error: teamError } = await supabase
        .from('scout_teams')
        .update(teamUpdates)
        .eq('id', context.scout.scout_team_id);

      if (teamError) throw teamError;
    }

    res.json({
      message:
        'Scout setup saved. Compatibility will now use the updated football brief.',
      preferences,
      compatibilityRecalculationRequired: true
    });
  } catch (error) {
    console.error('[Scout workflow setup POST]', error);

    res.status(error.status || 500).json({
      error: error.message || 'Scout setup could not be saved.'
    });
  }
});

router.post('/interest', async (req, res) => {
  try {
    const playerId = clean(req.body.playerId, 120);
    const interestLevel = Math.max(
      1,
      Math.min(10, Math.round(number(req.body.interestLevel, 8)))
    );

    if (!playerId) {
      return res.status(400).json({
        error: 'playerId is required.'
      });
    }

    const context = await loadScoutContext(req.user.id);
    const player = await loadPlayer(playerId);

    const { data: existing, error: existingError } = await supabase
      .from('recruitment_pipeline')
      .select('*')
      .eq('scout_id', context.scout.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing?.is_active) {
      const usage = await getScoutUsageSnapshot(context);

      return res.json({
        alreadyRegistered: true,
        pipeline: existing,
        usage,
        message:
          playerName(player) +
          ' is already in your pipeline. No additional interest usage was deducted.'
      });
    }

    const usageBefore = await getScoutUsageSnapshot(context);

    if (usageBefore.interests.remaining <= 0) {
      return res.status(402).json({
        error:
          'You have reached your interest allowance. Submit a usage request before registering another player.',
        usage: usageBefore
      });
    }

    const now = new Date().toISOString();

    const payload = {
      scout_id: context.scout.id,
      scout_team_id: context.scout.scout_team_id || null,
      player_id: playerId,
      stage: 'interested',
      interest_level: interestLevel,
      is_active: true,
      interest_registered_at: now,
      interest_registered_by: context.scout.id,
      updated_at: now
    };

    let write;

    if (existing) {
      write = await supabase
        .from('recruitment_pipeline')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      write = await supabase
        .from('recruitment_pipeline')
        .insert(payload)
        .select()
        .single();
    }

    if (write.error) throw write.error;

    const pipeline = write.data;
    const coaches = await loadPlayerCoaches(player);
    const notifications = await sendInterestNotifications(
      context,
      pipeline,
      player,
      coaches
    );
    const usage = await getScoutUsageSnapshot(context);

    res.status(existing ? 200 : 201).json({
      pipeline,
      usage,
      coachNotifiedCount: coaches.length,
      notificationsCreated: notifications.length,
      message:
        playerName(player) +
        ' was added to your pipeline. ' +
        (coaches.length
          ? 'The player’s coach has been notified and the interest was logged successfully.'
          : 'The interest was logged, but no active coach account is currently linked to this player.')
    });
  } catch (error) {
    console.error('[Scout register interest]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The player interest could not be registered.'
    });
  }
});

router.get('/players/:playerId/context', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const player = await loadPlayer(req.params.playerId);
    const pipeline = await loadPipelineForPlayer(
      context,
      player.id
    );

    const [
      teamResult,
      factResult,
      videoResult,
      predictionResult,
      workflow,
      teamScouts
    ] = await Promise.all([
      player.team_id
        ? supabase
            .from('school_academy_teams')
            .select('*')
            .eq('id', player.team_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('match_facts')
        .select('*')
        .eq('player_id', player.id)
        .order('match_date', { ascending: false })
        .limit(100),
      supabase
        .from('player_videos')
        .select('*')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('predictions_log')
        .select('*')
        .eq('player_id', player.id)
        .eq('scout_id', context.scout.id)
        .eq('prediction_type', 'Position Fit Projection')
        .order('run_at', { ascending: false })
        .limit(1),
      loadWorkflowEntries(context, {
        playerId: player.id
      }),
      loadTeamScouts(context)
    ]);

    if (teamResult.error) throw teamResult.error;
    if (factResult.error) throw factResult.error;
    if (videoResult.error) throw videoResult.error;
    if (predictionResult.error) throw predictionResult.error;

    res.json({
      player,
      team: teamResult.data || null,
      matchFacts: factResult.data || [],
      videos: videoResult.data || [],
      pipeline,
      workflow: await enrichWorkflowEntries(workflow),
      teamScouts,
      latestPositionFit:
        (predictionResult.data || [])[0] || null,
      positionFitUnlocked:
        (predictionResult.data || []).length > 0
    });
  } catch (error) {
    console.error('[Scout player workflow context]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'Player workflow context could not be loaded.'
    });
  }
});

router.get('/players/:playerId/workflow', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const player = await loadPlayer(req.params.playerId);
    const pipeline = await loadPipelineForPlayer(
      context,
      player.id
    );
    const entries = await loadWorkflowEntries(context, {
      playerId: player.id
    });

    res.json({
      player,
      pipeline,
      entries: await enrichWorkflowEntries(entries),
      teamScouts: await loadTeamScouts(context)
    });
  } catch (error) {
    console.error('[Scout player workflow GET]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'Player notes and decisions could not be loaded.'
    });
  }
});

router.get('/pipeline/:pipelineId/workflow', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const pipeline = await loadPipelineById(
      context,
      req.params.pipelineId
    );
    const player = await loadPlayer(pipeline.player_id);
    const entries = await loadWorkflowEntries(context, {
      pipelineId: pipeline.id,
      playerId: player.id
    });

    res.json({
      pipeline,
      player,
      entries: await enrichWorkflowEntries(entries),
      teamScouts: await loadTeamScouts(context),
      canManage: canManagePipeline(context, pipeline)
    });
  } catch (error) {
    console.error('[Scout pipeline workflow GET]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'Pipeline notes and decisions could not be loaded.'
    });
  }
});

router.post('/players/:playerId/workflow', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const player = await loadPlayer(req.params.playerId);
    const pipeline = await loadPipelineForPlayer(
      context,
      player.id
    );
    const entryType =
      req.body.entryType === 'decision'
        ? 'decision'
        : 'note';
    const content = clean(req.body.content, 4000);
    const decisionValue = clean(
      req.body.decisionValue,
      120
    ) || null;
    const teamScouts = await loadTeamScouts(context);
    const validScoutIds = new Set(
      teamScouts.map((scout) => scout.id)
    );
    const sharedWith = cleanArray(
      req.body.sharedWith,
      50,
      120
    ).filter((id) => validScoutIds.has(id));

    if (!content) {
      return res.status(400).json({
        error: 'A note or decision is required.'
      });
    }

    const { data: entry, error } = await supabase
      .from('scout_player_workflow_entries')
      .insert({
        scout_id: context.scout.id,
        scout_team_id:
          context.scout.scout_team_id || null,
        player_id: player.id,
        pipeline_id: pipeline?.id || null,
        entry_type: entryType,
        content,
        decision_value: decisionValue,
        shared_with: sharedWith,
        metadata: req.body.metadata || {},
        created_by: context.scout.id
      })
      .select()
      .single();

    if (error) throw error;

    await updatePipelineSummary(
      pipeline?.id || null,
      entry
    );

    const notifications = await notifySharedScouts(
      context,
      pipeline,
      player,
      entry
    );

    res.status(201).json({
      entry: (await enrichWorkflowEntries([entry]))[0],
      pipeline,
      notificationsCreated: notifications.length,
      message:
        entryType === 'decision'
          ? 'Decision saved and shared.'
          : 'Note saved and shared.'
    });
  } catch (error) {
    console.error('[Scout player workflow POST]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The note or decision could not be saved.'
    });
  }
});

router.post('/pipeline/:pipelineId/workflow', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const pipeline = await loadPipelineById(
      context,
      req.params.pipelineId
    );
    const player = await loadPlayer(pipeline.player_id);
    const entryType =
      req.body.entryType === 'decision'
        ? 'decision'
        : 'note';
    const content = clean(req.body.content, 4000);
    const decisionValue = clean(
      req.body.decisionValue,
      120
    ) || null;
    const teamScouts = await loadTeamScouts(context);
    const validScoutIds = new Set(
      teamScouts.map((scout) => scout.id)
    );
    const sharedWith = cleanArray(
      req.body.sharedWith,
      50,
      120
    ).filter((id) => validScoutIds.has(id));

    if (!content) {
      return res.status(400).json({
        error: 'A note or decision is required.'
      });
    }

    const { data: entry, error } = await supabase
      .from('scout_player_workflow_entries')
      .insert({
        scout_id: context.scout.id,
        scout_team_id:
          context.scout.scout_team_id || null,
        player_id: player.id,
        pipeline_id: pipeline.id,
        entry_type: entryType,
        content,
        decision_value: decisionValue,
        shared_with: sharedWith,
        metadata: req.body.metadata || {},
        created_by: context.scout.id
      })
      .select()
      .single();

    if (error) throw error;

    await updatePipelineSummary(pipeline.id, entry);

    const notifications = await notifySharedScouts(
      context,
      pipeline,
      player,
      entry
    );

    res.status(201).json({
      entry: (await enrichWorkflowEntries([entry]))[0],
      notificationsCreated: notifications.length,
      message:
        entryType === 'decision'
          ? 'Decision saved and shared.'
          : 'Note saved and shared.'
    });
  } catch (error) {
    console.error('[Scout pipeline workflow POST]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The note or decision could not be saved.'
    });
  }
});

router.patch('/workflow/:entryId', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const content = clean(req.body.content, 4000);
    const decisionValue = clean(
      req.body.decisionValue,
      120
    ) || null;
    const teamScouts = await loadTeamScouts(context);
    const validScoutIds = new Set(
      teamScouts.map((scout) => scout.id)
    );
    const sharedWith = cleanArray(
      req.body.sharedWith,
      50,
      120
    ).filter((id) => validScoutIds.has(id));

    if (!content) {
      return res.status(400).json({
        error: 'Content is required.'
      });
    }

    const { data: existing, error: existingError } =
      await supabase
        .from('scout_player_workflow_entries')
        .select('*')
        .eq('id', req.params.entryId)
        .eq('scout_id', context.scout.id)
        .eq('is_deleted', false)
        .maybeSingle();

    if (existingError) throw existingError;

    if (!existing) {
      return res.status(404).json({
        error:
          'The note or decision was not found, or you are not its author.'
      });
    }

    const { data: entry, error } = await supabase
      .from('scout_player_workflow_entries')
      .update({
        content,
        decision_value: decisionValue,
        shared_with: sharedWith,
        metadata: {
          ...(existing.metadata || {}),
          ...(req.body.metadata || {}),
          editedAt: new Date().toISOString()
        }
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;

    const player = await loadPlayer(entry.player_id);
    const pipeline = entry.pipeline_id
      ? await loadPipelineById(context, entry.pipeline_id)
      : await loadPipelineForPlayer(context, entry.player_id);

    await updatePipelineSummary(
      pipeline?.id || entry.pipeline_id || null,
      entry
    );

    const notifications = await notifySharedScouts(
      context,
      pipeline,
      player,
      entry
    );

    res.json({
      entry: (await enrichWorkflowEntries([entry]))[0],
      notificationsCreated: notifications.length,
      message: 'Note or decision updated.'
    });
  } catch (error) {
    console.error('[Scout workflow PATCH]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The note or decision could not be updated.'
    });
  }
});

router.delete('/workflow/:entryId', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);

    const { data, error } = await supabase
      .from('scout_player_workflow_entries')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.entryId)
      .eq('scout_id', context.scout.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error:
          'The note or decision was not found, or you are not its author.'
      });
    }

    res.json({
      message: 'Note or decision removed.'
    });
  } catch (error) {
    console.error('[Scout workflow DELETE]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The note or decision could not be removed.'
    });
  }
});

router.patch('/pipeline/:pipelineId/stage', async (req, res) => {
  try {
    const context = await loadScoutContext(req.user.id);
    const pipeline = await loadPipelineById(
      context,
      req.params.pipelineId
    );
    const stage = clean(req.body.stage, 80)
      .toLowerCase()
      .replace(/\s+/g, '_');

    if (!VALID_STAGES.has(stage)) {
      return res.status(400).json({
        error:
          'Choose a valid pipeline stage.'
      });
    }

    if (!canManagePipeline(context, pipeline)) {
      return res.status(403).json({
        error:
          'Only the pipeline owner, assigned Scout or Scout team super user can move this player.'
      });
    }

    const { data: updated, error } = await supabase
      .from('recruitment_pipeline')
      .update({
        stage,
        updated_at: new Date().toISOString()
      })
      .eq('id', pipeline.id)
      .select()
      .single();

    if (error) throw error;

    const player = await loadPlayer(updated.player_id);

    if (
      updated.scout_id !== context.scout.id
    ) {
      await createNotification(
        {
          recipient_id: updated.scout_id,
          recipient_type: 'Scout',
          notification_type: 'recruitment',
          title: 'A player moved stage in the pipeline',
          body:
            scoutName(context.scout) +
            ' moved ' +
            playerName(player) +
            ' to ' +
            stage.replace(/_/g, ' ') +
            '.',
          data: {
            source: 'pipeline_stage_changed',
            playerId: player.id,
            playerName: playerName(player),
            pipelineId: updated.id,
            stage,
            actionUrl:
              '/scout/pipeline?pipelineId=' +
              encodeURIComponent(updated.id)
          }
        },
        { sendEmail: true }
      );
    }

    res.json({
      data: updated,
      message:
        playerName(player) +
        ' moved to ' +
        stage.replace(/_/g, ' ') +
        '.'
    });
  } catch (error) {
    console.error('[Scout workflow stage PATCH]', error);

    res.status(error.status || 500).json({
      error:
        error.message ||
        'The pipeline stage could not be changed.'
    });
  }
});

module.exports = router;
