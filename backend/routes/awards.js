'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const config = require('../config');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');

const AWARD_YEAR = () => new Date().getFullYear();
const requireAwardsManager = requireStratexAdminPermission('awards', 'Award ceremony access is restricted to authorised Stratex admin users.');

async function sendEmail(to, subject, html) {
  if (!config.sendgrid || !config.sendgrid.apiKey) { console.warn('[Email] No SendGrid API key'); return; }
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendgrid.apiKey);
    const toArr = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!toArr.length) return;
    await sgMail.send({ to: toArr, from: { email: config.sendgrid.fromEmail || 'noreply@scoutlink.app', name: config.sendgrid.fromName || 'ScoutLink' }, subject, html });
  } catch(e) { console.error('[Email] SendGrid error:', e?.response?.body?.errors || e.message); }
}

async function notify(recipientId, recipientType, title, body, data) {
  try {
    await supabase.from('notifications').insert({ recipient_id: recipientId, recipient_type: recipientType, title, body, data: data||{}, is_read: false, created_at: new Date().toISOString() });
  } catch(e) { console.error('[Notify] Failed:', e.message); }
}

function playerNomEmail(playerFirstName, awardName, year) {
  return '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0d1117;color:#fff">' +
    '<h1 style="color:#1d9e75;margin-bottom:8px">Stratex Football Honours ' + year + '</h1>' +
    '<p style="color:#8b949e;margin-bottom:24px">Award nomination</p>' +
    '<p>Hi ' + playerFirstName + ',</p>' +
    '<p>Congratulations! You have been nominated for the following award at the <strong>Stratex Football Honours ' + year + '</strong>:</p>' +
    '<div style="background:#161b22;border-left:4px solid #1d9e75;border-radius:8px;padding:20px;margin:24px 0">' +
    '<h2 style="color:#fff;margin:0">' + awardName + '</h2>' +
    '<p style="color:#8b949e;margin:8px 0 0">Stratex Football Honours ' + year + '</p></div>' +
    '<p>Further details about the awards ceremony will be shared with you soon. Well done on this recognition!</p>' +
    '<p style="color:#8b949e;margin-top:32px;font-size:12px">Stratex Analytics - ScoutLink Platform</p></div>';
}

function coachNomEmail(playerFullName, awardName, year) {
  return '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#0d1117;color:#fff">' +
    '<h1 style="color:#1d9e75;margin-bottom:8px">Stratex Football Honours ' + year + '</h1>' +
    '<p style="color:#8b949e;margin-bottom:24px">Player award nomination</p>' +
    '<p>Congratulations! Your player <strong>' + playerFullName + '</strong> has been nominated for the following award:</p>' +
    '<div style="background:#161b22;border-left:4px solid #1d9e75;border-radius:8px;padding:20px;margin:24px 0">' +
    '<h2 style="color:#fff;margin:0">' + awardName + '</h2>' +
    '<p style="color:#8b949e;margin:8px 0 0">Stratex Football Honours ' + year + '</p></div>' +
    '<p>This is a great achievement for ' + playerFullName + ' and reflects the excellent coaching and development at your club. ' +
    'Further details about the awards ceremony will be sent in due course.</p>' +
    '<p style="color:#8b949e;margin-top:32px;font-size:12px">Stratex Analytics - ScoutLink Platform</p></div>';
}

function ceremonyPayload(body) {
  const validStatuses = [
    'planning',
    'published',
    'completed',
    'cancelled'
  ];

  const status = String(body.status || 'planning')
    .trim()
    .toLowerCase();

  return {
    name: String(
      body.name ||
      body.ceremonyName ||
      body.ceremony_name ||
      ''
    ).trim(),
    event_date:
      body.eventDate ||
      body.event_date ||
      null,
    location: String(body.location || '').trim() || null,
    status: validStatuses.includes(status)
      ? status
      : 'planning',
    categories: Array.isArray(body.categories)
      ? body.categories
          .map(item => String(item || '').trim())
          .filter(Boolean)
      : [],
    audience: Array.isArray(body.audience)
      ? body.audience
          .map(item => String(item || '').trim())
          .filter(Boolean)
      : [],
    description:
      String(body.description || '').trim() || null
  };
}

