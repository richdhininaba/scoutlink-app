'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { supabase } = require('../db/supabase');
const { createNotifications } = require('../services/notifications');
const email = require('../services/email');

const router = express.Router();
const EVENT_KEY = process.env.SHOWCASE_REGISTRATION_EVENT_KEY || 'bluewater-2026-09-12';
const HIGHLIGHT_BUCKET = 'showcase-player-highlights';
const INTERNAL_ALERT_RECIPIENTS = [
  'richdhin@stratexanalytics.co.uk',
  'lucy.ali@stratexanalytics.co.uk',
  'alexandro.ilioaie@stratexanalytics.co.uk'
];

const POSITIONS = new Set([
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
const AGE_GROUPS = new Set(['U12', 'U13', 'U14', 'U15', 'U16']);
const LEVELS = new Set([
  'Grassroots / Sunday league',
  'Non-professional academy',
  'Professional academy',
  'School / college football',
  'Other'
]);

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many Showcase registration attempts. Please wait and try again.' }
});

const highlightUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mimeOk = new Set(['video/mp4', 'video/quicktime', 'video/webm']).has(file.mimetype);
    const extOk = /\.(mp4|mov|webm)$/i.test(file.originalname || '');
    if (!mimeOk || !extOk) return cb(new Error('Highlight videos must be MP4, MOV or WEBM.'));
    cb(null, true);
  }
});

