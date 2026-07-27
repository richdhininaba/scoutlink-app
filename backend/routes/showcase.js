'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');
const { createNotification, createNotifications } = require('../services/notifications');
const email = require('../services/email');
const config = require('../config');

const EVENT_KEY = process.env.SHOWCASE_REGISTRATION_EVENT_KEY || 'bluewater-2026-09-12';
const HIGHLIGHT_BUCKET = 'showcase-player-highlights';
const INTERNAL_ALERT_RECIPIENTS = [
  'richdhin@stratexanalytics.co.uk',
  'lucy.ali@stratexanalytics.co.uk',
  'alexandro.ilioaie@stratexanalytics.co.uk'
];
const ALLOWED_POSITIONS = new Set([
  'Goalkeeper',
  'Right back',
  'Centre back',
  'Left back',
  'Defensive midfield',
  'Central midfield',
  'Attacking midfield',
  'Right wing',
  'Left wing',
  'Striker'
]);

const requireShowcaseManager = requireStratexAdminPermission(
  'showcase',
  'Showcase event access is restricted to authorised Stratex admin users.'
);

const publicRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many showcase registration attempts. Please wait and try again.'
  }
});

const highlightUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowedMimes = new Set([
      'video/mp4',
      'video/quicktime',
      'video/webm'
    ]);
    const allowedExtension = /\.(mp4|mov|webm)$/i.test(file.originalname || '');
    if (!allowedMimes.has(file.mimetype) || !allowedExtension) {
      return callback(new Error('Highlight videos must be MP4, MOV or WEBM.'));
    }
    callback(null, true);
  }
});

function cleanText(value, max = 500) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function cleanEmail(value) {
  const cleaned = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : '';
}

function cleanPhone(value) {
  const cleaned = cleanText(value, 40);
  return /^[+()\d\s-]{7,40}$/.test(cleaned) ? cleaned : '';
}

function booleanValue(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function roleDisplay(value) {
  const roles = {
    coach: 'Coach',
    scout: 'Scout',
    both: 'Coach and Scout'
  };
  return roles[value] || 'Coach or Scout';
}

function registrationReference(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function calculateAgeOnEventDate(dateOfBirth, eventDate) {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  const eventDateUtc = new Date(`${eventDate}T12:00:00.000Z`);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(eventDateUtc.getTime())) return null;
  let age = eventDateUtc.getUTCFullYear() - dob.getUTCFullYear();
  const monthDifference = eventDateUtc.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && eventDateUtc.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

function formatSubmittedAt(value) {
  return new Date(value || Date.now()).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London'
  });
}

function safeFileName(value) {
  const extension = path.extname(String(value || '')).toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

async function eventConfig() {
  const { data, error } = await supabase
    .from('showcase_registration_events')
    .select('*')
    .eq('event_key', EVENT_KEY)
    .single();
  if (error || !data) {
    throw new Error('The showcase event configuration is unavailable.');
  }
  return data;
}

async function sendInternalRegistrationAlert(payload) {
  return email.sendTemplate({
    to: INTERNAL_ALERT_RECIPIENTS,
    templateKey: 'showcaseInternalRegistrationAlert',
    data: payload
  });
}

async function updateEmailStatus(table, id, confirmationResult, alertResult) {
  const updates = {
    confirmation_email_sent: !!(confirmationResult && confirmationResult.success),
    internal_alert_sent: !!(alertResult && alertResult.success)
  };
  const { error } = await supabase.from(table).update(updates).eq('id', id);
  if (error) {
    console.error('[Showcase email status]', error.message);
  }
}

async function notifyStratexAdmins(title, body, data) {
  try {
    const { data: admins } = await supabase
      .from('stratex')
      .select('id,email')
      .eq('is_active', true);
    if (!admins || !admins.length) return;
    await createNotifications(admins.map((admin) => ({
      recipient_id: admin.id,
      recipient_type: 'Stratex',
      notification_type: 'showcase_event',
      title,
      body,
      data: data || {}
    })));
  } catch (error) {
    console.error('[Showcase admin notification]', error.message);
  }
}

async function sendDirectEmail(to, subject, html) {
  if (!config.sendgrid.apiKey) return;
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendgrid.apiKey);
    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    if (!recipients.length) return;
    await sgMail.send({
      to: recipients,
      from: {
        email: config.sendgrid.fromEmail,
        name: config.sendgrid.fromName
      },
      subject,
      html
    });
  } catch (error) {
    console.error('[Showcase direct email]', error?.response?.body || error.message);
  }
}