router.get(
  '/ceremonies',
  requireAuth,
  requireRole('Stratex'),
  requireAwardsManager,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('award_ceremonies')
        .select('*')
        .order('event_date', {
          ascending: true,
          nullsFirst: false
        })
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ data: data || [] });
    } catch (err) {
      console.error('[Award ceremonies list]', {
        code: err.code,
        message: err.message
      });

      res.status(500).json({
        error: 'Could not load award ceremonies.'
      });
    }
  }
);

router.post(
  '/ceremonies',
  requireAuth,
  requireRole('Stratex'),
  requireAwardsManager,
  async (req, res) => {
    try {
      const payload = ceremonyPayload(req.body);

      if (!payload.name) {
        return res.status(400).json({
          error: 'Ceremony name is required.'
        });
      }

      const { data, error } = await supabase
        .from('award_ceremonies')
        .insert({
          ...payload,
          created_by: req.user.id
        })
        .select('*')
        .single();

      if (error) throw error;

      await notify(
        req.user.id,
        'Stratex',
        'Award ceremony created',
        payload.name + ' has been added to Stratex Admin.',
        {
          ceremonyId: data.id,
          type: 'award_ceremony'
        }
      );

      res.status(201).json({
        message: 'Award ceremony created.',
        data
      });
    } catch (err) {
      console.error('[Award ceremony create]', {
        code: err.code,
        message: err.message
      });

      res.status(500).json({
        error: 'Could not create the award ceremony.'
      });
    }
  }
);

router.patch(
  '/ceremonies/:id',
  requireAuth,
  requireRole('Stratex'),
  requireAwardsManager,
  async (req, res) => {
    try {
      const payload = {
        ...ceremonyPayload(req.body),
        updated_at: new Date().toISOString()
      };

      if (!payload.name) {
        return res.status(400).json({
          error: 'Ceremony name is required.'
        });
      }

      const { data, error } = await supabase
        .from('award_ceremonies')
        .update(payload)
        .eq('id', req.params.id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: 'Award ceremony not found.'
        });
      }

      res.json({
        message: 'Award ceremony updated.',
        data
      });
    } catch (err) {
      console.error('[Award ceremony update]', {
        code: err.code,
        message: err.message
      });

      res.status(500).json({
        error: 'Could not update the award ceremony.'
      });
    }
  }
);