function cleanText(value, max = 500) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}
function cleanEmail(value) {
  const v = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : '';
}
function cleanPhone(value) {
  const v = cleanText(value, 40);
  return /^[+()\d\s-]{7,40}$/.test(v) ? v : '';
}
function bool(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value || '').toLowerCase());
}
function reference(prefix) {
  return `${prefix}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}
function calculateAge(dobValue, eventDateValue) {
  const dob = new Date(`${dobValue}T00:00:00.000Z`);
  const event = new Date(`${eventDateValue}T12:00:00.000Z`);
  if (Number.isNaN(dob.getTime()) || Number.isNaN(event.getTime())) return null;
  let age = event.getUTCFullYear() - dob.getUTCFullYear();
  const month = event.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && event.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}
function safeFileName(value) {
  const ext = path.extname(String(value || '')).toLowerCase();
  return `${Date.now()}-${crypto.randomUUID()}${ext}`;
}
function roleDisplay(value) {
  return { coach: 'Coach', scout: 'Scout', both: 'Coach and Scout' }[value] || 'Coach or Scout';
}

async function eventConfig() {
  let query = supabase.from('showcase_registration_events').select('*').eq('event_key', EVENT_KEY).maybeSingle();
  let { data, error } = await query;
  if (!data || error) {
    const fallback = await supabase.from('showcase_registration_events').select('*').order('event_date', { ascending: false }).limit(1).maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }
  if (error || !data) throw new Error('The Showcase event configuration is unavailable.');
  return data;
}

async function professionalCapacity(event) {
  const { count, error } = await supabase
    .from('showcase_professional_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .not('status', 'in', '(cancelled,declined)');
  if (error) throw error;
  const confirmed = count || 0;
  const limit = Number(event.professional_capacity || 30);
  return {
    confirmed,
    limit,
    remaining: Math.max(0, limit - confirmed),
    soldOut: !event.professional_registration_open || confirmed >= limit
  };
}

async function sendInternalAlert(data) {
  try {
    return await email.sendTemplate({
      to: INTERNAL_ALERT_RECIPIENTS,
      templateKey: 'showcaseInternalRegistrationAlert',
      data
    });
  } catch (error) {
    console.error('[Showcase V8 internal email]', error.message);
    return { success: false };
  }
}

async function notifyAdmins(title, body, data) {
  try {
    const { data: admins } = await supabase.from('stratex').select('id').eq('is_active', true);
    if (!admins || !admins.length) return;
    await createNotifications(admins.map((admin) => ({
      recipient_id: admin.id,
      recipient_type: 'Stratex',
      notification_type: 'showcase_event',
      title,
      body,
      data: Object.assign({ source: 'showcase_v8' }, data || {})
    })));
  } catch (error) {
    console.error('[Showcase V8 notification]', error.message);
  }
}

async function updateMailFlags(table, id, confirmation, alert) {
  try {
    await supabase.from(table).update({
      confirmation_email_sent: !!(confirmation && confirmation.success),
      internal_alert_sent: !!(alert && alert.success)
    }).eq('id', id);
  } catch (error) {
    console.error('[Showcase V8 email flags]', error.message);
  }
}

router.get('/registrations/config', async (req, res) => {
  try {
    const event = await eventConfig();
    const capacity = await professionalCapacity(event);
    res.set('Cache-Control', 'no-store');
    res.json({
      event: {
        id: event.id,
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
      capacity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/registrations/player', publicLimiter, highlightUpload.single('highlightVideo'), async (req, res) => {
  let uploadedPath = null;
  let insertedId = null;
  try {
    const event = await eventConfig();
    if (!event.player_registration_open) return res.status(409).json({ error: 'Player registration is currently closed.' });

    const firstName = cleanText(req.body.firstName, 100);
    const lastName = cleanText(req.body.lastName, 100);
    const dateOfBirth = cleanText(req.body.dateOfBirth, 10);
    const age = calculateAge(dateOfBirth, event.event_date);
    const teamName = cleanText(req.body.teamName, 200);
    const currentAgeGroup = cleanText(req.body.currentAgeGroup, 10).toUpperCase();
    const currentLevel = cleanText(req.body.currentLevel, 100);
    const preferredFoot = cleanText(req.body.preferredFoot, 20).toLowerCase();
    const shirtNumber = Number(req.body.shirtNumber);
    const informationConfirmed = bool(req.body.informationConfirmed);
    const applicationAcknowledged = bool(req.body.applicationAcknowledged);
    const rawPositions = Array.isArray(req.body.positions) ? req.body.positions : String(req.body.positions || '').split(',');
    const positions = [...new Set(rawPositions.map((item) => cleanText(item, 60)).filter(Boolean))];

    if (!firstName || !lastName || !dateOfBirth || !teamName) {
      return res.status(400).json({ error: 'Player name, date of birth and current team or club are required.' });
    }
    if (age === null || age < Number(event.player_min_age) || age > Number(event.player_max_age)) {
      return res.status(400).json({ error: `Players must be aged ${event.player_min_age} to ${event.player_max_age} on the event date.` });
    }
    if (!AGE_GROUPS.has(currentAgeGroup)) return res.status(400).json({ error: 'Choose a valid current age group.' });
    if (!LEVELS.has(currentLevel)) return res.status(400).json({ error: 'Choose a valid current football level.' });
    if (!['left', 'right', 'both'].includes(preferredFoot)) return res.status(400).json({ error: 'Choose Left, Right or Both as the preferred foot.' });
    if (!Number.isInteger(shirtNumber) || shirtNumber < 1 || shirtNumber > 99) return res.status(400).json({ error: 'Shirt number must be between 1 and 99.' });
    if (positions.length < 1 || positions.length > 3 || positions.some((item) => !POSITIONS.has(item))) {
      return res.status(400).json({ error: 'Choose between one and three valid positions.' });
    }
    if (!informationConfirmed || !applicationAcknowledged) {
      return res.status(400).json({ error: 'Confirm both review declarations before submitting.' });
    }

    const guardianBranch = age >= 12 && age <= 14;
    const guardianName = guardianBranch ? cleanText(req.body.guardianName, 160) : null;
    const guardianRelationship = guardianBranch ? cleanText(req.body.guardianRelationship, 80) : null;
    const guardianEmail = guardianBranch ? cleanEmail(req.body.guardianEmail) : null;
    const guardianPhone = guardianBranch ? cleanPhone(req.body.guardianPhone) : null;
    const playerEmail = guardianBranch ? null : cleanEmail(req.body.playerEmail);
    const playerPhone = guardianBranch ? null : cleanPhone(req.body.playerPhone);

    if (guardianBranch && (!guardianName || !guardianRelationship || !guardianEmail || !guardianPhone)) {
      return res.status(400).json({ error: 'Parent or guardian name, relationship, email and phone are required for players aged 12 to 14.' });
    }
    if (!guardianBranch && (!playerEmail || !playerPhone)) {
      return res.status(400).json({ error: 'Player email and phone are required for players aged 15 to 16.' });
    }

    const registrationReference = reference('PL');
    const { data: registration, error: insertError } = await supabase
      .from('showcase_player_registrations')
      .insert({
        event_id: event.id,
        registration_reference: registrationReference,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        age_on_event_date: age,
        contact_type: guardianBranch ? 'guardian' : 'player',
        player_email: playerEmail,
        player_phone: playerPhone,
        guardian_name: guardianName,
        guardian_relationship: guardianRelationship,
        guardian_email: guardianEmail,
        guardian_phone: guardianPhone,
        currently_plays_for_team: true,
        team_type: null,
        team_name: teamName,
        coach_name: null,
        positions,
        can_play_goalkeeper: positions.includes('Goalkeeper'),
        preferred_foot: preferredFoot,
        current_age_group: currentAgeGroup,
        current_level: currentLevel,
        shirt_number: shirtNumber,
        travel_confirmed: true,
        guardian_aware: guardianBranch ? true : null,
        information_confirmed: true,
        application_acknowledged: true,
        status: 'new'
      })
      .select('*')
      .single();
    if (insertError) throw insertError;
    insertedId = registration.id;

    if (req.file) {
      uploadedPath = `${event.id}/${registration.id}/${safeFileName(req.file.originalname)}`;
      const { error: uploadError } = await supabase.storage.from(HIGHLIGHT_BUCKET).upload(uploadedPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { error: fileUpdateError } = await supabase.from('showcase_player_registrations').update({
        highlight_storage_path: uploadedPath,
        highlight_file_name: cleanText(req.file.originalname, 240),
        highlight_mime_type: req.file.mimetype,
        highlight_size_bytes: req.file.size
      }).eq('id', registration.id);
      if (fileUpdateError) throw fileUpdateError;
    }

    const contactEmail = guardianBranch ? guardianEmail : playerEmail;
    let confirmation = { success: false, skipped: true };
    try {
      confirmation = guardianBranch
        ? await email.sendTemplate({
          to: guardianEmail,
          templateKey: 'showcaseGuardianConfirmation',
          data: { playerFirstName: firstName, playerLastName: lastName }
        })
        : await email.sendTemplate({
          to: playerEmail,
          templateKey: 'showcasePlayerPersonalConfirmation',
          data: { playerFirstName: firstName }
        });
    } catch (error) {
      console.error('[Showcase V8 player confirmation]', error.message);
    }
    const alert = await sendInternalAlert({
      registrationType: 'Player',
      firstName,
      lastName,
      email: contactEmail,
      teamName,
      role: `${currentAgeGroup} · ${positions.join(' / ')}`,
      reference: registrationReference
    });
    await updateMailFlags('showcase_player_registrations', registration.id, confirmation, alert);
    await notifyAdmins('New Showcase player application', `${firstName} ${lastName} submitted a Showcase application.`, {
      event_id: event.id,
      registration_id: registration.id,
      registration_reference: registrationReference
    });

    res.status(201).json({
      data: {
        id: registration.id,
        reference: registrationReference,
        status: 'under_review',
        playerName: `${firstName} ${lastName}`,
        ageGroup: currentAgeGroup,
        positions,
        contactEmail
      }
    });
  } catch (error) {
    if (uploadedPath) {
      try { await supabase.storage.from(HIGHLIGHT_BUCKET).remove([uploadedPath]); } catch (_) {}
    }
    if (insertedId) {
      try { await supabase.from('showcase_player_registrations').delete().eq('id', insertedId); } catch (_) {}
    }
    console.error('[Showcase V8 player]', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not submit the player application.' });
  }
});

router.post('/registrations/professional', publicLimiter, async (req, res) => {
  try {
    const event = await eventConfig();
    const capacity = await professionalCapacity(event);
    if (capacity.soldOut) return res.status(409).json({ error: 'Professional places are currently full.', soldOut: true });

    const firstName = cleanText(req.body.firstName, 100);
    const lastName = cleanText(req.body.lastName, 100);
    const emailAddress = cleanEmail(req.body.email);
    const phone = cleanPhone(req.body.phone);
    const teamName = cleanText(req.body.teamName, 200);
    const jobTitle = cleanText(req.body.jobTitle, 160);
    const role = cleanText(req.body.role, 20).toLowerCase();
    const attendanceConfirmed = bool(req.body.attendanceConfirmed);
    const conductConfirmed = bool(req.body.conductConfirmed);

    if (!firstName || !lastName || !emailAddress || !phone || !teamName || !jobTitle) {
      return res.status(400).json({ error: 'Complete all professional contact and organisation fields.' });
    }
    if (!['coach', 'scout', 'both'].includes(role)) return res.status(400).json({ error: 'Choose Coach, Scout or Both.' });
    if (!attendanceConfirmed || !conductConfirmed) return res.status(400).json({ error: 'Confirm attendance and professional conduct before registering.' });

    const registrationReference = reference('PR');
    const { data: registration, error } = await supabase
      .from('showcase_professional_registrations')
      .insert({
        event_id: event.id,
        registration_reference: registrationReference,
        first_name: firstName,
        last_name: lastName,
        email: emailAddress,
        phone,
        team_name: teamName,
        job_title: jobTitle,
        role,
        attendance_confirmed: true,
        conduct_confirmed: true,
        status: 'registered',
        confirmed_at: new Date().toISOString()
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'This professional is already registered for the Showcase.' });
      throw error;
    }

    let confirmation = { success: false, skipped: true };
    try {
      confirmation = await email.sendTemplate({
        to: emailAddress,
        templateKey: 'showcaseProfessionalConfirmation',
        data: { firstName, role: roleDisplay(role), teamName }
      });
    } catch (mailError) {
      console.error('[Showcase V8 professional confirmation]', mailError.message);
    }
    const alert = await sendInternalAlert({
      registrationType: 'Coach / Scout',
      firstName,
      lastName,
      email: emailAddress,
      teamName,
      role: `${roleDisplay(role)} · ${jobTitle}`,
      reference: registrationReference
    });
    await updateMailFlags('showcase_professional_registrations', registration.id, confirmation, alert);
    await notifyAdmins('New Showcase professional registration', `${firstName} ${lastName} registered as ${roleDisplay(role)}.`, {
      event_id: event.id,
      registration_id: registration.id,
      registration_reference: registrationReference
    });

    res.status(201).json({
      data: {
        id: registration.id,
        reference: registrationReference,
        status: 'confirmed',
        attendeeName: `${firstName} ${lastName}`,
        role: roleDisplay(role),
        teamName,
        jobTitle
      }
    });
  } catch (error) {
    console.error('[Showcase V8 professional]', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not confirm the professional registration.' });
  }
});

router.post('/registrations/professional-waitlist', publicLimiter, async (req, res) => {
  try {
    const event = await eventConfig();
    const firstName = cleanText(req.body.firstName, 100);
    const lastName = cleanText(req.body.lastName, 100);
    const emailAddress = cleanEmail(req.body.email);
    const phone = cleanPhone(req.body.phone);
    if (!firstName || !lastName || !emailAddress || !phone) return res.status(400).json({ error: 'First name, last name, email and phone are required.' });

    const registrationReference = reference('WL');
    const { data: row, error } = await supabase.from('showcase_professional_waitlist').insert({
      event_id: event.id,
      registration_reference: registrationReference,
      first_name: firstName,
      last_name: lastName,
      email: emailAddress,
      phone,
      team_name: 'Not provided',
      job_title: null,
      role: 'unspecified',
      status: 'waiting'
    }).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'These contact details are already on the list.' });
      throw error;
    }

    const alert = await sendInternalAlert({
      registrationType: 'Professional contact list',
      firstName,
      lastName,
      email: emailAddress,
      teamName: 'Not provided',
      role: 'Contact list',
      reference: registrationReference
    });
    await updateMailFlags('showcase_professional_waitlist', row.id, { success: false, skipped: true }, alert);
    await notifyAdmins('Showcase professional contact-list request', `${firstName} ${lastName} joined the professional contact list.`, {
      event_id: event.id,
      waitlist_id: row.id,
      registration_reference: registrationReference
    });

    res.status(201).json({ data: { reference: registrationReference, status: 'waiting' } });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Could not save the contact-list request.' });
  }
});

module.exports = router;
