'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const ACTIVE_SHOWCASE_KEY = process.env.SHOWCASE_REGISTRATION_EVENT_KEY || 'bluewater-2026-09-12';
const PUBLIC_SHOWCASE_STATUSES = ['published', 'confirmed'];
const PUBLIC_AWARD_STATUSES = ['published', 'confirmed', 'live'];
const SETTINGS_KEY = 'public_site';

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

function text(value, max = 5000) {
  return String(value == null ? '' : value).replace(/[<>]/g, '').trim().slice(0, max);
}

function boolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function integer(value, fallback = 0, min = 0, max = 100000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function slug(value) {
  return text(value, 140)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function isoDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function dateOnly(value) {
  const parsed = isoDate(value);
  return parsed ? parsed.slice(0, 10) : null;
}

function timeOnly(value, fallback) {
  const clean = text(value, 16);
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(clean)) return clean.length === 5 ? `${clean}:00` : clean;
  return fallback;
}

function publicEvent(row, config, counts) {
  const capacity = Number(config?.professional_capacity || row.professional_capacity || row.max_scouts || 30);
  const professionals = Number(counts?.professionals || 0);
  return {
    id: row.id,
    slug: row.slug || slug(row.event_name),
    eventName: row.event_name,
    eventDate: row.event_date,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    summary: row.summary || row.description,
    description: row.description,
    heroImageUrl: row.hero_image_url,
    status: row.status,
    featured: !!row.featured,
    publicVisible: !!row.public_visible,
    registrationDeadline: row.registration_deadline,
    playerArrivalTime: config?.player_arrival_time || row.player_arrival_time,
    professionalArrivalTime: config?.professional_arrival_time || row.professional_arrival_time,
    playerMinAge: Number(config?.player_min_age || row.player_min_age || 12),
    playerMaxAge: Number(config?.player_max_age || row.player_max_age || 16),
    professionalCapacity: capacity,
    playerRegistrationOpen: config?.player_registration_open !== false && row.player_registration_open !== false,
    professionalRegistrationOpen: config?.professional_registration_open !== false && row.professional_registration_open !== false,
    playerRegistrations: Number(counts?.players || 0),
    professionalRegistrations: professionals,
    waitlist: Number(counts?.waitlist || 0),
    remainingProfessionalPlaces: Math.max(0, capacity - professionals),
    registrationRoutes: row.featured ? {
      player: '/showcase-event/player-registration',
      professional: '/showcase-event/coach-scout-registration'
    } : null
  };
}

async function eventConfigs(eventIds) {
  if (!eventIds.length) return {};
  const { data, error } = await supabase
    .from('showcase_registration_events')
    .select('*')
    .in('source_showcase_event_id', eventIds);
  if (error) throw error;
  return (data || []).reduce((output, row) => {
    output[row.source_showcase_event_id] = row;
    return output;
  }, {});
}

async function eventCounts(configRows) {
  const ids = Object.values(configRows).map(row => row.id).filter(Boolean);
  const output = {};
  Object.keys(configRows).forEach(eventId => {
    output[eventId] = { players: 0, professionals: 0, waitlist: 0 };
  });
  if (!ids.length) return output;

  const [players, professionals, waitlist] = await Promise.all([
    supabase.from('showcase_player_registrations').select('event_id').in('event_id', ids),
    supabase.from('showcase_professional_registrations').select('event_id,status').in('event_id', ids),
    supabase.from('showcase_professional_waitlist').select('event_id').in('event_id', ids)
  ]);
  if (players.error) throw players.error;
  if (professionals.error) throw professionals.error;
  if (waitlist.error) throw waitlist.error;

  const sourceByConfig = Object.values(configRows).reduce((map, row) => {
    map[row.id] = row.source_showcase_event_id;
    return map;
  }, {});
  (players.data || []).forEach(row => {
    const source = sourceByConfig[row.event_id];
    if (source && output[source]) output[source].players += 1;
  });
  (professionals.data || []).forEach(row => {
    if (['cancelled', 'declined'].includes(String(row.status || '').toLowerCase())) return;
    const source = sourceByConfig[row.event_id];
    if (source && output[source]) output[source].professionals += 1;
  });
  (waitlist.data || []).forEach(row => {
    const source = sourceByConfig[row.event_id];
    if (source && output[source]) output[source].waitlist += 1;
  });
  return output;
}

async function eventBundle(rows) {
  const configs = await eventConfigs(rows.map(row => row.id));
  const counts = await eventCounts(configs);
  return rows.map(row => publicEvent(row, configs[row.id], counts[row.id]));
}

function eventPayload(body, existing = {}) {
  const eventName = text(body.eventName ?? body.event_name ?? existing.event_name, 220);
  const eventDate = dateOnly(body.eventDate ?? body.event_date ?? existing.event_date);
  return {
    event_name: eventName,
    slug: slug(body.slug || existing.slug || eventName),
    event_date: eventDate,
    venue_name: text(body.venueName ?? body.venue_name ?? existing.venue_name, 260) || null,
    venue_address: text(body.venueAddress ?? body.venue_address ?? existing.venue_address, 800) || null,
    summary: text(body.summary ?? existing.summary, 1200) || null,
    description: text(body.description ?? existing.description, 12000) || null,
    hero_image_url: text(body.heroImageUrl ?? body.hero_image_url ?? existing.hero_image_url, 1800) || null,
    status: text(body.status ?? existing.status, 40).toLowerCase() || 'draft',
    public_visible: boolean(body.publicVisible ?? body.public_visible, existing.public_visible || false),
    featured: boolean(body.featured, existing.featured || false),
    registration_deadline: isoDate(body.registrationDeadline ?? body.registration_deadline ?? existing.registration_deadline),
    player_arrival_time: timeOnly(body.playerArrivalTime ?? body.player_arrival_time ?? existing.player_arrival_time, '12:00:00'),
    professional_arrival_time: timeOnly(body.professionalArrivalTime ?? body.professional_arrival_time ?? existing.professional_arrival_time, '12:30:00'),
    player_min_age: integer(body.playerMinAge ?? body.player_min_age, existing.player_min_age || 12, 5, 21),
    player_max_age: integer(body.playerMaxAge ?? body.player_max_age, existing.player_max_age || 16, 5, 21),
    professional_capacity: integer(body.professionalCapacity ?? body.professional_capacity ?? body.maxScouts, existing.professional_capacity || existing.max_scouts || 30, 1, 5000),
    max_scouts: integer(body.professionalCapacity ?? body.professional_capacity ?? body.maxScouts, existing.professional_capacity || existing.max_scouts || 30, 1, 5000),
    player_registration_open: boolean(body.playerRegistrationOpen ?? body.player_registration_open, existing.player_registration_open !== false),
    professional_registration_open: boolean(body.professionalRegistrationOpen ?? body.professional_registration_open, existing.professional_registration_open !== false),
    updated_at: new Date().toISOString()
  };
}

async function registrationConfigForEvent(eventRow) {
  const { data, error } = await supabase
    .from('showcase_registration_events')
    .select('*')
    .eq('source_showcase_event_id', eventRow.id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function ensureRegistrationConfig(eventRow, forceActiveKey = false) {
  let config = await registrationConfigForEvent(eventRow);
  const preferredKey = forceActiveKey
    ? ACTIVE_SHOWCASE_KEY
    : (config?.event_key || `event-${String(eventRow.id).slice(0, 8)}-${slug(eventRow.event_name).slice(0, 48)}`);

  const values = {
    source_showcase_event_id: eventRow.id,
    event_key: preferredKey,
    event_name: eventRow.event_name,
    event_date: dateOnly(eventRow.event_date),
    player_arrival_time: eventRow.player_arrival_time || '12:00:00',
    professional_arrival_time: eventRow.professional_arrival_time || '12:30:00',
    venue_name: eventRow.venue_name || 'Venue to be confirmed',
    venue_address: eventRow.venue_address || 'Address to be confirmed',
    player_min_age: Number(eventRow.player_min_age || 12),
    player_max_age: Number(eventRow.player_max_age || 16),
    professional_capacity: Number(eventRow.professional_capacity || eventRow.max_scouts || 30),
    player_registration_open: eventRow.player_registration_open !== false,
    professional_registration_open: eventRow.professional_registration_open !== false,
    updated_at: new Date().toISOString()
  };

  if (config) {
    const { data, error } = await supabase
      .from('showcase_registration_events')
      .update(values)
      .eq('id', config.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('showcase_registration_events')
    .insert(values)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function promoteRegistrationEvent(eventRow) {
  const current = await supabase
    .from('showcase_registration_events')
    .select('*')
    .eq('event_key', ACTIVE_SHOWCASE_KEY)
    .maybeSingle();
  if (current.error) throw current.error;

  const target = await registrationConfigForEvent(eventRow);
  if (current.data && (!target || current.data.id !== target.id)) {
    const archiveKey = current.data.source_showcase_event_id
      ? `event-${String(current.data.source_showcase_event_id).slice(0, 8)}-archived`
      : `archived-${String(current.data.id).slice(0, 8)}`;
    const archived = await supabase
      .from('showcase_registration_events')
      .update({ event_key: archiveKey, updated_at: new Date().toISOString() })
      .eq('id', current.data.id);
    if (archived.error) throw archived.error;
  }

  const promoted = await ensureRegistrationConfig(eventRow, true);
  const unset = await supabase
    .from('showcase_events')
    .update({ featured: false, updated_at: new Date().toISOString() })
    .neq('id', eventRow.id)
    .eq('featured', true);
  if (unset.error) throw unset.error;

  const update = await supabase
    .from('showcase_events')
    .update({
      featured: true,
      public_visible: true,
      status: PUBLIC_SHOWCASE_STATUSES.includes(eventRow.status) ? eventRow.status : 'published',
      updated_at: new Date().toISOString()
    })
    .eq('id', eventRow.id)
    .select('*')
    .single();
  if (update.error) throw update.error;

  await saveSetting('active_showcase_event_id', eventRow.id);
  return { event: update.data, config: promoted };
}

async function getSettingsRow() {
  const { data, error } = await supabase
    .from('stratex_public_settings')
    .select('*')
    .eq('setting_key', SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;
  return data || { setting_key: SETTINGS_KEY, fields: {}, toggles: {}, values: {} };
}

async function saveSetting(key, value) {
  const current = await getSettingsRow();
  const values = { ...(current.values || {}), [key]: value };
  const { error } = await supabase
    .from('stratex_public_settings')
    .upsert({
      setting_key: SETTINGS_KEY,
      fields: current.fields || {},
      toggles: current.toggles || {},
      values,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
  if (error) throw error;
}

async function publicPublishingEnabled(toggleName) {
  const row = await getSettingsRow();
  const toggles = row.toggles || {};
  if (toggles.publicWebsiteEnabled === false) return false;
  return toggles[toggleName] !== false;
}

/* Public publishing endpoints */
router.get('/showcase-events', async (req, res) => {
  try {
    if (!(await publicPublishingEnabled('showShowcaseEvents'))) {
      return res.json({ data: [] });
    }
    const { data, error } = await supabase
      .from('showcase_events')
      .select('*')
      .eq('public_visible', true)
      .in('status', PUBLIC_SHOWCASE_STATUSES)
      .order('featured', { ascending: false })
      .order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ data: await eventBundle(data || []) });
  } catch (error) {
    console.error('[Public showcase events]', error);
    res.status(500).json({ error: 'Public showcase events could not be loaded.' });
  }
});

router.get('/showcase-events/:slug', async (req, res) => {
  try {
    if (!(await publicPublishingEnabled('showShowcaseEvents'))) {
      return res.status(404).json({ error: 'Showcase event not found.' });
    }
    const { data, error } = await supabase
      .from('showcase_events')
      .select('*')
      .eq('slug', slug(req.params.slug))
      .eq('public_visible', true)
      .in('status', PUBLIC_SHOWCASE_STATUSES)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Showcase event not found.' });
    res.json({ data: (await eventBundle([data]))[0] });
  } catch (error) {
    res.status(500).json({ error: 'The public showcase event could not be loaded.' });
  }
});

router.get('/award-ceremonies', async (req, res) => {
  try {
    if (!(await publicPublishingEnabled('showAwardCeremonies'))) {
      return res.json({ data: [] });
    }
    const { data, error } = await supabase
      .from('award_ceremonies')
      .select('*')
      .eq('public_visible', true)
      .in('status', PUBLIC_AWARD_STATUSES)
      .order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Public award ceremonies]', error);
    res.status(500).json({ error: 'Public award ceremonies could not be loaded.' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const row = await getSettingsRow();
    res.json({ data: { fields: row.fields || {}, toggles: row.toggles || {}, values: row.values || {} } });
  } catch (error) {
    res.status(500).json({ error: 'Public settings could not be loaded.' });
  }
});

/* Protected Stratex Admin endpoints */
router.use('/admin', requireAuth, requireRole('Stratex'));

router.get('/admin/showcase-events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('showcase_events')
      .select('*')
      .order('event_date', { ascending: true });
    if (error) throw error;
    const rows = await eventBundle(data || []);
    const summary = rows.reduce((out, row) => {
      out.playerRegistrations += row.playerRegistrations;
      out.professionalRegistrations += row.professionalRegistrations;
      out.waitlist += row.waitlist;
      return out;
    }, { playerRegistrations: 0, professionalRegistrations: 0, waitlist: 0 });
    res.json({ data: rows.map(row => ({
      id: row.id,
      slug: row.slug,
      event_name: row.eventName,
      event_date: row.eventDate,
      venue_name: row.venueName,
      venue_address: row.venueAddress,
      summary: row.summary,
      description: row.description,
      hero_image_url: row.heroImageUrl,
      status: row.status,
      public_visible: row.publicVisible,
      featured: row.featured,
      registration_deadline: row.registrationDeadline,
      player_arrival_time: row.playerArrivalTime,
      professional_arrival_time: row.professionalArrivalTime,
      player_min_age: row.playerMinAge,
      player_max_age: row.playerMaxAge,
      professional_capacity: row.professionalCapacity,
      max_scouts: row.professionalCapacity,
      player_registration_open: row.playerRegistrationOpen,
      professional_registration_open: row.professionalRegistrationOpen,
      player_count: row.playerRegistrations,
      professional_count: row.professionalRegistrations,
      waitlist_count: row.waitlist
    })), summary });
  } catch (error) {
    console.error('[Admin showcase list]', error);
    res.status(500).json({ error: 'Showcase events could not be loaded.' });
  }
});

router.post('/admin/showcase-events', async (req, res) => {
  try {
    const payload = eventPayload(req.body);
    if (!payload.event_name || !payload.event_date) {
      return res.status(400).json({ error: 'Event name and date are required.' });
    }
    const { data, error } = await supabase
      .from('showcase_events')
      .insert({ ...payload, created_by: req.user.id, created_at: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw error;
    await ensureRegistrationConfig(data, false);
    let output = data;
    if (payload.featured) output = (await promoteRegistrationEvent(data)).event;
    res.status(201).json({ data: output, message: payload.public_visible ? 'Event created and linked to the public Showcase page.' : 'Event created privately.' });
  } catch (error) {
    console.error('[Admin showcase create]', error);
    if (String(error.code) === '23505') return res.status(409).json({ error: 'Use a unique public slug.' });
    res.status(500).json({ error: 'The showcase event could not be created.' });
  }
});

router.get('/admin/showcase-events/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('showcase_events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Showcase event not found.' });
    const row = (await eventBundle([data]))[0];
    res.json({
      event: {
        ...data,
        player_arrival_time: row.playerArrivalTime,
        professional_arrival_time: row.professionalArrivalTime,
        player_min_age: row.playerMinAge,
        player_max_age: row.playerMaxAge,
        professional_capacity: row.professionalCapacity,
        player_registration_open: row.playerRegistrationOpen,
        professional_registration_open: row.professionalRegistrationOpen
      },
      counts: {
        players: row.playerRegistrations,
        professionals: row.professionalRegistrations,
        waitlist: row.waitlist,
        remaining: row.remainingProfessionalPlaces
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'The showcase event could not be loaded.' });
  }
});

router.patch('/admin/showcase-events/:id', async (req, res) => {
  try {
    const found = await supabase.from('showcase_events').select('*').eq('id', req.params.id).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return res.status(404).json({ error: 'Showcase event not found.' });
    const payload = eventPayload(req.body, found.data);
    const { data, error } = await supabase
      .from('showcase_events')
      .update(payload)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    const settings = await getSettingsRow();
    const activeId = settings.values && settings.values.active_showcase_event_id;
    const controlsRegistrationPages = data.featured === true || String(activeId || '') === String(data.id);
    await ensureRegistrationConfig(data, controlsRegistrationPages);
    let output = data;
    if (payload.featured || controlsRegistrationPages) {
      output = (await promoteRegistrationEvent(data)).event;
    }
    res.json({ data: output, publicUpdatedAt: new Date().toISOString(), message: payload.public_visible ? 'Event saved and the public Showcase and registration pages were updated.' : 'Event saved privately.' });
  } catch (error) {
    console.error('[Admin showcase update]', error);
    if (String(error.code) === '23505') return res.status(409).json({ error: 'Use a unique public slug.' });
    res.status(500).json({ error: 'The showcase event could not be saved.' });
  }
});

router.post('/admin/showcase-events/:id/publish', async (req, res) => {
  try {
    const found = await supabase.from('showcase_events').select('*').eq('id', req.params.id).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return res.status(404).json({ error: 'Showcase event not found.' });
    const output = await promoteRegistrationEvent(found.data);
    res.json({ data: output.event, message: 'Event published and now controls the public Showcase registration pages.' });
  } catch (error) {
    console.error('[Showcase publish]', error);
    res.status(500).json({ error: 'The event could not be published.' });
  }
});

async function configForSourceId(sourceId) {
  const { data, error } = await supabase
    .from('showcase_registration_events')
    .select('*')
    .eq('source_showcase_event_id', sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const found = await supabase.from('showcase_events').select('*').eq('id', sourceId).single();
    if (found.error) throw found.error;
    return ensureRegistrationConfig(found.data, false);
  }
  return data;
}

router.get('/admin/showcase-events/:id/players', async (req, res) => {
  try {
    const config = await configForSourceId(req.params.id);
    const { data, error } = await supabase
      .from('showcase_player_registrations')
      .select('*')
      .eq('event_id', config.id)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Player applications could not be loaded.' });
  }
});

router.patch('/admin/showcase-events/:eventId/players/:playerId', async (req, res) => {
  try {
    const config = await configForSourceId(req.params.eventId);
    const selected = boolean(req.body.selected, false);
    const { data, error } = await supabase
      .from('showcase_player_registrations')
      .update({
        status: text(req.body.status, 40) || (selected ? 'selected' : 'reviewing'),
        selected_for_showcase: selected,
        selected_at: selected ? new Date().toISOString() : null,
        contacted_at: ['contacted', 'selected'].includes(text(req.body.status, 40)) ? new Date().toISOString() : null,
        internal_notes: text(req.body.internalNotes, 8000) || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.playerId)
      .eq('event_id', config.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'The player review could not be saved.' });
  }
});

router.get('/admin/showcase-events/:id/professionals', async (req, res) => {
  try {
    const config = await configForSourceId(req.params.id);
    const [registered, waitlist] = await Promise.all([
      supabase.from('showcase_professional_registrations').select('*').eq('event_id', config.id).order('submitted_at', { ascending: false }),
      supabase.from('showcase_professional_waitlist').select('*').eq('event_id', config.id).order('submitted_at', { ascending: false })
    ]);
    if (registered.error) throw registered.error;
    if (waitlist.error) throw waitlist.error;
    res.json({ registered: registered.data || [], waitlist: waitlist.data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Professional applications could not be loaded.' });
  }
});

router.patch('/admin/showcase-events/:eventId/professionals/:professionalId', async (req, res) => {
  try {
    const config = await configForSourceId(req.params.eventId);
    const table = boolean(req.body.waitlisted, false)
      ? 'showcase_professional_waitlist'
      : 'showcase_professional_registrations';
    const status = text(req.body.status, 40) || 'registered';
    const updates = {
      status,
      internal_notes: text(req.body.internalNotes, 8000) || null,
      contacted_at: ['contacted', 'confirmed'].includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };
    if (table === 'showcase_professional_registrations') {
      updates.attendance_confirmed = status !== 'declined';
      updates.confirmed_at = status === 'confirmed' ? new Date().toISOString() : null;
    }
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', req.params.professionalId)
      .eq('event_id', config.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'The professional review could not be saved.' });
  }
});

function awardPayload(body, existing = {}) {
  const name = text(body.name ?? existing.name, 240);
  const categories = Array.isArray(body.categories) ? body.categories.map(value => text(value, 160)).filter(Boolean) : (existing.categories || []);
  const audience = Array.isArray(body.audience) ? body.audience.map(value => text(value, 160)).filter(Boolean) : (existing.audience || []);
  return {
    name,
    slug: slug(body.slug || existing.slug || name),
    event_date: isoDate(body.eventDate ?? body.event_date ?? existing.event_date),
    location: text(body.location ?? existing.location, 800) || null,
    status: text(body.status ?? existing.status, 40).toLowerCase() || 'planning',
    categories,
    audience,
    description: text(body.description ?? existing.description, 12000) || null,
    hero_image_url: text(body.heroImageUrl ?? body.hero_image_url ?? existing.hero_image_url, 1800) || null,
    public_visible: boolean(body.publicVisible ?? body.public_visible, existing.public_visible || false),
    updated_at: new Date().toISOString()
  };
}

router.get('/admin/award-ceremonies', async (req, res) => {
  try {
    const { data, error } = await supabase.from('award_ceremonies').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Award ceremonies could not be loaded.' });
  }
});

router.post('/admin/award-ceremonies', async (req, res) => {
  try {
    const payload = awardPayload(req.body);
    if (!payload.name) return res.status(400).json({ error: 'Ceremony name is required.' });
    const { data, error } = await supabase
      .from('award_ceremonies')
      .insert({ ...payload, created_by: req.user.id, created_at: new Date().toISOString() })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    if (String(error.code) === '23505') return res.status(409).json({ error: 'Use a unique public slug.' });
    res.status(500).json({ error: 'The award ceremony could not be created.' });
  }
});

router.patch('/admin/award-ceremonies/:id', async (req, res) => {
  try {
    const found = await supabase.from('award_ceremonies').select('*').eq('id', req.params.id).maybeSingle();
    if (found.error) throw found.error;
    if (!found.data) return res.status(404).json({ error: 'Award ceremony not found.' });
    const { data, error } = await supabase
      .from('award_ceremonies')
      .update(awardPayload(req.body, found.data))
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    if (String(error.code) === '23505') return res.status(409).json({ error: 'Use a unique public slug.' });
    res.status(500).json({ error: 'The award ceremony could not be saved.' });
  }
});

router.get('/admin/settings', async (req, res) => {
  try {
    const row = await getSettingsRow();
    res.json({ data: { fields: row.fields || {}, toggles: row.toggles || {}, values: row.values || {} } });
  } catch (error) {
    res.status(500).json({ error: 'Company settings could not be loaded.' });
  }
});

router.patch('/admin/settings', async (req, res) => {
  try {
    const current = await getSettingsRow();
    const { data, error } = await supabase
      .from('stratex_public_settings')
      .upsert({
        setting_key: SETTINGS_KEY,
        fields: req.body.fields && typeof req.body.fields === 'object' ? req.body.fields : (current.fields || {}),
        toggles: req.body.toggles && typeof req.body.toggles === 'object' ? req.body.toggles : (current.toggles || {}),
        values: current.values || {},
        updated_by: req.user.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'setting_key' })
      .select('*')
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: 'Company settings could not be saved.' });
  }
});

module.exports = router;
