'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const email = require('../services/email');


// Generate login code unique across all user tables
async function generateUniqueCode() {
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let attempts = 0;
while (attempts < 20) {
let c = '';
for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random()*chars.length)];
const [s,co,p] = await Promise.all([
supabase.from('scouts').select('id').eq('login_code',c).maybeSingle(),
supabase.from('coaches').select('id').eq('login_code',c).maybeSingle(),
supabase.from('players').select('id').eq('login_code',c).maybeSingle()
]);
if (!s.data && !co.data && !p.data) return c;
attempts++;
}
throw new Error('Could not generate unique login code');
}
async function checkDuplicates(emailAddr, phone) {
const em = emailAddr.toLowerCase().trim();
for (const t of ['scouts','coaches','players']) {
const { data } = await supabase.from(t).select('id').eq('email', em).maybeSingle();
if (data) return { duplicate: true, field: 'email' };
}
if (phone && phone.trim()) {
for (const t of ['scouts','coaches']) {
const { data } = await supabase.from(t).select('id').eq('phone', phone.trim()).maybeSingle();
if (data) return { duplicate: true, field: 'phone' };
}
}
return { duplicate: false };
}
router.get('/dashboard', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const [{ count: totalPlayers }, { count: totalCoaches }, { count: totalScouts }, { count: pendingReqs }, { data: recentReqs }] = await Promise.all([
supabase.from('players').select('id',{count:'exact',head:true}).eq('is_active',true),
supabase.from('coaches').select('id',{count:'exact',head:true}).eq('is_active',true),
supabase.from('scouts').select('id',{count:'exact',head:true}).eq('is_active',true),
supabase.from('registration_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
supabase.from('registration_requests').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(10),
]);
res.json({ totalPlayers, totalCoaches, totalScouts, pendingReqs, recentPendingRegistrations: recentReqs });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/rankings', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
try {
const { posGroup, minAge, maxAge, page=1, limit=50 } = req.query;
let q = supabase.from('players').select('id,first_name,last_name,age,position_group,specific_position,team_name,overall_rating,transfer_value,predicted_salary_weekly,nationality_code,height_category,build_category',{count:'exact'}).eq('is_active',true).not('overall_rating','is',null);
if (posGroup) q = q.eq('position_group', posGroup);
if (minAge) q = q.gte('age', Number(minAge));
if (maxAge) q = q.lte('age', Number(maxAge));
const off = (Number(page)-1)*Number(limit);
q = q.order('overall_rating',{ascending:false}).range(off, off+Number(limit)-1);
const { data, error, count } = await q;
if (error) throw error;
res.json({ data: data.map((p,i) => ({ rank: off+i+1, ...p })), total: count });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/compare', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
try {
const { playerIds, teamId } = req.body;
if (!Array.isArray(playerIds)||playerIds.length<2||playerIds.length>4) return res.status(400).json({ error: 'Provide 2-4 playerIds' });
const { data: players } = await supabase.from('players').select('*').in('id', playerIds);
let team = { tier: 5 };
if (teamId) { const { data: t } = await supabase.from('scout_teams').select('*').eq('id', teamId).single(); if (t) team = t; }
const comparisons = await Promise.all(players.map(async p => {
const { data: m } = await supabase.from('match_facts').select('*').eq('player_id', p.id).order('match_date',{ascending:false}).limit(10);
return { player: p, analysis: analysePlayer(p, team, m||[]) };
}));
res.json({ comparisons, team });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/teams', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
try {
const { data: coachTeams } = await supabase.from('coaches').select('team_name').eq('is_active', true).not('team_name','is',null);
const { data: playerTeams } = await supabase.from('players').select('team_name').eq('is_active', true).not('team_name','is',null);
const all = new Set();
(coachTeams||[]).forEach(r => r.team_name && all.add(r.team_name));
(playerTeams||[]).forEach(r => r.team_name && all.add(r.team_name));
res.json({ teams: Array.from(all).sort() });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { limit=200 } = req.query;
const { data, error, count } = await supabase.from('scouts').select('*',{count:'exact'}).order('created_at',{ascending:false}).limit(Number(limit));
if (error) throw error;
res.json({ data, total: count });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { limit=200 } = req.query;
const { data, error, count } = await supabase.from('coaches').select('*',{count:'exact'}).order('created_at',{ascending:false}).limit(Number(limit));
if (error) throw error;
res.json({ data, total: count });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, subscriptionPlan } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName and email required' });
const dupS = await checkDuplicates(emailAddr, phone);
if (dupS.duplicate) return res.status(409).json({ error: 'This ' + dupS.field + ' is already registered.' });
const loginCode = await generateUniqueCode();
const expires = new Date(Date.now() + 365*24*60*60*1000);
const planStart = new Date();
const planEnd = new Date(Date.now() + 365*24*60*60*1000);
const PLAN_LIMITS = {
Core: { seats:1, exports:30, predictions:120, interests:200 },
Plus: { seats:3, exports:120, predictions:600, interests:1000 },
Elite: { seats:10, exports:500, predictions:1200, interests:99999 },
Enterprise: { seats:99999, exports:99999, predictions:99999, interests:99999 }
};
const plan = subscriptionPlan || 'Core';
const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Core;
const { data, error } = await supabase.from('scouts').insert({
scout_id: generateId('SCT'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), phone: phone||null,
club_name: scoutClub||null, club_league: scoutLeague||null,
login_code: loginCode, login_code_expires: expires, is_active: true, preferences_set: false,
subscription_plan: plan, plan_start: planStart, plan_end: planEnd,
exports_remaining: limits.exports, predictions_remaining: limits.predictions, interests_remaining: limits.interests
}).select().single();
if (error) throw error;
await email.sendRegApproved({ to: emailAddr, firstName, loginCode, accountType: 'Scout' });
res.status(201).json({ message: 'Scout added and login code sent by email.', scout: data });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { firstName, lastName, emailAddr, phone, teamName, roleAtClub, county, league } = req.body;
if (!firstName||!lastName||!emailAddr||!teamName) return res.status(400).json({ error: 'firstName, lastName, email and teamName required' });
const loginCode = generateLoginCode();
const expires = new Date(Date.now() + 365*24*60*60*1000);
const { data, error } = await supabase.from('coaches').insert({
coach_id: generateId('CHC'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), phone: phone||null,
team_name: teamName, role_at_club: roleAtClub||'Coach',
team_county: county||null, team_league: league||null,
login_code: loginCode, login_code_expires: expires, is_active: true, data_policy_agreed: true
}).select().single();
if (error) throw error;
await email.sendRegApproved({ to: emailAddr, firstName, loginCode, accountType: 'Coach' });
res.status(201).json({ message: 'Coach added and login code sent by email.', coach: data });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/scouts/:id/plan', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { subscriptionPlan } = req.body;
const PLAN_LIMITS = {
Core: { seats:1, exports:30, predictions:120, interests:200 },
Plus: { seats:3, exports:120, predictions:600, interests:1000 },
Elite: { seats:10, exports:500, predictions:1200, interests:99999 },
Enterprise: { seats:99999, exports:99999, predictions:99999, interests:99999 }
};
const limits = PLAN_LIMITS[subscriptionPlan];
if (!limits) return res.status(400).json({ error: 'Invalid plan. Use Core, Plus, Elite or Enterprise' });
const planStart = new Date();
const planEnd = new Date(Date.now() + 365*24*60*60*1000);
const { error } = await supabase.from('scouts').update({
subscription_plan: subscriptionPlan, plan_start: planStart, plan_end: planEnd,
exports_remaining: limits.exports, predictions_remaining: limits.predictions, interests_remaining: limits.interests
}).eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Plan updated to ' + subscriptionPlan });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// =================== SCOUT TEAMS ===================
router.get('/scout-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error, count } = await supabase.from('scout_teams').select('*',{count:'exact'}).order('team_name');
if (error) throw error;
res.json({ data: data||[], total: count||0 });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/scout-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { team_name, league, tier, country, formation, playing_style } = req.body;
if (!team_name) return res.status(400).json({ error: 'team_name required' });
const { data, error } = await supabase.from('scout_teams').insert({ team_name, league:league||null, tier:tier||null, country:country||'England', formation:formation||null, playing_style:playing_style||null }).select().single();
if (error) throw error;
res.status(201).json({ data, message: 'Scout team created' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/scout-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
// Remove scout seat assignments first (scouts.scout_team_id if exists, or just delete team)
await supabase.from('scouts').update({ scout_team_id: null }).eq('scout_team_id', req.params.id);
const { error } = await supabase.from('scout_teams').delete().eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Scout team removed' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Get scouts assigned to a scout team
router.get('/scout-teams/:id/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error } = await supabase.from('scouts').select('id,first_name,last_name,email,club_name,scout_id').eq('scout_team_id', req.params.id);
if (error) throw error;
res.json({ data: data||[] });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add scout to scout team
router.post('/scout-teams/:id/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { scout_id } = req.body;
if (!scout_id) return res.status(400).json({ error: 'scout_id required' });
const { error } = await supabase.from('scouts').update({ scout_team_id: req.params.id }).eq('id', scout_id);
if (error) throw error;
res.json({ message: 'Scout added to team' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Remove scout from scout team
router.delete('/scout-teams/:id/scouts/:scoutId', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { error } = await supabase.from('scouts').update({ scout_team_id: null }).eq('id', req.params.scoutId).eq('scout_team_id', req.params.id);
if (error) throw error;
res.json({ message: 'Scout removed from team' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// =================== SCHOOL / ACADEMY TEAMS ===================
router.get('/school-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error, count } = await supabase.from('school_academy_teams').select('*',{count:'exact'}).order('team_name');
if (error) throw error;
res.json({ data: data||[], total: count||0 });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/school-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { team_name, county, league, contact_email } = req.body;
if (!team_name) return res.status(400).json({ error: 'team_name required' });
const { data, error } = await supabase.from('school_academy_teams').insert({ team_name, county:county||null, league:league||null, contact_email:contact_email||null }).select().single();
if (error) throw error;
res.status(201).json({ data, message: 'Academy/school team created' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/school-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
// Remove player associations (set team_id to null)
await supabase.from('players').update({ team_id: null, team_name: null }).eq('team_id', req.params.id);
// Remove coach associations
await supabase.from('coaches').update({ team_id: null }).eq('team_id', req.params.id);
// Delete match facts for this team
await supabase.from('match_facts').delete().eq('team_id', req.params.id);
// Delete team
const { error } = await supabase.from('school_academy_teams').delete().eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Academy/school team removed' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Get coaches for a school team
router.get('/school-teams/:id/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error } = await supabase.from('coaches').select('id,first_name,last_name,email,role_at_club').eq('team_id', req.params.id);
if (error) throw error;
res.json({ data: data||[] });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add coach to school team
router.post('/school-teams/:id/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { coach_id } = req.body;
if (!coach_id) return res.status(400).json({ error: 'coach_id required' });
const { data: teamData } = await supabase.from('school_academy_teams').select('team_name').eq('id', req.params.id).single();
const { error } = await supabase.from('coaches').update({ team_id: req.params.id, team_name: teamData?.team_name||null }).eq('id', coach_id);
if (error) throw error;
res.json({ message: 'Coach added to team' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Remove coach from school team
router.delete('/school-teams/:id/coaches/:coachId', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { error } = await supabase.from('coaches').update({ team_id: null }).eq('id', req.params.coachId).eq('team_id', req.params.id);
if (error) throw error;
res.json({ message: 'Coach removed from team' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;