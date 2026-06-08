'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

// Set scout preferences (first login flow)
router.post('/preferences', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { preferredPositions, formationFocus, playingStyle, heightPreference, buildPreference,
            ageRangeMin, ageRangeMax, otherRequirements, footPreference } = req.body;
    const prefs = { preferredPositions: preferredPositions||[], formationFocus: formationFocus||'',
      playingStyle: playingStyle||'', heightPreference: heightPreference||'',
      buildPreference: buildPreference||'', ageRangeMin: ageRangeMin||14,
      ageRangeMax: ageRangeMax||21, otherRequirements: otherRequirements||'',
      footPreference: footPreference||'any', updatedAt: new Date().toISOString() };
    await supabase.from('scouts').update({ scout_preferences: prefs, preferences_set: true }).eq('id', req.user.id);
    res.json({ message: 'Preferences saved', preferences: prefs });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/preferences', requireAuth, requireRole('Scout'), async (req, res) => {
  try {
    const { data } = await supabase.from('scouts').select('scout_preferences,preferences_set').eq('id', req.user.id).single();
    res.json({ preferences: data?.scout_preferences||null, preferencesSet: data?.preferences_set||false });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/pipeline', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
  try {
    const scoutId = req.user.accountType === 'Scout' ? req.user.id : req.query.scoutId;
    let q = supabase.from('recruitment_pipeline')
      .select('id,stage,notes,interest_level,created_at,players(id,first_name,last_name,specific_position,primary_position,overall_rating,transfer_value,team_name,age,position_group),scouts(id,first_name,last_name,club_name)', { count:'exact' });
    if (scoutId) q = q.eq('scout_id', scoutId);
    if (req.query.stage) q = q.eq('stage', req.query.stage);
    const { limit = 50 } = req.query;
    q = q.order('updated_at',{ascending:false}).limit(Number(limit));
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});


// Super user scout: add another scout to their team
router.post('/add-scout', requireAuth, requireRole('Scout'), async (req, res) => {
try {
const { data: me } = await supabase.from('scouts').select('id,scout_team_id,club_name,is_super_user').eq('id', req.user.id).single();
if (!me || !me.is_super_user) return res.status(403).json({ error: 'Only super user scouts can add scouts' });
const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, subscriptionPlan } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName, email required' });

// Duplicate checks
const tables = ['scouts','coaches','players'];
for (const t of tables) {
const { data: eRow } = await supabase.from(t).select('id').eq('email', emailAddr.toLowerCase().trim()).maybeSingle();
if (eRow) return res.status(409).json({ error: 'This email is already registered on ScoutLink.' });
}
if (phone) {
const { data: pRow } = await supabase.from('scouts').select('id').eq('phone', phone.trim()).maybeSingle();
if (pRow) return res.status(409).json({ error: 'This phone number is already registered.' });
}

// Generate unique code
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let loginCode = '', attempts = 0;
while (attempts < 20) {
let c = '';
for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random()*chars.length)];
const [s,co,p] = await Promise.all([
supabase.from('scouts').select('id').eq('login_code',c).maybeSingle(),
supabase.from('coaches').select('id').eq('login_code',c).maybeSingle(),
supabase.from('players').select('id').eq('login_code',c).maybeSingle()
]);
if (!s.data && !co.data && !p.data) { loginCode = c; break; }
attempts++;
}
if (!loginCode) return res.status(500).json({ error: 'Could not generate unique login code' });

const { generateId } = require('../utils/auth');
const config = require('../config');
const email = require('../services/email');
const PLAN_LIMITS = { Core:{exports:30,predictions:120,interests:200}, Plus:{exports:120,predictions:600,interests:1000}, Elite:{exports:500,predictions:1200,interests:99999}, Enterprise:{exports:99999,predictions:99999,interests:99999} };
const plan = subscriptionPlan||'Core';
const limits = PLAN_LIMITS[plan]||PLAN_LIMITS.Core;
const expires = new Date(Date.now()+7*24*60*60*1000);

const { data: newScout, error } = await supabase.from('scouts').insert({
scout_id: generateId('SCT'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), phone: phone||null,
club_name: scoutClub||me.club_name||null, club_league: scoutLeague||null,
scout_team_id: me.scout_team_id||null,
login_code: loginCode, login_code_expires: expires, is_active: true,
preferences_set: false, is_super_user: false, registration_complete: false,
subscription_plan: plan, plan_start: new Date(),
plan_end: new Date(Date.now()+365*24*60*60*1000),
exports_remaining: limits.exports, predictions_remaining: limits.predictions,
interests_remaining: limits.interests
}).select().single();
if (error) throw error;

const baseUrl = config.brandUrl||'https://scoutlink.app';
const completeLink = baseUrl + '/frontend/pages/complete-registration.html?code=' + loginCode + '&email=' + encodeURIComponent(emailAddr.toLowerCase()) + '&type=Scout';
await email.sendCompleteSignup({ to: emailAddr, firstName, loginCode, accountType: 'Scout', completeLink }).catch(e => console.error('[Email]', e.message));

res.status(201).json({ message: 'Scout added. Complete-registration email sent.', scoutId: newScout.id, loginCode, completeLink });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;