// GET /api/awards - list nominations with optional year filter
router.get('/', requireAuth, requireRole('Stratex'), requireAwardsManager, async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    let q = supabase.from('award_nominations')
      .select('*, players(id,first_name,last_name,team_name,age_group,overall_rating,position_group,appearances)')
      .order('nominated_at', { ascending: false });
    if (year) q = q.eq('year', year);
    const { data, error } = await q;
    if (error && year && /year/i.test(error.message || '')) {
      const fallback = await supabase.from('award_nominations')
        .select('*, players(id,first_name,last_name,team_name,age_group,overall_rating,position_group,appearances)')
        .order('nominated_at', { ascending: false });
      if (fallback.error) throw fallback.error;
      return res.json({ data: (fallback.data||[]).filter(n => !n.nominated_at || new Date(n.nominated_at).getFullYear() === year), year });
    }
    if (error) throw error;
    res.json({ data: data||[], year: year || AWARD_YEAR() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/awards/players - all active players for nomination table
router.get('/players', requireAuth, requireRole('Stratex'), requireAwardsManager, async (req, res) => {
  try {
    const { data, error } = await supabase.from('players')
      .select('id,first_name,last_name,age,age_group,team_name,team_id,overall_rating,position_group,specific_position,primary_position,positions,appearances,transfer_value')
      .eq('is_active', true).order('overall_rating', { ascending: false });
    if (error) throw error;
    res.json({ data: data||[] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/awards/nominate - full nomination flow with emails and notifications
router.post('/nominate', requireAuth, requireRole('Stratex'), requireAwardsManager, async (req, res) => {
  try {
    const { playerId, awardName } = req.body;
    if (!playerId || !awardName) return res.status(400).json({ error: 'playerId and awardName required' });

    const { data: player, error: playerErr } = await supabase.from('players')
      .select('id,first_name,last_name,team_id,team_name')
      .eq('id', playerId).single();
    if (playerErr || !player) return res.status(404).json({ error: 'Player not found' });

    const year = req.body.year ? parseInt(req.body.year) : AWARD_YEAR();
    const nominatedBy = (req.user && req.user.email) ? req.user.email : 'admin@scoutlink.app';
    const pName = player.first_name + ' ' + player.last_name;

    // 1. Insert award_nominations row
    const insertPayload = {
      player_id: playerId,
      award_name: awardName,
      nominated_by: nominatedBy,
      nominated_at: new Date().toISOString(),
      status: 'pending',
      year: year,
      notification_sent: false
    };
    let { data: nom, error: nomErr } = await supabase.from('award_nominations').insert(insertPayload).select().single();
    if (nomErr && /year/i.test(nomErr.message || '')) {
      delete insertPayload.year;
      const retry = await supabase.from('award_nominations').insert(insertPayload).select().single();
      nom = retry.data;
      nomErr = retry.error;
    }
    if (nomErr) throw nomErr;

    // Lookup coach
    let coach = null;
    if (player.team_id) {
      const { data: c } = await supabase.from('coaches')
        .select('id,first_name,last_name,email').eq('team_id', player.team_id).maybeSingle();
      coach = c;
    }

    // 2. Email to coach
    if (coach && coach.email) {
      await sendEmail(coach.email,
        'One of your players has been nominated for a ScoutLink award',
        coachNomEmail(pName, awardName, year)
      );
    }

    // 3. In-app notification for coach
    if (coach && coach.id) {
      await notify(coach.id, 'Coach',
        'Player award nomination',
        pName + ' has been nominated for ' + awardName + ' at the Stratex Football Honours ' + year + '.',
        { award_name: awardName, player_id: playerId, nomination_id: nom.id, type: 'award_nomination' }
      );
    }

    // 4. In-app notifications for all active scouts
    const { data: scouts } = await supabase.from('scouts').select('id').eq('is_active', true);
    if (scouts && scouts.length) {
      const scoutNotifs = scouts.map(s => ({
        recipient_id: s.id,
        recipient_type: 'Scout',
        title: 'Award nomination: ' + pName,
        body: pName + ' from ' + (player.team_name||'Unknown team') + ' has been nominated for ' + awardName + '.',
        data: { nomination_id: nom.id, player_id: playerId, type: 'award_nomination' },
        is_read: false,
        created_at: new Date().toISOString()
      }));
      await supabase.from('notifications').insert(scoutNotifs);
    }

    // 5. Update notification_sent to true
    await supabase.from('award_nominations').update({ notification_sent: true }).eq('id', nom.id);

    res.status(201).json({ message: 'Player nominated successfully. Coach and scout notifications sent.', nomination: nom });
  } catch(e) { console.error('[Awards Nominate]', e); res.status(500).json({ error: e.message }); }
});

// PATCH /api/awards/:id/withdraw - withdraw a nomination
router.patch('/:id/withdraw', requireAuth, requireRole('Stratex'), requireAwardsManager, async (req, res) => {
  try {
    const { error } = await supabase.from('award_nominations').update({ status: 'withdrawn' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Nomination withdrawn' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/awards/nomination-response (scout)
router.post('/nomination-response', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { nominationId, response } = req.body;
    if (!nominationId || !['accepted','declined'].includes(response)) return res.status(400).json({ error: 'nominationId and response required' });
    const { data, error } = await supabase.from('award_nomination_responses').upsert(
      { nomination_id: nominationId, scout_id: req.user.id, response, responded_at: new Date().toISOString() },
      { onConflict: 'nomination_id,scout_id' }
    ).select().single();
    if (error) throw error;
    res.json({ message: 'Response recorded', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
