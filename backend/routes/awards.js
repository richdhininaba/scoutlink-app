'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const config = require('../config');

async function sendDirectEmail(to, subject, html) {
  if (!config.sendgrid.apiKey) { console.warn('[Email] No API key'); return; }
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(config.sendgrid.apiKey);
    const toArr = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!toArr.length) return;
    await sgMail.send({ to: toArr, from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName }, subject, html });
  } catch(e) { console.error('[Email] Failed:', e?.response?.body || e.message); }
}

async function notify(recipientId, recipientType, title, body, data) {
  try {
    await supabase.from('notifications').insert({ recipient_id: recipientId, recipient_type: recipientType, title, body, data: data||{}, is_read: false });
  } catch(e) { console.error('[Notify]', e.message); }
}

router.get('/', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('award_nominations')
      .select('*, players(id,first_name,last_name,team_name,age_group,overall_rating,position_group,appearances)')
      .order('nominated_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data||[] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/players', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('players')
      .select('id,first_name,last_name,age,age_group,team_name,overall_rating,position_group,specific_position,appearances')
      .eq('is_active', true).order('overall_rating', { ascending: false });
    if (error) throw error;
    res.json({ data: data||[] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/nominate', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { playerId, awardName } = req.body;
    if (!playerId || !awardName) return res.status(400).json({ error: 'playerId and awardName required' });
    const { data: player } = await supabase.from('players').select('id,first_name,last_name,email,parent_email,team_id,team_name').eq('id', playerId).single();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const nominatedBy = req.user && req.user.email ? req.user.email : 'stratex@scoutlink.app';
    const { data: nom, error: nomErr } = await supabase.from('award_nominations').insert({ player_id: playerId, award_name: awardName, nominated_by: nominatedBy, status: 'pending', notification_sent: false }).select().single();
    if (nomErr) throw nomErr;
    let coach = null;
    if (player.team_id) { const { data: c } = await supabase.from('coaches').select('id,first_name,last_name,email').eq('team_id', player.team_id).maybeSingle(); coach = c; }
    const pName = player.first_name + ' ' + player.last_name;
    const makeHtml = (isCoach) => '<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:24px"><h1 style="color:#00E676">ScoutLink Award Nomination</h1>' + (isCoach ? '<p>Congratulations! Your player <strong>' + pName + '</strong> has been nominated for:</p>' : '<p>Congratulations! You have been nominated for:</p>') + '<div style="background:#111827;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #00E676"><h2 style="color:#fff;margin:0">' + awardName + '</h2><p style="color:#94a3b8;margin:8px 0 0">Stratex Football Honours</p></div><p>Please look out for further details about the awards ceremony.</p><p style="color:#94a3b8;margin-top:32px">Stratex Analytics — ScoutLink Platform</p></div>';
    const playerEmail = player.parent_email || player.email;
    if (playerEmail) await sendDirectEmail(playerEmail, 'You have been nominated for a ScoutLink Award', makeHtml(false));
    if (coach && coach.email) await sendDirectEmail(coach.email, 'One of your players has been nominated for a ScoutLink Award', makeHtml(true));
    await notify(player.id, 'Player', 'Award Nomination', 'You have been nominated for: ' + awardName + ' at the Stratex Football Honours!', { award_name: awardName, nomination_id: nom.id });
    if (coach && coach.id) await notify(coach.id, 'Coach', 'Player Award Nomination', pName + ' has been nominated for: ' + awardName, { award_name: awardName, player_id: playerId });
    const { data: scouts } = await supabase.from('scouts').select('id').eq('is_active', true);
    if (scouts && scouts.length) {
      const notifRows = scouts.map(s => ({ recipient_id: s.id, recipient_type: 'Scout', title: 'Award Nomination', body: pName + ' from ' + (player.team_name||'Unknown Team') + ' has been nominated for ' + awardName + '. View their profile.', data: { nomination_id: nom.id, player_id: playerId, type: 'award_nomination' }, is_read: false }));
      await supabase.from('notifications').insert(notifRows);
    }
    await supabase.from('award_nominations').update({ notification_sent: true }).eq('id', nom.id);
    res.status(201).json({ message: 'Player nominated successfully', nomination: nom });
  } catch(e) { console.error('[Awards Nominate]', e); res.status(500).json({ error: e.message }); }
});

router.post('/nomination-response', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { nominationId, response } = req.body;
    if (!nominationId || !['accepted','declined'].includes(response)) return res.status(400).json({ error: 'nominationId and response required' });
    const { data, error } = await supabase.from('award_nomination_responses').upsert({ nomination_id: nominationId, scout_id: req.user.id, response, responded_at: new Date().toISOString() }, { onConflict: 'nomination_id,scout_id' }).select().single();
    if (error) throw error;
    res.json({ message: 'Response recorded', data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;