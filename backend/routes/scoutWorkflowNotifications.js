'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { createNotifications } = require('../services/notifications');

function clean(value, max = 1600) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}
function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.use(requireAuth, requireRole('Scout'));

router.post('/fixture-plan', async (req, res) => {
  try {
    const fixtureId = req.body && req.body.fixtureId;
    const playerId = req.body && req.body.playerId;
    if (!fixtureId || !playerId) {
      return res.status(400).json({ error: 'fixtureId and playerId are required.' });
    }

    const [{ data: scout, error: scoutError }, { data: fixture, error: fixtureError }, { data: player, error: playerError }] = await Promise.all([
      supabase.from('scouts').select('id,first_name,last_name,scout_team_id').eq('id', req.user.id).maybeSingle(),
      supabase.from('fixtures').select('*').eq('id', fixtureId).maybeSingle(),
      supabase.from('players').select('id,first_name,last_name,team_id,team_name,assigned_coach_id').eq('id', playerId).maybeSingle()
    ]);
    if (scoutError) throw scoutError;
    if (fixtureError) throw fixtureError;
    if (playerError) throw playerError;
    if (!scout || !fixture || !player) return res.status(404).json({ error: 'The scout, fixture or player could not be found.' });

    const assignedScoutId = req.body.assignedScoutId || scout.id;
    const payload = {
      scout_id: scout.id,
      scout_team_id: scout.scout_team_id || null,
      fixture_id: fixture.id,
      player_id: player.id,
      assigned_scout_id: assignedScoutId,
      priority: Math.max(0, Math.min(100, Math.round(number(req.body.priority, 60)))),
      objective: clean(req.body.objective) || null,
      travel_notes: clean(req.body.travelNotes) || null,
      status: clean(req.body.status || 'planned', 40)
    };

    const { data: plan, error: planError } = await supabase
      .from('scout_fixture_plans')
      .upsert(payload, { onConflict: 'scout_id,fixture_id,player_id' })
      .select()
      .single();
    if (planError) throw planError;

    const playerName = [player.first_name, player.last_name].filter(Boolean).join(' ') || 'Player';
    const scoutName = [scout.first_name, scout.last_name].filter(Boolean).join(' ') || 'A ScoutLink scout';
    const fixtureName = fixture.opponent_name || fixture.opponent || 'the upcoming fixture';
    const notifications = [];

    if (assignedScoutId && String(assignedScoutId) !== String(scout.id)) {
      notifications.push({
        recipientId: assignedScoutId,
        recipientType: 'Scout',
        notificationType: 'fixture_attendance',
        title: 'You have been assigned a scouting fixture',
        body: `${scoutName} assigned you to observe ${playerName} against ${fixtureName}.`,
        data: {
          fixtureId: fixture.id,
          playerId: player.id,
          playerName,
          source: 'scout_fixture_assignment',
          actionUrl: `/scout/fixtures?fixtureId=${encodeURIComponent(fixture.id)}`
        }
      });
    }

    let coachIds = [];
    if (player.assigned_coach_id) coachIds.push(player.assigned_coach_id);
    if (!coachIds.length && player.team_id) {
      const { data: coaches, error: coachesError } = await supabase
        .from('coaches')
        .select('id')
        .eq('team_id', player.team_id)
        .eq('is_active', true)
        .limit(20);
      if (coachesError) throw coachesError;
      coachIds = (coaches || []).map(row => row.id);
    }

    [...new Set(coachIds.filter(Boolean))].forEach(coachId => {
      notifications.push({
        recipientId: coachId,
        recipientType: 'Coach',
        notificationType: 'fixture_attendance',
        title: 'A Scout plans to attend a player fixture',
        body: `${scoutName} plans to observe ${playerName} against ${fixtureName}.`,
        data: {
          fixtureId: fixture.id,
          playerId: player.id,
          playerName,
          teamName: player.team_name || null,
          source: 'scout_fixture_plan',
          actionUrl: `/coach/fixtures?fixtureId=${encodeURIComponent(fixture.id)}`
        }
      });
    });

    const created = notifications.length
      ? await createNotifications(notifications, { sendEmail: true })
      : [];

    res.status(201).json({
      plan,
      notificationsCreated: created.length,
      coachNotifications: notifications.filter(row => row.recipientType === 'Coach').length,
      scoutNotifications: notifications.filter(row => row.recipientType === 'Scout').length
    });
  } catch (error) {
    console.error('[Scout workflow fixture plan]', error);
    res.status(500).json({ error: error.message || 'The fixture plan and notifications could not be saved.' });
  }
});

module.exports = router;
