'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const email = require('../services/email');

const PLAN_LIMITS = {
  Core: { seats:1, exports:30, predictions:120, interests:200 },
  Plus: { seats:3, exports:120, predictions:600, interests:1000 },
  Elite: { seats:10, exports:500, predictions:1200, interests:99999 },
  Enterprise: { seats:99999, exports:99999, predictions:99999, interests:99999 }
};

const DECLINE_REASONS = [
  'Unable to verify football team','Unable to verify professional club affiliation',
  'Insufficient information provided','Cannot verify age eligibility',
  'Duplicate registration','Account suspended','Other'
];

// Public: coach registers
router.post('/coach', async (req, res) => {
  try {
    const { firstName, lastName, emailAddr, phone, teamName, county, league, roleAtClub, dataPolicyAgreed } = req.body;
    if (!firstName||!lastName||!emailAddr||!teamName) return res.status(400).json({ error: 'firstName, lastName, email and teamName required' });
    if (!dataPolicyAgreed) return res.status(400).json({ error: 'Data policy agreement required' });
    const { data: exists } = await supabase.from('registration_requests').select('id,status').eq('email', emailAddr.toLowerCase().trim()).eq('account_type','Coach').single();
    if (exists) {
      if (exists.status === 'pending') return res.status(409).json({ error: 'A registration request is already pending for this email.' });
      if (exists.status === 'approved') return res.status(409).json({ error: 'This email is already registered.' });
    }
    const { data: req2, error } = await supabase.from('registration_requests').insert({
      account_type: 'Coach', first_name: firstName.trim(), last_name: lastName.trim(),
      email: emailAddr.toLowerCase().trim(), phone, team_name: teamName,
      team_county: county, team_league: league, role_at_club: roleAtClub || 'Coach',
      data_policy_agreed: true, data_policy_agreed_at: new Date(), status: 'pending'
    }).select().single();
    if (error) throw error;
    await email.sendCoachRegAlert({ firstName, lastName, email: emailAddr, teamName, county, league, roleAtClub, requestId: req2.id }).catch(e => console.error('[Email] alert failed:', e.message));
    res.status(201).json({ message: 'Registration submitted. You will be emailed once reviewed.', requestId: req2.id });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Public: scout registers
router.post('/scout', async (req, res) => {
  try {
    const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, dataPolicyAgreed } = req.body;
    if (!firstName||!lastName||!emailAddr||!scoutClub) return res.status(400).json({ error: 'firstName, lastName, email and scoutClub required' });
    if (!dataPolicyAgreed) return res.status(400).json({ error: 'Data policy agreement required' });
    const { data: req2, error } = await supabase.from('registration_requests').insert({
      account_type: 'Scout', first_name: firstName.trim(), last_name: lastName.trim(),
      email: emailAddr.toLowerCase().trim(), phone, scout_club: scoutClub, scout_league: scoutLeague,
      data_policy_agreed: true, data_policy_agreed_at: new Date(), status: 'pending'
    }).select().single();
    if (error) throw error;
    await email.sendScoutRegAlert({ firstName, lastName, email: emailAddr, scoutClub, scoutLeague, requestId: req2.id }).catch(e => console.error('[Email] alert failed:', e.message));
    res.status(201).json({ message: 'Registration submitted. You will be emailed once reviewed.', requestId: req2.id });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Stratex: list requests
router.get('/', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { status = 'pending', accountType, page = 1, limit = 50 } = req.query;
    let q = supabase.from('registration_requests').select('*', { count: 'exact' });
    if (status) q = q.eq('status', status);
    if (accountType) q = q.eq('account_type', accountType);
    const off = (Number(page)-1)*Number(limit);
    q = q.order('created_at', { ascending: false }).range(off, off+Number(limit)-1);
    const { data, error, count } = await q;
    if (error) { console.error('[Registrations] list error:', error); throw error; }
    res.json({ data: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch(err) { console.error('[Registrations] list failed:', err); res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// Stratex: approve
router.post('/:id/approve', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { subscriptionPlan } = req.body;
    const { data: rq, error: rqErr } = await supabase.from('registration_requests').select('*').eq('id', req.params.id).single();
    if (rqErr || !rq) return res.status(404).json({ error: 'Registration request not found' });
    if (rq.status !== 'pending') return res.status(400).json({ error: 'Registration is not pending' });

    const loginCode = generateLoginCode();
    const expires = new Date(Date.now() + 7*24*60*60*1000);
    let newUser;

    if (rq.account_type === 'Coach') {
      const { data, error } = await supabase.from('coaches').insert({
        coach_id: generateId('CHC'), first_name: rq.first_name, last_name: rq.last_name,
        email: rq.email, phone: rq.phone || null, team_name: rq.team_name,
        role_at_club: rq.role_at_club || 'Coach',
        team_county: rq.team_county || null, team_league: rq.team_league || null,
        data_policy_agreed: true, login_code: loginCode, login_code_expires: expires, is_active: true
      }).select().single();
      if (error) { console.error('[Approve] coach insert error:', error); throw error; }
      newUser = data;
    } else if (rq.account_type === 'Scout') {
      const plan = subscriptionPlan || 'Core';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Core;
      const planStart = new Date();
      const planEnd = new Date(Date.now() + 365*24*60*60*1000);
      const { data, error } = await supabase.from('scouts').insert({
        scout_id: generateId('SCT'), first_name: rq.first_name, last_name: rq.last_name,
        email: rq.email, phone: rq.phone || null,
        club_name: rq.scout_club || null, club_league: rq.scout_league || null,
        login_code: loginCode, login_code_expires: expires, is_active: true, preferences_set: false,
        subscription_plan: plan, plan_start: planStart, plan_end: planEnd,
        exports_remaining: limits.exports, predictions_remaining: limits.predictions,
        interests_remaining: limits.interests
      }).select().single();
      if (error) { console.error('[Approve] scout insert error:', error); throw error; }
      newUser = data;
    } else {
      return res.status(400).json({ error: 'Unsupported account type: ' + rq.account_type });
    }

    const reviewerEmail = req.user.email || 'stratex';
    await supabase.from('registration_requests').update({
      status: 'approved', login_code: loginCode,
      reviewed_by: reviewerEmail, reviewed_at: new Date()
    }).eq('id', req.params.id);

    // Send email - do not fail the approval if email fails
    await email.sendRegApproved({ to: rq.email, firstName: rq.first_name, loginCode, accountType: rq.account_type })
      .catch(e => console.error('[Approve] email failed (approval still saved):', e.message));

    res.json({ message: 'Approved and login code sent.', userId: newUser.id, loginCode });
  } catch(err) { console.error('[Approve] error:', err); res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// Stratex: decline
router.post('/:id/decline', requireAuth, requireRole('Stratex'), async (req, res) => {
  try {
    const { declineReason, customReason } = req.body;
    if (!declineReason) return res.status(400).json({ error: 'declineReason required', validReasons: DECLINE_REASONS });
    const { data: rq, error: rqErr } = await supabase.from('registration_requests').select('*').eq('id', req.params.id).single();
    if (rqErr || !rq) return res.status(404).json({ error: 'Registration request not found' });
    if (rq.status !== 'pending') return res.status(400).json({ error: 'Registration is not pending' });

    const finalReason = declineReason === 'Other' ? (customReason || 'Other') : declineReason;
    const reviewerEmail = req.user.email || 'stratex';
    await supabase.from('registration_requests').update({
      status: 'declined', decline_reason: finalReason,
      reviewed_by: reviewerEmail, reviewed_at: new Date()
    }).eq('id', req.params.id);

    await email.sendRegDeclined({ to: rq.email, firstName: rq.first_name, declineReason: finalReason, accountType: rq.account_type })
      .catch(e => console.error('[Decline] email failed (decline still saved):', e.message));

    res.json({ message: 'Declined and email sent.' });
  } catch(err) { console.error('[Decline] error:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/decline-reasons', (_, res) => res.json(DECLINE_REASONS));
module.exports = router;
