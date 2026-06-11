'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const email = require('../services/email');
const config = require('../config');

const SCOUT_PLAN_LIMITS = {
Core: { seats:1, exports:30, predictions:120, interests:200 },
Plus: { seats:3, exports:120, predictions:600, interests:1000 },
Elite: { seats:10, exports:500, predictions:1200, interests:99999 },
Enterprise: { seats:99999, exports:99999, predictions:99999, interests:99999 }
};

function titleCase(v) {
return String(v || '').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function isValidEmail(emailAddr) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailAddr || '').trim());
}

function completeRegistrationLink(accountType, emailAddr, loginCode) {
const baseUrl = String(config.brandUrl || 'https://scoutlink.app').replace(/\/+$/, '');
return baseUrl + '/complete-registration?code=' + encodeURIComponent(loginCode) + '&email=' + encodeURIComponent(String(emailAddr || '').toLowerCase().trim()) + '&type=' + encodeURIComponent(accountType);
}

// Generate login code unique across all user tables
async function generateUniqueCode() {
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let attempts = 0;
while (attempts < 20) {
let c = '';
for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random()*chars.length)];
const [s,co,p,stx] = await Promise.all([
supabase.from('scouts').select('id').eq('login_code',c).maybeSingle(),
supabase.from('coaches').select('id').eq('login_code',c).maybeSingle(),
supabase.from('players').select('id').eq('login_code',c).maybeSingle(),
supabase.from('stratex').select('id').eq('login_code',c).maybeSingle()
]);
if (!s.data && !co.data && !p.data && !stx.data) return c;
attempts++;
}
throw new Error('Could not generate unique login code');
}
async function checkDuplicates(emailAddr, phone) {
const em = emailAddr.toLowerCase().trim();
for (const t of ['scouts','coaches','players','stratex']) {
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

async function removeInserted(table, id) {
if (!table || !id) return;
await supabase.from(table).delete().eq('id', id);
}

async function countBy(table, column, value) {
try {
const { count, error } = await supabase.from(table).select('id',{count:'exact',head:true}).eq(column, value);
if (error) return 0;
return count || 0;
} catch(e) { return 0; }
}

async function deletePlayersByIds(playerIds) {
const ids = (playerIds || []).filter(Boolean);
if (!ids.length) return 0;
const { data: nominations } = await supabase.from('award_nominations').select('id').in('player_id', ids);
const nominationIds = (nominations || []).map(n => n.id);
if (nominationIds.length) await supabase.from('award_nomination_responses').delete().in('nomination_id', nominationIds);
await supabase.from('award_nominations').delete().in('player_id', ids);
await supabase.from('showcase_responses').delete().in('player_id', ids);
await supabase.from('showcase_players').delete().in('player_id', ids);
await supabase.from('compatibility_scores').delete().in('player_id', ids);
await supabase.from('recruitment_pipeline').delete().in('player_id', ids);
await supabase.from('match_facts').delete().in('player_id', ids);
await supabase.from('player_videos').delete().in('player_id', ids);
await supabase.from('notifications').delete().eq('recipient_type', 'Player').in('recipient_id', ids);
const { error } = await supabase.from('players').delete().in('id', ids);
if (error) throw error;
return ids.length;
}

async function deleteScoutsByIds(scoutIds) {
const ids = (scoutIds || []).filter(Boolean);
if (!ids.length) return 0;
await supabase.from('showcase_attendance').delete().in('scout_id', ids);
await supabase.from('showcase_responses').delete().in('scout_id', ids);
await supabase.from('award_nomination_responses').delete().in('scout_id', ids);
await supabase.from('recruitment_pipeline').delete().in('scout_id', ids);
await supabase.from('notifications').delete().eq('recipient_type', 'Scout').in('recipient_id', ids);
const { error } = await supabase.from('scouts').delete().in('id', ids);
if (error) throw error;
return ids.length;
}

async function deleteCoachesByIds(coachIds) {
const ids = (coachIds || []).filter(Boolean);
if (!ids.length) return 0;
await supabase.from('players').update({ assigned_coach_id: null }).in('assigned_coach_id', ids);
await supabase.from('notifications').delete().eq('recipient_type', 'Coach').in('recipient_id', ids);
const { error } = await supabase.from('coaches').delete().in('id', ids);
if (error) throw error;
return ids.length;
}

async function updateScoutSuperUser(req, res) {
try {
const isSuperUser = req.body.isSuperUser === true || req.body.is_super_user === true;
const { data, error } = await supabase.from('scouts').update({ is_super_user: isSuperUser }).eq('id', req.params.id).select('id,first_name,last_name,email,is_super_user').maybeSingle();
if (error || !data) return res.status(404).json({ error: 'Scout not found' });
res.json({ message: isSuperUser ? 'Scout marked as super user' : 'Scout super user access removed', scout: data });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
}

async function updateCoachSuperUser(req, res) {
try {
const isSuperUser = req.body.isSuperUser === true || req.body.is_super_user === true;
const { data, error } = await supabase.from('coaches').update({ is_super_user: isSuperUser }).eq('id', req.params.id).select('id,first_name,last_name,email,is_super_user').maybeSingle();
if (error || !data) return res.status(404).json({ error: 'Coach not found' });
res.json({ message: isSuperUser ? 'Coach marked as super user' : 'Coach super user access removed', coach: data });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
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
const teamIds = [...new Set((data||[]).map(s => s.scout_team_id).filter(Boolean))];
let teamMap = {};
if (teamIds.length) {
const { data: teams } = await supabase.from('scout_teams').select('id,team_name,league,tier,club_name').in('id', teamIds);
(teams||[]).forEach(t => { teamMap[t.id] = t; });
}
res.json({ data: (data||[]).map(s => ({ ...s, scout_team: s.scout_team_id ? teamMap[s.scout_team_id] || null : null })), total: count });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { limit=200 } = req.query;
const { data, error, count } = await supabase.from('coaches').select('*',{count:'exact'}).order('created_at',{ascending:false}).limit(Number(limit));
if (error) throw error;
const teamIds = [...new Set((data||[]).map(c => c.team_id).filter(Boolean))];
let teamMap = {};
if (teamIds.length) {
const { data: teams } = await supabase.from('school_academy_teams').select('id,team_name,county,league').in('id', teamIds);
(teams||[]).forEach(t => { teamMap[t.id] = t; });
}
res.json({ data: (data||[]).map(c => ({ ...c, academy_team: c.team_id ? teamMap[c.team_id] || null : null })), total: count });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/scouts/:id/super-user', requireAuth, requireRole('Stratex'), updateScoutSuperUser);
router.post('/scouts/:id/super-user', requireAuth, requireRole('Stratex'), updateScoutSuperUser);
router.patch('/coaches/:id/super-user', requireAuth, requireRole('Stratex'), updateCoachSuperUser);
router.post('/coaches/:id/super-user', requireAuth, requireRole('Stratex'), updateCoachSuperUser);

router.get('/scouts/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data: scout, error } = await supabase.from('scouts').select('*').eq('id', req.params.id).single();
if (error || !scout) return res.status(404).json({ error: 'Scout not found' });
let scoutTeam = null;
if (scout.scout_team_id) {
const { data: team } = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
scoutTeam = team || null;
}
const limits = SCOUT_PLAN_LIMITS[scout.subscription_plan || 'Core'] || SCOUT_PLAN_LIMITS.Core;
const interestsShown = await countBy('recruitment_pipeline', 'scout_id', scout.id);
const showcaseResponses = await countBy('showcase_attendance', 'scout_id', scout.id);
const usage = {
exportsUsed: Math.max(0, (limits.exports || 0) - (scout.exports_remaining || 0)),
exportsRemaining: scout.exports_remaining || 0,
predictionsUsed: Math.max(0, (limits.predictions || 0) - (scout.predictions_remaining || 0)),
predictionsRemaining: scout.predictions_remaining || 0,
interestsShown,
interestsRemaining: scout.interests_remaining || 0,
showcaseResponses
};
res.json({ scout, scoutTeam, usage });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/scouts/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const removed = await deleteScoutsByIds([req.params.id]);
res.json({ message: 'Scout deleted', removed });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/coaches/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data: coach, error } = await supabase.from('coaches').select('*').eq('id', req.params.id).single();
if (error || !coach) return res.status(404).json({ error: 'Coach not found' });
let academyTeam = null;
if (coach.team_id) {
const { data: team } = await supabase.from('school_academy_teams').select('*').eq('id', coach.team_id).maybeSingle();
academyTeam = team || null;
}
const assignedPlayers = await countBy('players', 'assigned_coach_id', coach.id);
const teamPlayers = coach.team_id ? await countBy('players', 'team_id', coach.team_id) : 0;
res.json({ coach, academyTeam, stats: { assignedPlayers, teamPlayers, startedAt: coach.created_at, lastActiveAt: coach.last_login || coach.updated_at || coach.created_at } });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/coaches/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const removed = await deleteCoachesByIds([req.params.id]);
res.json({ message: 'Coach deleted', removed });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, subscriptionPlan } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName and email required' });
if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
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
const completeLink = completeRegistrationLink('Scout', emailAddr, loginCode);
const emailResult = await email.sendCompleteSignup({ to: emailAddr, email: emailAddr, firstName, loginCode, accountType: 'Scout', completeLink });
if (!emailResult || !emailResult.success) {
await removeInserted('scouts', data.id);
return res.status(502).json({ error: 'SendGrid did not accept the scout invite email. Scout was not created.', details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error' });
}
res.status(201).json({ message: 'Scout added. Complete-registration email sent.', scout: data, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { firstName, lastName, emailAddr, phone, teamName, roleAtClub, county, league } = req.body;
if (!firstName||!lastName||!emailAddr||!teamName) return res.status(400).json({ error: 'firstName, lastName, email and teamName required' });
if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
const dupC = await checkDuplicates(emailAddr, phone);
if (dupC.duplicate) return res.status(409).json({ error: 'This ' + dupC.field + ' is already registered.' });
const loginCode = await generateUniqueCode();
const expires = new Date(Date.now() + 365*24*60*60*1000);
const { data, error } = await supabase.from('coaches').insert({
coach_id: generateId('CHC'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), phone: phone||null,
team_name: teamName, role_at_club: roleAtClub||'Coach',
team_county: county||null, team_league: league||null,
login_code: loginCode, login_code_expires: expires, is_active: true, data_policy_agreed: true,
registration_complete: false
}).select().single();
if (error) throw error;
const completeLink = completeRegistrationLink('Coach', emailAddr, loginCode);
const emailResult = await email.sendCompleteSignup({ to: emailAddr, email: emailAddr, firstName, loginCode, accountType: 'Coach', completeLink });
if (!emailResult || !emailResult.success) {
await removeInserted('coaches', data.id);
return res.status(502).json({ error: 'SendGrid did not accept the coach invite email. Coach was not created.', details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error' });
}
res.status(201).json({ message: 'Coach added. Complete-registration email sent.', coach: data, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/admins', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { firstName, lastName, emailAddr, role } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName and email required' });
if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
const dupA = await checkDuplicates(emailAddr, null);
if (dupA.duplicate) return res.status(409).json({ error: 'This email is already registered.' });
const loginCode = await generateUniqueCode();
const expires = new Date(Date.now() + 7*24*60*60*1000);
const { data, error } = await supabase.from('stratex').insert({
stratex_id: generateId('STX'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), role: role || 'admin', is_active: true,
login_code: loginCode, login_code_expires: expires, registration_complete: false
}).select().single();
if (error) throw error;
const completeLink = completeRegistrationLink('Stratex', emailAddr, loginCode);
const emailResult = await email.sendCompleteSignup({ to: emailAddr, email: emailAddr, firstName, loginCode, accountType: 'Stratex', completeLink });
if (!emailResult || !emailResult.success) {
await removeInserted('stratex', data.id);
return res.status(502).json({ error: 'SendGrid did not accept the admin invite email. Admin was not created.', details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error' });
}
res.status(201).json({ message: 'Admin added. Complete-registration email sent.', admin: data, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
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
const { data, error } = await supabase.from('scout_teams').insert({ team_name, league:league||null, tier:tier||null, country:country?titleCase(country):'England', formation:formation||null, playing_style:playing_style||null }).select().single();
if (error) throw error;
res.status(201).json({ data, message: 'Scout team created' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/scout-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data: assignedScouts } = await supabase.from('scouts').select('id').eq('scout_team_id', req.params.id);
await supabase.from('compatibility_scores').delete().eq('scout_team_id', req.params.id);
await supabase.from('recruitment_pipeline').delete().eq('scout_team_id', req.params.id);
const scoutsRemoved = await deleteScoutsByIds((assignedScouts||[]).map(s => s.id));
const { error } = await supabase.from('scout_teams').delete().eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Scout team and assigned scouts removed', scoutsRemoved });
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
const { team_name, county, city, country, league, contact_email } = req.body;
if (!team_name) return res.status(400).json({ error: 'team_name required' });
const { data, error } = await supabase.from('school_academy_teams').insert({ team_name, county:county?titleCase(county):null, city:city?titleCase(city):(county?titleCase(county):null), country:country?titleCase(country):'England', league:league||null, contact_email:contact_email||null }).select().single();
if (error) throw error;
res.status(201).json({ data, message: 'Non Pro Academy created' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.delete('/school-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data: teamPlayers } = await supabase.from('players').select('id').eq('team_id', req.params.id);
const { data: teamCoaches } = await supabase.from('coaches').select('id').eq('team_id', req.params.id);
const playersRemoved = await deletePlayersByIds((teamPlayers||[]).map(p => p.id));
const coachesRemoved = await deleteCoachesByIds((teamCoaches||[]).map(c => c.id));
await supabase.from('match_facts').delete().eq('team_id', req.params.id);
await supabase.from('fixtures').delete().eq('team_id', req.params.id);
const { error } = await supabase.from('school_academy_teams').delete().eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Non Pro Academy and assigned users removed', playersRemoved, coachesRemoved });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Get coaches for a school team
router.get('/school-teams/:id/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error } = await supabase.from('coaches').select('id,first_name,last_name,email,role_at_club,created_at,last_login,is_active').eq('team_id', req.params.id);
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
