'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const config = require('../config');
const { createNotification, createNotifications } = require('../services/notifications');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');

const requireShowcaseManager = requireStratexAdminPermission('showcase', 'Showcase event access is restricted to authorised Stratex admin users.');

async function sendDirectEmail(to, subject, html) {
  if (!config.sendgrid.apiKey) return;
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendgrid.apiKey);
    const toArr = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!toArr.length) return;
    await sgMail.send({ to: toArr, from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName }, subject, html });
  } catch(e) { console.error('[Email]', e?.response?.body || e.message); }
}

async function notify(recipientId, recipientType, title, body, data) {
  try {
    const d = data || {};
    await createNotification({
      recipient_id: recipientId,
      recipient_type: recipientType,
      notification_type: d.notification_type || d.notificationType || (d.event_id || d.eventId ? 'showcase_event' : 'system'),
      title,
      body,
      data: {
        ...d,
        targetType: d.targetType || (d.event_id || d.eventId ? 'showcase_event' : 'system'),
        targetId: d.targetId || d.event_id || d.eventId || null,
        eventId: d.eventId || d.event_id || null,
        source: d.source || d.type || 'showcase'
      }
    });
  } catch(e) {}
}

async function notifyStratexAdmins(title, body, data) {
  try {
    const { data: admins } = await supabase.from('stratex').select('id,email').eq('is_active', true);
    if (!admins || !admins.length) return;
    await createNotifications(admins.map(a => ({
      recipient_id: a.id,
      recipient_type: 'Stratex',
      notification_type: 'system',
      title,
      body,
      data: data || {}
    })));
  } catch(e) { console.error('[Notify Stratex]', e.message); }
}

function eventHtml(eventName, eventDate, venueName, venueAddress, description, maxScouts) {
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'TBC';
  return '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px"><h1 style="color:#00E676">ScoutLink Showcase Event</h1><div style="background:#111827;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #00E676"><h2 style="color:#fff;margin:0">' + eventName + '</h2><p style="color:#94a3b8">' + dateStr + '</p><p style="color:#E2E8F0">' + (venueName||'') + ', ' + (venueAddress||'') + '</p>' + (description ? '<p style="color:#B0BEC5">' + description + '</p>' : '') + '</div><p>Spaces are limited to <strong>' + (maxScouts||20) + '</strong> scouts.</p><p style="color:#94a3b8;margin-top:32px">Stratex Analytics - ScoutLink Platform</p></div>';
}

