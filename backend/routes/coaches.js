'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const email = require('../services/email');
const config = require('../config');

// My players - coaches only see players assigned to them (assigned_coach_id)
// Super user coaches see ALL players on their team
router.get('/my-players', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data: coach } = await supabase.from('coaches').select('id,team_name,team_id,is_super_user').eq('id', req.user.id).single();
if (!coach) return res.status(404).json({ error: 'Coach not found' });

let q = supabase.from('players')
.select('id,first_name,last_name,age,position_group,specific_position,primary_position,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,foot,team_name,assigned_coach_id,avatar_config')
.eq('is_active', true)
.order('last_name');

if (coach.is_super_user) {
// Super user sees all players on the team
if (coach.team_id) q = q.eq('team_id', coach.team_id);
else if (coach.team_name) q = q.eq('team_name', coach.team_name);
else return res.json({ data: [], teamName: null, isSuperUser: true });
} else {
// Regular coach only sees their directly assigned players
q = q.eq('assigned_coach_id', req.user.id);
}

const { data, error } = await q;
if (error) throw error;
res.json({ data: data||[], teamName: coach.team_name, isSuperUser: coach.is_super_user||false });
} catch(err) { console.error('[Coaches] my-players:', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/profile', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data, error } = await supabase.from('coaches').select('*').eq('id', req.user.id).single();
if (error||!data) return res.status(404).json({ error: 'Not found' });
res.json({ coach: data });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Super user coach: list all coaches on same team
router.get('/team-coaches', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data: me } = await supabase.from('coaches').select('id,team_id,team_name,is_super_user').eq('id', req.user.id).single();
if (!me) return res.status(404).json({ error: 'Not found' });
if (!me.is_super_user) return res.status(403).json({ error: 'Only super user coaches can view team coaches' });
let q = supabase.from('coaches').select('id,first_name,last_name,email,role_at_club,is_super_user,registration_complete').eq('is_active', true).neq('id', req.user.id);
if (me.team_id) q = q.eq('team_id', me.team_id);
else if (me.team_name) q = q.eq('team_name', me.team_name);
const { data, error } = await q;
if (error) throw error;
res.json({ data: data||[] });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Super user coach: add another coach to their team
router.post('/add-coach', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data: me } = await supabase.from('coaches').select('id,team_id,team_name,is_super_user').eq('id', req.user.id).single();
if (!me || !me.is_super_user) return res.status(403).json({ error: 'Only super user coaches can add coaches' });
const { firstName, lastName, emailAddr, phone, roleAtClub } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName, email required' });

// Check duplicates
const tables = ['scouts','coaches','players'];
for (const t of tables) {
const { data: eRow } = await supabase.from(t).select('id').eq('email', emailAddr.toLowerCase().trim()).maybeSingle();
if (eRow) return res.status(409).json({ error: 'This email is already registered on ScoutLink.' });
}
if (phone) {
for (const t of ['scouts','coaches']) {
const { data: pRow } = await supabase.from(t).select('id').eq('phone', phone.trim()).maybeSingle();
if (pRow) return res.status(409).json({ error: 'This phone number is already registered.' });
}
}

// Generate unique login code
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

const expires = new Date(Date.now() + 7*24*60*60*1000);
const { data: newCoach, error } = await supabase.from('coaches').insert({
coach_id: generateId('CHC'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), phone: phone||null,
team_name: me.team_name, team_id: me.team_id,
role_at_club: roleAtClub||'Coach',
data_policy_agreed: true, login_code: loginCode, login_code_expires: expires,
is_active: true, is_super_user: false, registration_complete: false
}).select().single();
if (error) throw error;

const baseUrl = config.brandUrl||'https://scoutlink.app';
const completeLink = baseUrl + '/frontend/pages/complete-registration.html?code=' + loginCode + '&email=' + encodeURIComponent(emailAddr.toLowerCase()) + '&type=Coach';
await email.sendCompleteSignup({ to: emailAddr, firstName, loginCode, accountType: 'Coach', completeLink }).catch(e => console.error('[Email]', e.message));

res.status(201).json({ message: 'Coach added. Complete-registration email sent.', coachId: newCoach.id, loginCode, completeLink });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Assign a player to this coach (coach assigns themselves to a player, or super user assigns)
router.post('/assign-player/:playerId', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data: coach } = await supabase.from('coaches').select('id,team_id,team_name,is_super_user').eq('id', req.user.id).single();
if (!coach) return res.status(404).json({ error: 'Coach not found' });
const targetCoachId = req.body.coachId || req.user.id;
// Super user can assign to any coach on team; regular coach can only self-assign
if (!coach.is_super_user && targetCoachId !== req.user.id) return res.status(403).json({ error: 'Only super user coaches can reassign players' });
// Verify player is on same team
const { data: player } = await supabase.from('players').select('id,team_id,team_name').eq('id', req.params.playerId).single();
if (!player) return res.status(404).json({ error: 'Player not found' });
const { error } = await supabase.from('players').update({ assigned_coach_id: targetCoachId }).eq('id', req.params.playerId);
if (error) throw error;
res.json({ message: 'Player assigned to coach' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;