async function notify(recipientId, recipientType, title, body, data) {
  try {
    const details = data || {};
    await createNotification({
      recipient_id: recipientId,
      recipient_type: recipientType,
      notification_type: 'showcase_event',
      title,
      body,
      data: {
        ...details,
        targetType: 'showcase_event',
        targetId: details.event_id || details.eventId || null,
        eventId: details.event_id || details.eventId || null,
        source: details.source || 'showcase'
      }
    });
  } catch (_) {
    // Notification failure must not block the main event operation.
  }
}

function eventHtml(eventName, eventDate, venueName, venueAddress, description, maxScouts) {
  const dateString = eventDate
    ? new Date(eventDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : 'TBC';
  return [
    '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px">',
    '<h1 style="color:#00E676">ScoutLink Showcase Event</h1>',
    '<div style="background:#111827;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #00E676">',
    `<h2 style="color:#fff;margin:0">${cleanText(eventName, 200)}</h2>`,
    `<p style="color:#94a3b8">${cleanText(dateString, 100)}</p>`,
    `<p style="color:#E2E8F0">${cleanText(venueName, 200)}, ${cleanText(venueAddress, 600)}</p>`,
    description ? `<p style="color:#B0BEC5">${cleanText(description, 1200)}</p>` : '',
    '</div>',
    `<p>Spaces are limited to <strong>${Number(maxScouts || 20)}</strong> scouts.</p>`,
    '<p style="color:#94a3b8;margin-top:32px">Stratex Analytics - ScoutLink Platform</p>',
    '</div>'
  ].join('');
}

// Public registration configuration and capacity.
router.get('/registrations/config', async (req, res) => {
  try {
    const event = await eventConfig();
    const { count } = await supabase
      .from('showcase_professional_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .not('status', 'in', '(cancelled,declined)');
    const confirmedCount = count || 0;
    res.json({
      event: {
        eventKey: event.event_key,
        eventName: event.event_name,
        eventDate: event.event_date,
        playerArrivalTime: event.player_arrival_time,
        professionalArrivalTime: event.professional_arrival_time,
        venueName: event.venue_name,
        venueAddress: event.venue_address,
        playerMinAge: event.player_min_age,
        playerMaxAge: event.player_max_age,
        professionalCapacity: event.professional_capacity,
        playerRegistrationOpen: event.player_registration_open,
        professionalRegistrationOpen: event.professional_registration_open
      },
      capacity: {
        confirmed: confirmedCount,
        limit: event.professional_capacity,
        remaining: Math.max(0, event.professional_capacity - confirmedCount),
        soldOut: !event.professional_registration_open || confirmedCount >= event.professional_capacity
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/registrations/player',
  publicRegistrationLimiter,
  highlightUpload.single('highlightVideo'),
  async (req, res) => {
    let uploadedPath = null;
    let insertedRegistrationId = null;
    try {
      const event = await eventConfig();
      if (!event.player_registration_open) {
        return res.status(409).json({ error: 'Player registration is currently closed.' });
      }

      const firstName = cleanText(req.body.firstName, 100);
      const lastName = cleanText(req.body.lastName, 100);
      const dateOfBirth = cleanText(req.body.dateOfBirth, 10);
      const age = calculateAgeOnEventDate(dateOfBirth, event.event_date);
      const playsForTeam = booleanValue(req.body.currentlyPlaysForTeam);
      const teamType = playsForTeam ? cleanText(req.body.teamType, 40) : null;
      const teamName = playsForTeam ? cleanText(req.body.teamName, 200) : null;
      const coachName = playsForTeam ? cleanText(req.body.coachName, 160) : null;
      const canPlayGoalkeeper = booleanValue(req.body.canPlayGoalkeeper);
      const preferredFoot = cleanText(req.body.preferredFoot, 20).toLowerCase();
      const travelConfirmed = booleanValue(req.body.travelConfirmed);
      const guardianAware = booleanValue(req.body.guardianAware);
      const rawPositions = Array.isArray(req.body.positions)
        ? req.body.positions
        : String(req.body.positions || '').split(',');
      const positions = [...new Set(rawPositions.map((item) => cleanText(item, 60)).filter(Boolean))];

      if (!firstName || !lastName || !dateOfBirth) {
        return res.status(400).json({ error: 'First name, last name and date of birth are required.' });
      }
      if (
        age === null ||
        age < Number(event.player_min_age) ||
        age > Number(event.player_max_age)
      ) {
        return res.status(400).json({
          error: `Players must be aged ${event.player_min_age} to ${event.player_max_age} on the event date.`
        });
      }
      if (positions.length < 1 || positions.length > 3 || positions.some((item) => !ALLOWED_POSITIONS.has(item))) {
        return res.status(400).json({ error: 'Choose between one and three valid positions.' });
      }
      if (!['left', 'right', 'both'].includes(preferredFoot)) {
        return res.status(400).json({ error: 'Choose Left, Right or Both as the preferred foot.' });
      }
      if (!travelConfirmed) {
        return res.status(400).json({ error: 'You must confirm that you can travel to the event.' });
      }
      if (playsForTeam && (!['professional', 'non_professional'].includes(teamType) || !teamName || !coachName)) {
        return res.status(400).json({ error: 'Enter the team type, team name and coach name.' });
      }

      const isGuardianBranch = age >= 12 && age <= 14;
      const playerEmail = isGuardianBranch ? null : cleanEmail(req.body.playerEmail);
      const playerPhone = isGuardianBranch ? null : cleanPhone(req.body.playerPhone);
      const guardianEmail = isGuardianBranch ? cleanEmail(req.body.guardianEmail) : null;
      const guardianPhone = isGuardianBranch ? cleanPhone(req.body.guardianPhone) : null;

      if (isGuardianBranch && (!guardianEmail || !guardianPhone || !guardianAware)) {
        return res.status(400).json({
          error: 'A parent or guardian email, phone number and awareness confirmation are required for players aged 12 to 14.'
        });
      }
      if (!isGuardianBranch && (!playerEmail || !playerPhone)) {
        return res.status(400).json({
          error: 'An email address and phone number are required for players aged 15 to 16.'
        });
      }

      const reference = registrationReference('PL');
      const insertPayload = {
        event_id: event.id,
        registration_reference: reference,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        age_on_event_date: age,
        contact_type: isGuardianBranch ? 'guardian' : 'player',
        player_email: playerEmail,
        player_phone: playerPhone,
        guardian_email: guardianEmail,
        guardian_phone: guardianPhone,
        currently_plays_for_team: playsForTeam,
        team_type: teamType,
        team_name: teamName,
        coach_name: coachName,
        positions,
        can_play_goalkeeper: canPlayGoalkeeper,
        preferred_foot: preferredFoot,
        travel_confirmed: true,
        guardian_aware: isGuardianBranch ? true : null,
        status: 'new'
      };

      const { data: registration, error: insertError } = await supabase
        .from('showcase_player_registrations')
        .insert(insertPayload)
        .select('*')
        .single();
      if (insertError) throw insertError;
      insertedRegistrationId = registration.id;

      if (req.file) {
        uploadedPath = `${event.id}/${registration.id}/${safeFileName(req.file.originalname)}`;
        const { error: uploadError } = await supabase.storage
          .from(HIGHLIGHT_BUCKET)
          .upload(uploadedPath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });
        if (uploadError) throw uploadError;

        const { error: videoUpdateError } = await supabase
          .from('showcase_player_registrations')
          .update({
            highlight_storage_path: uploadedPath,
            highlight_file_name: cleanText(req.file.originalname, 260),
            highlight_mime_type: cleanText(req.file.mimetype, 120),
            highlight_size_bytes: Number(req.file.size) || null
          })
          .eq('id', registration.id);
        if (videoUpdateError) throw videoUpdateError;
      }

      const confirmationResult = isGuardianBranch
        ? await email.sendTemplate({
          to: guardianEmail,
          templateKey: 'showcaseGuardianConfirmation',
          data: {
            playerFirstName: firstName,
            playerLastName: lastName
          }
        })
        : await email.sendTemplate({
          to: playerEmail,
          templateKey: 'showcasePlayerPersonalConfirmation',
          data: {
            playerFirstName: firstName
          }
        });

      const submittedAt = registration.submitted_at || new Date().toISOString();
      const alertResult = await sendInternalRegistrationAlert({
        registrationType: 'Player',
        fullName: `${firstName} ${lastName}`,
        detailLabel: 'Age on event date',
        detailValue: String(age),
        teamOrOrganisation: teamName || 'No team provided',
        submittedAt: formatSubmittedAt(submittedAt)
      });

      await updateEmailStatus(
        'showcase_player_registrations',
        registration.id,
        confirmationResult,
        alertResult
      );

      await notifyStratexAdmins(
        'New showcase player registration',
        `${firstName} ${lastName}, age ${age}, submitted a showcase registration.`,
        {
          registrationType: 'player',
          registrationId: registration.id,
          targetPath: `/admin/showcase-event?type=player&id=${registration.id}`
        }
      );

      res.status(201).json({
        status: 'received',
        registrationReference: reference,
        player: {
          firstName,
          lastName,
          ageOnEventDate: age,
          contactType: isGuardianBranch ? 'guardian' : 'player'
        },
        event: {
          eventName: event.event_name,
          eventDate: event.event_date,
          arrivalTime: event.player_arrival_time,
          venueName: event.venue_name,
          venueAddress: event.venue_address
        }
      });
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage.from(HIGHLIGHT_BUCKET).remove([uploadedPath]);
      }
      if (insertedRegistrationId) {
        await supabase
          .from('showcase_player_registrations')
          .delete()
          .eq('id', insertedRegistrationId);
      }
      console.error('[Showcase player registration]', error);
      if (String(error && error.code) === '23505') {
        return res.status(409).json({
          error: 'This player is already registered for the showcase.'
        });
      }
      res.status(500).json({ error: 'The player registration could not be saved. Please try again.' });
    }
  }
);

router.post('/registrations/professional', publicRegistrationLimiter, async (req, res) => {
  try {
    const firstName = cleanText(req.body.firstName, 100);
    const lastName = cleanText(req.body.lastName, 100);
    const emailAddress = cleanEmail(req.body.email);
    const phone = cleanPhone(req.body.phone);
    const teamName = cleanText(req.body.teamName, 200);
    const role = cleanText(req.body.role, 20).toLowerCase();
    const attendanceConfirmed = booleanValue(req.body.attendanceConfirmed);

    if (!firstName || !lastName || !emailAddress || !phone || !teamName) {
      return res.status(400).json({ error: 'Complete every professional registration field.' });
    }
    if (!['coach', 'scout', 'both'].includes(role)) {
      return res.status(400).json({ error: 'Choose Coach, Scout or Both.' });
    }
    if (!attendanceConfirmed) {
      return res.status(400).json({
        error: 'Only register if you are 100% sure you can attend at 12:30 PM.'
      });
    }

    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'register_showcase_professional',
      {
        p_event_key: EVENT_KEY,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: emailAddress,
        p_phone: phone,
        p_team_name: teamName,
        p_role: role
      }
    );
    if (rpcError) {
      if (/already registered/i.test(rpcError.message || '')) {
        return res.status(409).json({ error: rpcError.message });
      }
      throw rpcError;
    }

    const result = rpcResult || {};
    const submittedAt = new Date().toISOString();
    const displayRole = roleDisplay(role);
    let confirmationResult = { success: false, skipped: true };

    if (result.status === 'registered') {
      confirmationResult = await email.sendTemplate({
        to: emailAddress,
        templateKey: 'showcaseProfessionalConfirmation',
        data: {
          firstName,
          role: displayRole,
          teamName
        }
      });
    }

    const alertResult = await sendInternalRegistrationAlert({
      registrationType: displayRole,
      fullName: `${firstName} ${lastName}`,
      detailLabel: 'Role',
      detailValue: displayRole,
      teamOrOrganisation: teamName || 'No team provided',
      submittedAt: formatSubmittedAt(submittedAt)
    });

    const table = result.status === 'registered'
      ? 'showcase_professional_registrations'
      : 'showcase_professional_waitlist';
    await updateEmailStatus(table, result.id, confirmationResult, alertResult);

    await notifyStratexAdmins(
      result.status === 'registered'
        ? 'New showcase coach or scout registration'
        : 'New showcase professional waitlist registration',
      `${firstName} ${lastName} registered as ${displayRole}.`,
      {
        registrationType: result.status === 'registered' ? 'professional' : 'waitlist',
        registrationId: result.id,
        targetPath: `/admin/showcase-event?type=${result.status === 'registered' ? 'professional' : 'waitlist'}&id=${result.id}`
      }
    );

    res.status(201).json({
      ...result,
      attendee: {
        firstName,
        lastName,
        role: displayRole,
        teamName
      }
    });
  } catch (error) {
    console.error('[Showcase professional registration]', error);
    res.status(500).json({ error: 'The registration could not be saved. Please try again.' });
  }
});

// Stratex Admin registration workspace.
router.get(
  '/registrations/admin/overview',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const event = await eventConfig();
      const [playersResult, professionalsResult, waitlistResult] = await Promise.all([
        supabase
          .from('showcase_player_registrations')
          .select('*')
          .eq('event_id', event.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('showcase_professional_registrations')
          .select('*')
          .eq('event_id', event.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('showcase_professional_waitlist')
          .select('*')
          .eq('event_id', event.id)
          .order('submitted_at', { ascending: true })
      ]);
      if (playersResult.error) throw playersResult.error;
      if (professionalsResult.error) throw professionalsResult.error;
      if (waitlistResult.error) throw waitlistResult.error;

      const players = playersResult.data || [];
      const professionals = professionalsResult.data || [];
      const waitlist = waitlistResult.data || [];
      const activeProfessionals = professionals.filter((row) => !['cancelled', 'declined'].includes(row.status));

      res.json({
        event,
        metrics: {
          playerRegistrations: players.length,
          professionalRegistrations: activeProfessionals.length,
          professionalCapacity: event.professional_capacity,
          professionalRemaining: Math.max(0, event.professional_capacity - activeProfessionals.length),
          waitlist: waitlist.length,
          highlightVideos: players.filter((row) => !!row.highlight_storage_path).length,
          selectedPlayers: players.filter((row) => row.selected_for_showcase).length
        },
        players,
        professionals,
        waitlist
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/registrations/admin/player/:id',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('showcase_player_registrations')
        .select('*, assignedCoach:showcase_professional_registrations!showcase_player_registrations_assigned_event_coach_id_fkey(id,first_name,last_name,email,phone,team_name,role,status)')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Player registration not found.' });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/registrations/admin/professional/:id',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('showcase_professional_registrations')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Professional registration not found.' });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/registrations/admin/waitlist/:id',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('showcase_professional_waitlist')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Waitlist registration not found.' });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/registrations/admin/player/:id/highlight',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const { data: registration, error } = await supabase
        .from('showcase_player_registrations')
        .select('highlight_storage_path,highlight_file_name')
        .eq('id', req.params.id)
        .single();
      if (error || !registration || !registration.highlight_storage_path) {
        return res.status(404).json({ error: 'No highlight video is attached.' });
      }
      const { data: signed, error: signedError } = await supabase.storage
        .from(HIGHLIGHT_BUCKET)
        .createSignedUrl(registration.highlight_storage_path, 300);
      if (signedError) throw signedError;
      res.json({
        url: signed.signedUrl,
        fileName: registration.highlight_file_name
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.patch(
  '/registrations/admin/player/:id',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const updates = {};
      if (req.body.status !== undefined) {
        const status = cleanText(req.body.status, 30);
        if (!['new', 'contacted', 'selected', 'not_selected', 'withdrawn'].includes(status)) {
          return res.status(400).json({ error: 'Invalid player status.' });
        }
        updates.status = status;
        if (status === 'contacted') updates.contacted_at = new Date().toISOString();
      }
      if (req.body.internalNotes !== undefined) {
        updates.internal_notes = cleanText(req.body.internalNotes, 5000) || null;
      }
      const { data, error } = await supabase
        .from('showcase_player_registrations')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error) throw error;
      res.json({ data, message: 'Player registration updated.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.patch(
  '/registrations/admin/player/:id/selection',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const selected = booleanValue(req.body.selected);
      const assignedCoachId = cleanText(req.body.assignedCoachId, 80) || null;
      if (selected && !assignedCoachId) {
        return res.status(400).json({ error: 'Assign an event coach before confirming the player.' });
      }
      const { data: playerRegistration, error: playerError } = await supabase
        .from('showcase_player_registrations')
        .select('id,event_id')
        .eq('id', req.params.id)
        .single();
      if (playerError || !playerRegistration) {
        return res.status(404).json({ error: 'Player registration not found.' });
      }
      if (assignedCoachId) {
        const { data: coach, error: coachError } = await supabase
          .from('showcase_professional_registrations')
          .select('id,event_id,role,status')
          .eq('id', assignedCoachId)
          .single();
        if (
          coachError ||
          !coach ||
          String(coach.event_id) !== String(playerRegistration.event_id) ||
          !['coach', 'both'].includes(coach.role) ||
          ['cancelled', 'declined'].includes(coach.status)
        ) {
          return res.status(400).json({ error: 'Choose an active registered Coach or Coach and Scout from this event.' });
        }
      }
      const updates = {
        selected_for_showcase: selected,
        assigned_event_coach_id: selected ? assignedCoachId : null,
        status: selected ? 'selected' : 'new',
        selected_at: selected ? new Date().toISOString() : null
      };
      const { data, error } = await supabase
        .from('showcase_player_registrations')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error) throw error;
      res.json({ data, message: selected ? 'Player selected and event coach assigned.' : 'Player selection removed.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.patch(
  '/registrations/admin/professional/:id',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const updates = {};
      if (req.body.status !== undefined) {
        const status = cleanText(req.body.status, 30);
        if (!['registered', 'contacted', 'confirmed', 'cancelled', 'declined'].includes(status)) {
          return res.status(400).json({ error: 'Invalid professional status.' });
        }
        updates.status = status;
        if (status === 'contacted') updates.contacted_at = new Date().toISOString();
        if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
      }
      if (req.body.internalNotes !== undefined) {
        updates.internal_notes = cleanText(req.body.internalNotes, 5000) || null;
      }
      const { data, error } = await supabase
        .from('showcase_professional_registrations')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error) throw error;
      res.json({ data, message: 'Professional registration updated.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.patch(
  '/registrations/admin/waitlist/:id',
  requireAuth,
  requireRole('Stratex'),
  requireShowcaseManager,
  async (req, res) => {
    try {
      const updates = {};
      if (req.body.status !== undefined) {
        const status = cleanText(req.body.status, 30);
        if (!['waiting', 'contacted', 'promoted', 'closed'].includes(status)) {
          return res.status(400).json({ error: 'Invalid waitlist status.' });
        }
        updates.status = status;
        if (status === 'contacted') updates.contacted_at = new Date().toISOString();
      }
      if (req.body.internalNotes !== undefined) {
        updates.internal_notes = cleanText(req.body.internalNotes, 5000) || null;
      }
      const { data, error } = await supabase
        .from('showcase_professional_waitlist')
        .update(updates)
        .eq('id', req.params.id)
        .select('*')
        .single();
      if (error) throw error;
      res.json({ data, message: 'Waitlist registration updated.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Existing ScoutLink showcase-event routes retained below.
router.get('/', requireAuth, requireRole('Stratex', 'Scout'), async (req, res) => {
  try {
    let query = supabase.from('showcase_events').select('*').order('event_date', { ascending: true });
    if (req.user && req.user.accountType === 'Scout') {
      query = query.in('status', ['published', 'confirmed']);
    }
    const { data, error } = await query;
    if (error) throw error;
    const eventsWithCounts = await Promise.all((data || []).map(async (event) => {
      const { count: confirmed } = await supabase
        .from('showcase_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'confirmed');
      const { count: waitlisted } = await supabase
        .from('showcase_attendance')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'waitlisted');
      let myStatus = null;
      if (req.user && req.user.accountType === 'Scout') {
        const { data: attendance } = await supabase
          .from('showcase_attendance')
          .select('status')
          .eq('event_id', event.id)
          .eq('scout_id', req.user.id)
          .maybeSingle();
        myStatus = attendance ? attendance.status : null;
      }
      return {
        ...event,
        confirmedCount: confirmed || 0,
        waitlistedCount: waitlisted || 0,
        myAttendanceStatus: myStatus
      };
    }));
    res.json({ data: eventsWithCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const {
      eventName,
      eventDate,
      venueName,
      venueAddress,
      description,
      maxScouts,
      status
    } = req.body;
    if (!eventName) return res.status(400).json({ error: 'eventName required' });
    const { data, error } = await supabase
      .from('showcase_events')
      .insert({
        event_name: eventName,
        event_date: eventDate || null,
        venue_name: venueName || null,
        venue_address: venueAddress || null,
        description: description || null,
        max_scouts: maxScouts || 20,
        status: status || 'draft',
        confirmed: false
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data, message: 'Event created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', requireAuth, requireRole('Stratex', 'Scout'), async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('showcase_events')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    const { data: players } = await supabase
      .from('showcase_players')
      .select('*, players(id,first_name,last_name,age_group,specific_position,team_name,overall_rating,position_group)')
      .eq('event_id', req.params.id);
    const { count: confirmed } = await supabase
      .from('showcase_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', req.params.id)
      .eq('status', 'confirmed');
    res.json({ event, players: players || [], confirmedCount: confirmed || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const updates = {};
    const fields = ['eventName', 'eventDate', 'venueName', 'venueAddress', 'description', 'maxScouts', 'status'];
    const map = {
      eventName: 'event_name',
      eventDate: 'event_date',
      venueName: 'venue_name',
      venueAddress: 'venue_address',
      description: 'description',
      maxScouts: 'max_scouts',
      status: 'status'
    };
    fields.forEach((field) => {
      if (req.body[field] !== undefined) updates[map[field]] = req.body[field];
    });
    const { data, error } = await supabase
      .from('showcase_events')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data, message: 'Event updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/players', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const { data: event } = await supabase.from('showcase_events').select('*').eq('id', req.params.id).single();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const { data: player } = await supabase
      .from('players')
      .select('id,first_name,last_name,email,parent_email,team_id,team_name,age_group')
      .eq('id', playerId)
      .single();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const { data: showcasePlayer, error } = await supabase
      .from('showcase_players')
      .upsert(
        { event_id: req.params.id, player_id: playerId, status: 'invited' },
        { onConflict: 'event_id,player_id' }
      )
      .select()
      .single();
    if (error) throw error;
    const playerName = `${player.first_name} ${player.last_name}`;
    const dateString = event.event_date
      ? new Date(event.event_date).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      : 'TBC';
    const html = `<p>${playerName} has been selected for ${event.event_name} on ${dateString}.</p>`;
    let coachNotified = false;
    let parentNotified = false;
    if (player.team_id) {
      const { data: coach } = await supabase
        .from('coaches')
        .select('id,email')
        .eq('team_id', player.team_id)
        .maybeSingle();
      if (coach && coach.email) {
        await sendDirectEmail(coach.email, 'Your player has been selected for a ScoutLink Showcase Event', html);
        if (coach.id) {
          await notify(coach.id, 'Coach', 'Showcase Player Selected', `${playerName} has been selected for the showcase.`, {
            event_id: req.params.id,
            player_id: playerId
          });
        }
        coachNotified = true;
      }
    }
    const parentEmail = player.parent_email || player.email;
    if (parentEmail) {
      await sendDirectEmail(parentEmail, 'Your player has been selected for a ScoutLink Showcase Event', html);
      parentNotified = true;
    }
    await supabase
      .from('showcase_players')
      .update({ coach_notified: coachNotified, parent_notified: parentNotified })
      .eq('id', showcasePlayer.id);
    res.status(201).json({ message: 'Player added to showcase', data: showcasePlayer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/players/:playerId', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    await supabase
      .from('showcase_players')
      .delete()
      .eq('event_id', req.params.id)
      .eq('player_id', req.params.playerId);
    res.json({ message: 'Player removed from showcase' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/confirm', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { data: event, error } = await supabase
      .from('showcase_events')
      .update({ confirmed: true, status: 'confirmed' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    const { data: scouts } = await supabase
      .from('scouts')
      .select('id,first_name,last_name,email')
      .eq('is_active', true);
    if (scouts && scouts.length) {
      const html = eventHtml(
        event.event_name,
        event.event_date,
        event.venue_name,
        event.venue_address,
        event.description,
        event.max_scouts
      );
      for (const scout of scouts) {
        if (scout.email) {
          await sendDirectEmail(scout.email, `ScoutLink Showcase Event: ${event.event_name}`, html);
        }
        await notify(scout.id, 'Scout', `Showcase Event: ${event.event_name}`, 'The showcase event is confirmed.', {
          event_id: req.params.id,
          source: 'showcase_confirmed'
        });
      }
    }
    res.json({ message: 'Event confirmed, scouts notified', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { reason } = req.body || {};
    const { data: event, error } = await supabase
      .from('showcase_events')
      .update({ status: 'cancelled', confirmed: false })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error || !event) return res.status(404).json({ error: 'Event not found' });
    await notifyStratexAdmins(
      'Showcase Event Cancelled',
      `${event.event_name} has been cancelled.`,
      { event_id: req.params.id, reason: cleanText(reason, 1000) }
    );
    res.json({ message: 'Event cancelled', event });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/player-response', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId, playerId, response } = req.body;
    if (!eventId || !playerId || !['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'eventId, playerId and response required' });
    }
    const { data, error } = await supabase
      .from('showcase_responses')
      .upsert(
        {
          event_id: eventId,
          player_id: playerId,
          scout_id: req.user.id,
          response,
          responded_at: new Date().toISOString()
        },
        { onConflict: 'event_id,player_id,scout_id' }
      )
      .select()
      .single();
    if (error) throw error;
    res.json({ message: 'Response recorded', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/attendance', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    const { data: event } = await supabase.from('showcase_events').select('*').eq('id', eventId).single();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const { count } = await supabase
      .from('showcase_attendance')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed');
    const isFull = (count || 0) >= (event.max_scouts || 20);
    const status = isFull ? 'waitlisted' : 'confirmed';
    const { data, error } = await supabase
      .from('showcase_attendance')
      .upsert(
        {
          event_id: eventId,
          scout_id: req.user.id,
          status,
          confirmed_at: new Date().toISOString()
        },
        { onConflict: 'event_id,scout_id' }
      )
      .select()
      .single();
    if (error) throw error;
    res.json({
      message: isFull
        ? 'Event is fully booked. You have been added to the waitlist.'
        : 'Attendance confirmed',
      status,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cancel-attendance', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ error: 'eventId required' });
    await supabase
      .from('showcase_attendance')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('scout_id', req.user.id);
    res.json({ message: 'Attendance cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/attendees', requireAuth, requireRole('Stratex'), requireShowcaseManager, async (req, res) => {
  try {
    const { data: scouts, error: scoutError } = await supabase
      .from('scouts')
      .select('id,first_name,last_name,email,club_name,scout_team_id')
      .eq('is_active', true)
      .order('first_name');
    if (scoutError) throw scoutError;
    const { data: attendance, error } = await supabase
      .from('showcase_attendance')
      .select('*')
      .eq('event_id', req.params.id)
      .order('confirmed_at', { ascending: true });
    if (error) throw error;
    const map = {};
    (attendance || []).forEach((row) => {
      map[row.scout_id] = row;
    });
    const rows = (scouts || []).map((scout) => {
      const record = map[scout.id] || null;
      const raw = record ? record.status : 'not_responded';
      const display = raw === 'confirmed' || raw === 'waitlisted'
        ? 'accepted'
        : raw === 'cancelled'
          ? 'declined'
          : 'not_responded';
      return {
        ...(record || {
          event_id: req.params.id,
          scout_id: scout.id,
          status: 'not_responded',
          confirmed_at: null
        }),
        display_status: display,
        raw_status: raw,
        scouts: scout
      };
    });
    res.json({
      scouts: rows,
      confirmed: rows.filter((row) => row.raw_status === 'confirmed'),
      waitlisted: rows.filter((row) => row.raw_status === 'waitlisted'),
      cancelled: rows.filter((row) => row.raw_status === 'cancelled'),
      notResponded: rows.filter((row) => row.raw_status === 'not_responded'),
      total: rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