// GET /api/showcase - list events
router.get('/', requireAuth, requireRole('Stratex','Scout'), async (req, res) => {
  try {
    let q = supabase.from('showcase_events').select('*').order('event_date', { ascending: true });
    if (req.user && req.user.accountType === 'Scout') q = q.in('status', ['published','confirmed']);
    const { data, error } = await q;
    if (error) throw error;
    // Add attendance counts
    const eventsWithCounts = await Promise.all((data||[]).map(async ev => {
      const { count: confirmed } = await supabase.from('showcase_attendance').select('id', { count:'exact', head:true }).eq('event_id', ev.id).eq('status', 'confirmed');
      const { count: waitlisted } = await supabase.from('showcase_attendance').select('id', { count:'exact', head:true }).eq('event_id', ev.id).eq('status', 'waitlisted');
      let myStatus = null;
      if (req.user && req.user.accountType === 'Scout') {
        const { data: att } = await supabase.from('showcase_attendance').select('status').eq('event_id', ev.id).eq('scout_id', req.user.id).maybeSingle();
        myStatus = att ? att.status : null;
      }
      return { ...ev, confirmedCount: confirmed||0, waitlistedCount: waitlisted||0, myAttendanceStatus: myStatus };
    }));
    res.json({ data: eventsWithCounts });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showcase - create event
router.post('/', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { eventName, eventDate, venueName, venueAddress, description, maxScouts, status } = req.body;
    if (!eventName) return res.status(400).json({ error: 'eventName required' });
    const { data, error } = await supabase.from('showcase_events').insert({ event_name: eventName, event_date: eventDate||null, venue_name: venueName||null, venue_address: venueAddress||null, description: description||null, max_scouts: maxScouts||20, status: status||'draft', confirmed: false }).select().single();
    if (error) throw error;
    res.status(201).json({ data, message: 'Event created' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/showcase/:id - single event with players
router.get('/:id', requireAuth, requireRole('Stratex','Scout'), async (req, res) => {
  try {
    const { data: ev, error } = await supabase.from('showcase_events').select('*').eq('id', req.params.id).single();
    if (error || !ev) return res.status(404).json({ error: 'Event not found' });
    const { data: spRows } = await supabase.from('showcase_players').select('*, players(id,first_name,last_name,age_group,specific_position,team_name,overall_rating,position_group)').eq('event_id', req.params.id);
    const { count: confirmed } = await supabase.from('showcase_attendance').select('id', { count:'exact', head:true }).eq('event_id', req.params.id).eq('status','confirmed');
    res.json({ event: ev, players: spRows||[], confirmedCount: confirmed||0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/showcase/:id - update event
router.patch('/:id', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const updates = {};
    const fields = ['eventName','eventDate','venueName','venueAddress','description','maxScouts','status'];
    const dbMap = { eventName:'event_name', eventDate:'event_date', venueName:'venue_name', venueAddress:'venue_address', description:'description', maxScouts:'max_scouts', status:'status' };
    fields.forEach(f => { if (req.body[f] !== undefined) updates[dbMap[f]] = req.body[f]; });
    const { data, error } = await supabase.from('showcase_events').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ data, message: 'Event updated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showcase/:id/players - add player to showcase
router.post('/:id/players', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const { data: ev } = await supabase.from('showcase_events').select('*').eq('id', req.params.id).single();
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const { data: player } = await supabase.from('players').select('id,first_name,last_name,email,parent_email,team_id,team_name,age_group').eq('id', playerId).single();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const { data: sp, error: spErr } = await supabase.from('showcase_players').upsert({ event_id: req.params.id, player_id: playerId, status: 'invited' }, { onConflict: 'event_id,player_id' }).select().single();
    if (spErr) throw spErr;
    const dateStr = ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'TBC';
    const pName = player.first_name + ' ' + player.last_name;
    const inviteHtml = '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px"><h1 style="color:#00E676">Showcase Invitation</h1><p>Your player <strong>' + pName + '</strong> has been selected to perform in the <strong>' + ev.event_name + '</strong> showcase on ' + dateStr + ' at ' + (ev.venue_name||'') + ', ' + (ev.venue_address||'') + '.</p><p>Please confirm attendance as soon as possible.</p><p style="color:#94a3b8;margin-top:32px">Stratex Analytics</p></div>';
    let coachNotified = false, parentNotified = false;
    if (player.team_id) {
      const { data: coach } = await supabase.from('coaches').select('id,email').eq('team_id', player.team_id).maybeSingle();
      if (coach && coach.email) {
        await sendDirectEmail(coach.email, 'Your player has been selected for a ScoutLink Showcase Event', inviteHtml);
        if (coach.id) await notify(coach.id, 'Coach', 'Showcase Player Selected', pName + ' has been selected for the ' + ev.event_name + ' showcase on ' + dateStr, { event_id: req.params.id, player_id: playerId });
        coachNotified = true;
      }
    }
    const parentEmail = player.parent_email || player.email;
    if (parentEmail) { await sendDirectEmail(parentEmail, 'Your player has been selected for a ScoutLink Showcase Event', inviteHtml); parentNotified = true; }
    await supabase.from('showcase_players').update({ coach_notified: coachNotified, parent_notified: parentNotified }).eq('id', sp.id);
    // Notify all scouts
    const { data: scouts } = await supabase.from('scouts').select('id').eq('is_active', true);
    if (scouts && scouts.length) {
      await createNotifications(scouts.map(s => ({
        recipient_id: s.id,
        recipient_type: 'Scout',
        notification_type: 'showcase_event',
        title: 'Showcase update',
        body: pName + ' has been added to the ' + ev.event_name + ' showcase.',
        data: { targetType: 'showcase_event', targetId: req.params.id, eventId: req.params.id, playerId, playerName: pName, source: 'showcase_player' }
      })));
    }
    res.status(201).json({ message: 'Player added to showcase', data: sp });
  } catch(e) { console.error('[Showcase AddPlayer]', e); res.status(500).json({ error: e.message }); }
});

// DELETE /api/showcase/:id/players/:playerId
router.delete('/:id/players/:playerId', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    await supabase.from('showcase_players').delete().eq('event_id', req.params.id).eq('player_id', req.params.playerId);
    res.json({ message: 'Player removed from showcase' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showcase/:id/confirm - confirm event and notify all scouts
router.post('/:id/confirm', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { data: ev, error } = await supabase.from('showcase_events').update({ confirmed: true, status: 'confirmed' }).eq('id', req.params.id).select().single();
    if (error) throw error;
    const { data: scouts } = await supabase.from('scouts').select('id,first_name,last_name,email').eq('is_active', true);
    if (scouts && scouts.length) {
      const html = eventHtml(ev.event_name, ev.event_date, ev.venue_name, ev.venue_address, ev.description, ev.max_scouts);
      const baseUrl = config.brandUrl || 'https://scoutlink.app';
      for (const scout of scouts) {
        if (scout.email) await sendDirectEmail(scout.email, 'ScoutLink Showcase Event: ' + ev.event_name, html + '<p style="margin-top:16px"><a href="' + baseUrl + '/frontend/pages/scout-events.html" style="background:#00E676;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">View Event & Confirm Attendance</a></p>');
        await notify(scout.id, 'Scout', 'Showcase Event: ' + ev.event_name, 'The ' + ev.event_name + ' showcase is confirmed for ' + (ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-GB') : 'TBC') + ' at ' + (ev.venue_name||''), { event_id: req.params.id, type: 'showcase_confirmed' });
      }
    }
    res.json({ message: 'Event confirmed, scouts notified', event: ev });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showcase/:id/cancel - cancel event and notify affected users
router.post('/:id/cancel', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const { data: ev, error } = await supabase.from('showcase_events').update({ status: 'cancelled', confirmed: false }).eq('id', req.params.id).select().single();
    if (error || !ev) return res.status(404).json({ error: 'Event not found' });
    const dateStr = ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : 'TBC';
    const subject = 'ScoutLink Showcase Cancelled: ' + ev.event_name;
    const html = '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px"><h1 style="color:#f85149">Showcase Event Cancelled</h1><p>The <strong>' + ev.event_name + '</strong> showcase scheduled for ' + dateStr + ' at ' + (ev.venue_name||'the venue') + ' has been cancelled.</p>' + (reason ? '<p><strong>Reason:</strong> ' + reason + '</p>' : '') + '<p>We will share any replacement event details separately.</p><p style="color:#94a3b8;margin-top:32px">Stratex Analytics - ScoutLink Platform</p></div>';
    const { data: scouts } = await supabase.from('scouts').select('id,email').eq('is_active', true);
    const { data: spRows } = await supabase.from('showcase_players').select('player_id').eq('event_id', req.params.id);
    const playerIds = [...new Set((spRows||[]).map(r => r.player_id).filter(Boolean))];
    let eventPlayers = [];
    if (playerIds.length) {
      const { data: players } = await supabase.from('players').select('id,email,parent_email,team_id').in('id', playerIds);
      eventPlayers = players || [];
    }
    const emails = new Set();
    const notifications = [];
    (scouts||[]).forEach(s => {
      if (s.email) emails.add(s.email);
      notifications.push({ recipient_id: s.id, recipient_type: 'Scout', title: 'Showcase Event Cancelled', body: ev.event_name + ' has been cancelled.', data: { event_id: req.params.id, type: 'showcase_cancelled' }, is_read: false });
    });
    eventPlayers.forEach(p => {
      if (p.email) emails.add(p.email);
      if (p.parent_email) emails.add(p.parent_email);
    });
    if (eventPlayers.length) {
      const teamIds = [...new Set(eventPlayers.map(p => p.team_id).filter(Boolean))];
      if (teamIds.length) {
        const { data: coaches } = await supabase.from('coaches').select('id,email').in('team_id', teamIds);
        (coaches||[]).forEach(c => {
          if (c.email) emails.add(c.email);
          notifications.push({ recipient_id: c.id, recipient_type: 'Coach', title: 'Showcase Event Cancelled', body: ev.event_name + ' has been cancelled.', data: { event_id: req.params.id, type: 'showcase_cancelled' }, is_read: false });
        });
      }
    }
    if (notifications.length) await createNotifications(notifications.map(n => ({
      ...n,
      notification_type: 'showcase_event',
      data: {
        ...(n.data || {}),
        targetType: 'showcase_event',
        targetId: req.params.id,
        eventId: req.params.id,
        source: 'showcase_cancelled'
      }
    })));
    await notifyStratexAdmins('Showcase Event Cancelled', ev.event_name + ' has been cancelled and affected users were notified.', { event_id: req.params.id, type: 'showcase_cancelled' });
    if (emails.size) await sendDirectEmail(Array.from(emails), subject, html);
    res.json({ message: 'Event cancelled and notifications sent', event: ev, notifiedEmails: emails.size, notifications: notifications.length });
  } catch(e) { console.error('[Showcase Cancel]', e); res.status(500).json({ error: e.message }); }
});

// POST /api/showcase/showcase-response (scout accept/decline player notification)
router.post('/player-response', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId, playerId, response } = req.body;
    if (!eventId || !playerId || !['accepted','declined'].includes(response)) return res.status(400).json({ error: 'eventId, playerId and response required' });
    const { data, error } = await supabase.from('showcase_responses').upsert({ event_id: eventId, player_id: playerId, scout_id: req.user.id, response, responded_at: new Date().toISOString() }, { onConflict: 'event_id,player_id,scout_id' }).select().single();
    if (error) throw error;
    res.json({ message: 'Response recorded', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showcase/attendance - scout confirm attendance at event
router.post('/attendance', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    const { data: ev } = await supabase.from('showcase_events').select('*').eq('id', eventId).single();
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const { count: confirmedCount } = await supabase.from('showcase_attendance').select('id', { count:'exact', head:true }).eq('event_id', eventId).eq('status', 'confirmed');
    const isFull = (confirmedCount||0) >= (ev.max_scouts||20);
    const status = isFull ? 'waitlisted' : 'confirmed';
    const { data, error } = await supabase.from('showcase_attendance').upsert({ event_id: eventId, scout_id: req.user.id, status, confirmed_at: new Date().toISOString() }, { onConflict: 'event_id,scout_id' }).select().single();
    if (error) throw error;
    const scoutName = ((req.user.firstName || '') + ' ' + (req.user.lastName || '')).trim() || req.user.email || 'A scout';
    await notifyStratexAdmins(
      status === 'confirmed' ? 'Scout accepted showcase event' : 'Scout joined showcase waitlist',
      scoutName + ' has ' + (status === 'confirmed' ? 'accepted' : 'joined the waitlist for') + ' ' + ev.event_name + '.',
      { event_id: eventId, scout_id: req.user.id, type: 'showcase_attendance', status }
    );
    if (isFull) return res.json({ message: 'Event is fully booked. You have been added to the waitlist.', status: 'waitlisted', data });
    res.json({ message: 'Attendance confirmed', status: 'confirmed', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/showcase/cancel-attendance
router.post('/cancel-attendance', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    await supabase.from('showcase_attendance').update({ status: 'cancelled' }).eq('event_id', eventId).eq('scout_id', req.user.id);
    // Check waitlist and promote next
    const { data: waitlist } = await supabase.from('showcase_attendance').select('*, scouts(id,first_name,last_name,email)').eq('event_id', eventId).eq('status', 'waitlisted').order('confirmed_at', { ascending: true }).limit(1);
    if (waitlist && waitlist.length) {
      const next = waitlist[0];
      await supabase.from('showcase_attendance').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', next.id);
      const { data: ev } = await supabase.from('showcase_events').select('event_name,event_date,venue_name').eq('id', eventId).single();
      if (next.scouts && next.scouts.email && ev) {
        await sendDirectEmail(next.scouts.email, 'A space is available at ' + ev.event_name, '<p>A space has become available at the ' + ev.event_name + ' showcase. You are now confirmed!</p>');
        await notify(next.scout_id, 'Scout', 'Showcase Space Available', 'A space is now available at ' + ev.event_name + '. You are confirmed!', { event_id: eventId, type: 'showcase_promoted' });
      }
    }
    res.json({ message: 'Attendance cancelled' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/showcase/:id/attendees
router.get('/:id/attendees', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { data: scouts, error: scoutErr } = await supabase.from('scouts').select('id,first_name,last_name,email,club_name,scout_team_id').eq('is_active', true).order('first_name');
    if (scoutErr) throw scoutErr;
    const { data: attendance, error } = await supabase.from('showcase_attendance').select('*').eq('event_id', req.params.id).order('confirmed_at', { ascending: true });
    if (error) throw error;
    const attendanceMap = {};
    (attendance||[]).forEach(a => { attendanceMap[a.scout_id] = a; });
    const rows = (scouts||[]).map(s => {
      const a = attendanceMap[s.id] || null;
      const raw = a ? a.status : 'not_responded';
      const display = raw === 'confirmed' || raw === 'waitlisted' ? 'accepted' : raw === 'cancelled' ? 'declined' : 'not_responded';
      return {
        ...(a || { event_id: req.params.id, scout_id: s.id, status: 'not_responded', confirmed_at: null }),
        display_status: display,
        raw_status: raw,
        scouts: s
      };
    });
    const confirmed = rows.filter(r => r.raw_status === 'confirmed');
    const waitlisted = rows.filter(r => r.raw_status === 'waitlisted');
    const cancelled = rows.filter(r => r.raw_status === 'cancelled');
    const notResponded = rows.filter(r => r.raw_status === 'not_responded');
    res.json({ scouts: rows, confirmed, waitlisted, cancelled, notResponded, total: rows.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
