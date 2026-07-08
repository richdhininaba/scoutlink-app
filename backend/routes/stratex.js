'use strict';
const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const email = require('../services/email');
const config = require('../config');
const { applyRealDataFilter } = require('../utils/demo');
const { sendDbError } = require('../utils/dbErrors');
const { limitsForPlan, effectiveLimits, addSubscriptionYear, displayLimit, normalizePlan, INTEREST_REQUEST_LABEL } = require('../utils/scoutPlans');

const contractUpload = multer({
storage: multer.memoryStorage(),
limits: { fileSize: 10 * 1024 * 1024 },
fileFilter: (req, file, cb) => {
if (file.mimetype !== 'application/pdf') return cb(new Error('Contract must be a PDF file.'));
cb(null, true);
}
});

function titleCase(v) {
return String(v || '').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function isValidEmail(emailAddr) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailAddr || '').trim());
}

const ADMIN_ROLE_PERMISSIONS = {
Management: ['management','admin_users','delete_users','permissions','acquisition','safeguarding','registrations','operations','product_demo','read_only'],
Operations: ['operations','registrations','support','showcase','product_demo','read_only'],
Acquisition: ['acquisition','registrations','product_demo','read_only'],
'Safeguarding Reviewer': ['safeguarding','registrations','read_only'],
'Product Demo': ['product_demo','read_only'],
'Read Only': ['read_only'],
Safeguarding: ['safeguarding','registrations','read_only'],
Nominations: ['operations','showcase','read_only'],
Support: ['support','read_only'],
ProductDemo: ['product_demo','read_only']
};

function normalizeAdminRole(role) {
const raw = String(role || '').trim();
const aliases = {
Safeguarding: 'Safeguarding Reviewer',
ProductDemo: 'Product Demo',
'Product Demo': 'Product Demo',
Support: 'Read Only',
Nominations: 'Operations',
'ReadOnly': 'Read Only',
'Read Only': 'Read Only'
};
return aliases[raw] || (ADMIN_ROLE_PERMISSIONS[raw] ? raw : 'Read Only');
}

function adminPermissions(role) {
const normalized = normalizeAdminRole(role);
return ADMIN_ROLE_PERMISSIONS[normalized] || ADMIN_ROLE_PERMISSIONS['Read Only'];
}

async function loadCurrentAdmin(req) {
const { data } = await supabase.from('stratex').select('id,email,admin_role,role,permissions,is_active').eq('id', req.user.id).maybeSingle();
return data || null;
}

function canManageSensitiveAdmin(admin) {
if (!admin || admin.is_active === false) return false;
const perms = Array.isArray(admin.permissions) ? admin.permissions : [];
return normalizeAdminRole(admin.admin_role || admin.role) === 'Management' || perms.includes('management') || perms.includes('permissions');
}

function canManageContracts(admin) {
if (!admin || admin.is_active === false) return false;
const perms = Array.isArray(admin.permissions) ? admin.permissions : [];
const role = normalizeAdminRole(admin.admin_role || admin.role);
return role === 'Management' || role === 'Operations' || perms.includes('management') || perms.includes('operations');
}

function visibleAdminIdsForContracts(current, admins) {
if (!current) return new Set();
if (canManageSensitiveAdmin(current)) return new Set((admins || []).map(a => a.id));
const visible = new Set([current.id]);
let changed = true;
while (changed) {
changed = false;
(admins || []).forEach(a => {
if (a.manager_id && visible.has(a.manager_id) && !visible.has(a.id)) {
visible.add(a.id);
changed = true;
}
});
}
return visible;
}

function contractPatchFromBody(body) {
const next = {};
if (body.payAmount !== undefined) next.payAmount = body.payAmount === '' ? null : Number(body.payAmount);
if (body.payFrequency !== undefined) next.payFrequency = String(body.payFrequency || '').trim() || null;
if (body.payStatus !== undefined) next.payStatus = String(body.payStatus || '').trim() || null;
if (body.contractType !== undefined) next.contractType = String(body.contractType || '').trim() || null;
if (body.notes !== undefined) next.notes = String(body.notes || '').trim() || null;
return next;
}

async function auditStratexAction(req, action, affectedTable, affectedRecordId, metadata) {
try {
await supabase.from('audit_logs').insert({
actor_id: req.user && req.user.id ? req.user.id : null,
actor_role: req.user && req.user.type ? req.user.type : 'Stratex',
action,
affected_table: affectedTable,
affected_record_id: affectedRecordId || null,
metadata: metadata || {}
});
} catch (err) {
console.error('[Stratex audit]', { code: err.code, message: err.message });
}
}

async function requireSensitiveAdmin(req, res) {
const current = await loadCurrentAdmin(req);
if (!canManageSensitiveAdmin(current)) {
res.status(403).json({ error: 'Only Management admins can change admin permissions or deactivate admins.' });
return null;
}
return current;
}

function canonicalLeagueName(v) {
return String(v || '').trim().replace(/\s+/g, ' ');
}

function normalizeOptionalUrl(v) {
const value = String(v || '').trim();
if (!value) return null;
if (!/^https?:\/\//i.test(value)) {
const err = new Error('URL must start with http:// or https://');
err.status = 400;
throw err;
}
return value;
}

function teamUrlPayload(body) {
const leagueName = canonicalLeagueName(body.league_name || body.league);
const leagueFullTimeUrl = normalizeOptionalUrl(body.league_fulltime_url || body.fulltime_url);
const teamWebsiteUrl = normalizeOptionalUrl(body.team_website_url);
return { leagueName, leagueFullTimeUrl, teamWebsiteUrl };
}

async function ensureLeagueOption(name, userId, fulltimeUrl, teamWebsiteUrl) {
const leagueName = canonicalLeagueName(name);
if (!leagueName) return null;
const { data: existing } = await supabase.from('league_options').select('*').ilike('name', leagueName).maybeSingle();
if (existing) {
const patch = {};
if (fulltimeUrl && !existing.fulltime_url) patch.fulltime_url = fulltimeUrl;
if (teamWebsiteUrl && !existing.team_website_url) patch.team_website_url = teamWebsiteUrl;
if (Object.keys(patch).length) {
const { data: updated, error: updateError } = await supabase.from('league_options').update(patch).eq('id', existing.id).select().single();
if (updateError) throw updateError;
return updated;
}
return existing;
}
const { data, error } = await supabase.from('league_options').insert({
name: leagueName,
fulltime_url: fulltimeUrl || null,
team_website_url: teamWebsiteUrl || null,
url_status: fulltimeUrl ? 'admin_entry' : 'needs_admin_entry',
created_by: userId || null
}).select().single();
if (error) throw error;
return data;
}

function validateScoutSafeguardingReview(review) {
review = review || {};
const checklist = review.checklist || {};
const required = ['identity','dbs','faCredentials','clubAssociation','contactDetails','noSafeguardingFlags','termsAccepted'];
const missing = required.filter(k => checklist[k] !== true);
const dbsDate = review.dbsIssueDate ? new Date(review.dbsIssueDate) : null;
const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
const docs = Array.isArray(review.documents) ? review.documents : [];
if (missing.length) return { ok: false, error: 'Scout approval is blocked until every safeguarding gate is checked: ' + missing.join(', ') };
if (!review.dbsCertificateNumber) return { ok: false, error: 'DBS certificate number is required.' };
if (!dbsDate || Number.isNaN(dbsDate.getTime())) return { ok: false, error: 'DBS issue date is required.' };
if (dbsDate < threeYearsAgo) return { ok: false, error: 'Enhanced DBS issue date must be within the last three years.' };
if (String(review.dbsLevel || '').toLowerCase() !== 'enhanced') return { ok: false, error: 'DBS level must be enhanced.' };
if (!docs.length) return { ok: false, error: 'At least one supporting document must be attached before approving a scout.' };
return { ok: true };
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
if (data) return { duplicate: true, field: 'email', table: t };
}
if (phone && phone.trim()) {
for (const t of ['scouts','coaches']) {
const { data } = await supabase.from(t).select('id').eq('phone', phone.trim()).maybeSingle();
if (data) return { duplicate: true, field: 'phone', table: t };
}
}
return { duplicate: false };
}

function duplicatePrecheckMessage(result, fallback) {
if (!result || !result.duplicate) return fallback || 'This record already exists.';
if (result.table === 'players' && result.field === 'email') return 'A player with this email already exists.';
if (result.table === 'coaches' && result.field === 'email') return 'A coach with this email already exists.';
if (result.table === 'coaches' && result.field === 'phone') return 'A coach with this phone number already exists.';
if (result.table === 'scouts' && result.field === 'email') return 'A scout with this email already exists.';
if (result.table === 'stratex' && result.field === 'email') return 'A Stratex user with this email already exists.';
return result.field === 'phone' ? 'This phone number is already registered.' : 'This email is already registered.';
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

async function countWhere(table, filters) {
try {
let q = supabase.from(table).select('id', { count: 'exact', head: true });
Object.entries(filters || {}).forEach(([key, value]) => { q = q.eq(key, value); });
const { count, error } = await q;
if (error) return 0;
return count || 0;
} catch(e) { return 0; }
}

async function scoutTeamUsage(team) {
if (!team || !team.id) return null;
const plan = team.subscription_plan || 'Core';
const allowed = effectiveLimits(plan, team.limit_overrides || {});
const [seatsUsed, exportsUsed, predictionsUsed, interestsUsed] = await Promise.all([
countWhere('scouts', { scout_team_id: team.id, is_demo: false }),
countWhere('scout_exports', { scout_team_id: team.id }),
countWhere('predictions_log', { scout_team_id: team.id }),
countWhere('recruitment_pipeline', { scout_team_id: team.id, is_active: true })
]);
return {
plan,
status: team.status || 'draft',
subscriptionStartAt: team.subscription_start_at || team.plan_start || null,
subscriptionRenewalAt: team.subscription_renewal_at || team.plan_end || null,
seats: { used: seatsUsed, allowed: allowed.seats, allowedLabel: displayLimit(allowed.seats) },
exports: { used: exportsUsed, allowed: allowed.exports, allowedLabel: displayLimit(allowed.exports) },
predictions: { used: predictionsUsed, allowed: allowed.predictions, allowedLabel: displayLimit(allowed.predictions) },
interests: { used: interestsUsed, allowed: allowed.interests, allowedLabel: displayLimit(allowed.interests), label: INTEREST_REQUEST_LABEL }
};
}

async function auditScoutTeam(teamId, adminId, action, previousValue, newValue, reason) {
try {
await supabase.from('scout_team_audit_logs').insert({
scout_team_id: teamId,
admin_id: adminId || null,
action,
previous_value: previousValue || null,
new_value: newValue || null,
reason: reason || null
});
} catch(e) {
console.warn('[Scout team audit skipped]', e.message);
}
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
supabase.from('players').select('id',{count:'exact',head:true}).eq('is_active',true).eq('is_demo', false),
supabase.from('coaches').select('id',{count:'exact',head:true}).eq('is_active',true).eq('is_demo', false),
supabase.from('scouts').select('id',{count:'exact',head:true}).eq('is_active',true).eq('is_demo', false),
supabase.from('registration_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
supabase.from('registration_requests').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(10),
]);
res.json({ totalPlayers, totalCoaches, totalScouts, pendingReqs, recentPendingRegistrations: recentReqs });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/rankings', requireAuth, requireRole('Scout','Stratex'), async (req, res) => {
try {
const { posGroup, minAge, maxAge, page=1, limit=50 } = req.query;
let q = supabase.from('players').select('id,first_name,last_name,age,position_group,specific_position,team_name,overall_rating,transfer_value,predicted_salary_weekly,nationality_code,height_category,build_category',{count:'exact'}).eq('is_active',true).eq('is_demo', false).not('overall_rating','is',null);
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
const { data: coachTeams } = await supabase.from('coaches').select('team_name').eq('is_active', true).eq('is_demo', false).not('team_name','is',null);
const { data: playerTeams } = await supabase.from('players').select('team_name').eq('is_active', true).eq('is_demo', false).not('team_name','is',null);
const all = new Set();
(coachTeams||[]).forEach(r => r.team_name && all.add(r.team_name));
(playerTeams||[]).forEach(r => r.team_name && all.add(r.team_name));
res.json({ teams: Array.from(all).sort() });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { limit=200 } = req.query;
const { data, error, count } = await supabase.from('scouts').select('*',{count:'exact'}).eq('is_demo', false).order('created_at',{ascending:false}).limit(Number(limit));
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
const { data, error, count } = await supabase.from('coaches').select('*',{count:'exact'}).eq('is_demo', false).order('created_at',{ascending:false}).limit(Number(limit));
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
const limits = scoutTeam ? effectiveLimits(scoutTeam.subscription_plan || scout.subscription_plan || 'Core', scoutTeam.limit_overrides || {}) : limitsForPlan(scout.subscription_plan || 'Core');
const interestsShown = await countBy('recruitment_pipeline', 'scout_id', scout.id);
const showcaseResponses = await countBy('showcase_attendance', 'scout_id', scout.id);
const usage = {
exportsUsed: Math.max(0, (limits.exports || 0) - (scout.exports_remaining || 0)),
exportsRemaining: scout.exports_remaining || 0,
predictionsUsed: Math.max(0, (limits.predictions || 0) - (scout.predictions_remaining || 0)),
predictionsRemaining: scout.predictions_remaining || 0,
interestsShown,
interestsRemaining: scout.interests_remaining || 0,
interestLabel: INTEREST_REQUEST_LABEL,
showcaseResponses
};
res.json({ scout, scoutTeam, teamUsage: scoutTeam ? await scoutTeamUsage(scoutTeam) : null, usage });
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
if (dupS.duplicate) return res.status(409).json({ error: duplicatePrecheckMessage(dupS) });
const loginCode = await generateUniqueCode();
const expires = new Date(Date.now() + 365*24*60*60*1000);
const planStart = new Date();
const planEnd = new Date(Date.now() + 365*24*60*60*1000);
const plan = subscriptionPlan || 'Core';
const limits = limitsForPlan(plan);
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
} catch(err) { console.error(err); sendDbError(res, err); }
});

router.post('/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { firstName, lastName, emailAddr, phone, teamName, roleAtClub, county, league } = req.body;
if (!firstName||!lastName||!emailAddr||!teamName) return res.status(400).json({ error: 'firstName, lastName, email and teamName required' });
if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
const dupC = await checkDuplicates(emailAddr, phone);
if (dupC.duplicate) return res.status(409).json({ error: duplicatePrecheckMessage(dupC) });
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
} catch(err) { console.error(err); sendDbError(res, err); }
});

router.post('/admins', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await requireSensitiveAdmin(req, res);
if (!currentAdmin) return;
const { firstName, lastName, emailAddr, role, adminRole, jobTitle, managerId, annualLeaveDays, contractData } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName and email required' });
if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });
const dupA = await checkDuplicates(emailAddr, null);
if (dupA.duplicate) return res.status(409).json({ error: duplicatePrecheckMessage(dupA) });
const loginCode = await generateUniqueCode();
const expires = new Date(Date.now() + 7*24*60*60*1000);
const nextAdminRole = normalizeAdminRole(adminRole || role || 'Read Only');
const { data, error } = await supabase.from('stratex').insert({
stratex_id: generateId('STX'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), role: nextAdminRole, admin_role: nextAdminRole,
job_title: jobTitle || nextAdminRole, manager_id: managerId || null,
permissions: adminPermissions(nextAdminRole),
annual_leave_days: Number(annualLeaveDays) || 25,
contract_data: contractData || {},
is_active: true, login_code: loginCode, login_code_expires: expires, registration_complete: false
}).select().single();
if (error) throw error;
const completeLink = completeRegistrationLink('Stratex', emailAddr, loginCode);
const emailResult = await email.sendCompleteSignup({ to: emailAddr, email: emailAddr, firstName, loginCode, accountType: 'Stratex', completeLink });
if (!emailResult || !emailResult.success) {
await removeInserted('stratex', data.id);
return res.status(502).json({ error: 'SendGrid did not accept the admin invite email. Admin was not created.', details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error' });
}
res.status(201).json({ message: 'Admin added. Complete-registration email sent.', admin: data, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
} catch(err) { console.error(err); sendDbError(res, err); }
});

router.get('/leagues', requireAuth, requireRole('Stratex','Coach'), async (req, res) => {
try {
const { data, error } = await supabase.from('league_options').select('*').eq('is_active', true).order('name');
if (error) throw error;
res.json({ data: data || [] });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/leagues', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const urls = teamUrlPayload(req.body || {});
const league = await ensureLeagueOption(req.body.name || urls.leagueName, req.user.id, urls.leagueFullTimeUrl, urls.teamWebsiteUrl);
if (!league) return res.status(400).json({ error: 'League name required' });
res.status(201).json({ data: league, message: 'League saved' });
} catch(err) { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
});

router.get('/contracts-pay', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await loadCurrentAdmin(req);
const { data: admins, error } = await supabase
.from('stratex')
.select('id,stratex_id,first_name,last_name,email,role,admin_role,job_title,manager_id,permissions,annual_leave_days,contract_data,is_active,created_at,last_login')
.order('first_name');
if (error) throw error;
const ids = visibleAdminIdsForContracts(currentAdmin, admins || []);
const rows = (admins || []).filter(a => ids.has(a.id));
res.json({ data: rows, canEdit: canManageContracts(currentAdmin), canManageSensitive: canManageSensitiveAdmin(currentAdmin) });
} catch(err) { console.error('[Stratex contracts list]', err); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/contracts-pay/:id/pay', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await loadCurrentAdmin(req);
if (!canManageContracts(currentAdmin)) return res.status(403).json({ error: 'You do not have permission to update pay or contract details.' });
const { data: admins, error: adminErr } = await supabase.from('stratex').select('id,manager_id,contract_data,is_active').order('first_name');
if (adminErr) throw adminErr;
const ids = visibleAdminIdsForContracts(currentAdmin, admins || []);
if (!ids.has(req.params.id)) return res.status(403).json({ error: 'You can only update your reporting tree.' });
const target = (admins || []).find(a => a.id === req.params.id);
const contractData = { ...(target && target.contract_data && typeof target.contract_data === 'object' ? target.contract_data : {}), ...contractPatchFromBody(req.body || {}) };
const { data, error } = await supabase
.from('stratex')
.update({ contract_data: contractData, updated_at: new Date().toISOString() })
.eq('id', req.params.id)
.select('id,first_name,last_name,email,role,admin_role,job_title,manager_id,contract_data,is_active')
.maybeSingle();
if (error || !data) return res.status(404).json({ error: 'Admin not found' });
await auditStratexAction(req, 'stratex_contract_pay_updated', 'stratex', data.id, {
fields: Object.keys(contractPatchFromBody(req.body || {})).sort()
});
res.json({ message: 'Contract and pay details updated.', data });
} catch(err) { console.error('[Stratex contracts update]', { code: err.code, message: err.message }); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/contracts-pay/:id/contract', requireAuth, requireRole('Stratex'), contractUpload.single('contract'), async (req, res) => {
try {
const currentAdmin = await loadCurrentAdmin(req);
if (!canManageContracts(currentAdmin)) return res.status(403).json({ error: 'You do not have permission to upload contracts.' });
if (!req.file) return res.status(400).json({ error: 'Please choose a contract file.' });
const { data: admins, error: adminErr } = await supabase.from('stratex').select('id,manager_id,contract_data,is_active').order('first_name');
if (adminErr) throw adminErr;
const ids = visibleAdminIdsForContracts(currentAdmin, admins || []);
if (!ids.has(req.params.id)) return res.status(403).json({ error: 'You can only upload contracts for your reporting tree.' });
const target = (admins || []).find(a => a.id === req.params.id);
try {
await supabase.storage.createBucket('stratex-contracts', { public: false, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ['application/pdf'] });
} catch (_) {}
const ext = '.pdf';
const filePath = req.params.id + '/' + Date.now() + '-' + crypto.randomUUID() + ext;
const { error: uploadErr } = await supabase.storage.from('stratex-contracts').upload(filePath, req.file.buffer, {
contentType: req.file.mimetype,
upsert: false,
metadata: { uploadedBy: req.user.id, source: 'stratex_contracts_pay' }
});
if (uploadErr) throw uploadErr;
const contractData = {
...(target && target.contract_data && typeof target.contract_data === 'object' ? target.contract_data : {}),
contractBucket: 'stratex-contracts',
contractPath: filePath,
contractFileName: req.file.originalname,
contractMimeType: req.file.mimetype,
contractFileSize: req.file.size,
contractUploadedAt: new Date().toISOString(),
contractUploadedBy: req.user.id
};
const { data, error } = await supabase
.from('stratex')
.update({ contract_data: contractData, updated_at: new Date().toISOString() })
.eq('id', req.params.id)
.select('id,first_name,last_name,email,role,admin_role,job_title,manager_id,contract_data,is_active')
.maybeSingle();
if (error || !data) return res.status(404).json({ error: 'Admin not found' });
await auditStratexAction(req, 'stratex_contract_uploaded', 'stratex', data.id, {
bucket: 'stratex-contracts',
fileSize: req.file.size,
mimeType: req.file.mimetype
});
res.json({ message: 'Contract uploaded.', data });
} catch(err) {
console.error('[Stratex contract upload]', { code: err.code, message: err.message });
res.status(err && err.message && err.message.includes('Contract must') ? 400 : 500).json({ error: err.message || 'Could not upload contract' });
}
});

router.get('/contracts-pay/:id/contract-url', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await loadCurrentAdmin(req);
const { data: admins, error: adminErr } = await supabase.from('stratex').select('id,manager_id,contract_data,is_active').order('first_name');
if (adminErr) throw adminErr;
const ids = visibleAdminIdsForContracts(currentAdmin, admins || []);
if (!ids.has(req.params.id)) return res.status(403).json({ error: 'You can only view contracts in your reporting tree.' });
const target = (admins || []).find(a => a.id === req.params.id);
const contractData = target && target.contract_data && typeof target.contract_data === 'object' ? target.contract_data : {};
if (!contractData.contractPath) return res.status(404).json({ error: 'No contract has been uploaded.' });
const { data, error } = await supabase.storage.from(contractData.contractBucket || 'stratex-contracts').createSignedUrl(contractData.contractPath, 60 * 10);
if (error) throw error;
await auditStratexAction(req, 'stratex_contract_signed_url_created', 'stratex', req.params.id, {
bucket: contractData.contractBucket || 'stratex-contracts',
expiresIn: 600
});
res.json({ url: data.signedUrl, expiresIn: 600, fileName: contractData.contractFileName || 'contract' });
} catch(err) { console.error('[Stratex contract URL]', { code: err.code, message: err.message }); res.status(500).json({ error: 'Could not create secure contract link' }); }
});

router.get('/org', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await loadCurrentAdmin(req);
const [{ data: admins, error: adminErr }, { data: leave }, { data: meetings }] = await Promise.all([
supabase.from('stratex').select('id,stratex_id,first_name,last_name,email,role,admin_role,job_title,manager_id,permissions,annual_leave_days,contract_data,is_active,created_at,last_login,registration_complete').order('first_name'),
supabase.from('stratex_time_off').select('*').order('created_at', { ascending: false }).limit(100),
supabase.from('stratex_meetings').select('*').order('meeting_date', { ascending: true }).limit(100)
]);
if (adminErr) throw adminErr;
res.json({ admins: admins || [], leave: leave || [], meetings: meetings || [], rolePermissions: ADMIN_ROLE_PERMISSIONS, canManageSensitive: canManageSensitiveAdmin(currentAdmin), currentAdmin });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/admins/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await requireSensitiveAdmin(req, res);
if (!currentAdmin) return;
const body = req.body || {};
const patch = {};
if (body.adminRole) { const nextRole = normalizeAdminRole(body.adminRole); patch.admin_role = nextRole; patch.role = nextRole; patch.permissions = adminPermissions(nextRole); }
if (body.jobTitle !== undefined) patch.job_title = body.jobTitle || null;
if (body.managerId !== undefined) patch.manager_id = body.managerId || null;
if (body.annualLeaveDays !== undefined) patch.annual_leave_days = Number(body.annualLeaveDays) || 25;
if (body.contractData !== undefined) patch.contract_data = body.contractData || {};
if (body.isActive !== undefined) patch.is_active = !!body.isActive;
patch.updated_at = new Date().toISOString();
const { data, error } = await supabase.from('stratex').update(patch).eq('id', req.params.id).select().maybeSingle();
if (error || !data) return res.status(404).json({ error: 'Admin not found' });
res.json({ message: 'Admin updated', admin: data });
} catch(err) { console.error(err); sendDbError(res, err); }
});

router.delete('/admins/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const currentAdmin = await requireSensitiveAdmin(req, res);
if (!currentAdmin) return;
if (req.params.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own admin account.' });
const { error } = await supabase.from('stratex').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Admin deactivated' });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/org/leave', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { stratexId, leaveType, startDate, endDate, notes } = req.body;
if (!stratexId || !leaveType || !startDate || !endDate) return res.status(400).json({ error: 'Admin, leave type, start date and end date are required.' });
const { data, error } = await supabase.from('stratex_time_off').insert({ stratex_id: stratexId, leave_type: leaveType, start_date: startDate, end_date: endDate, notes: notes || null }).select().single();
if (error) throw error;
res.status(201).json({ message: 'Leave recorded', data });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/org/meetings', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { title, meetingDate, location, attendees, notes } = req.body;
if (!title || !meetingDate) return res.status(400).json({ error: 'Meeting title and date are required.' });
const { data, error } = await supabase.from('stratex_meetings').insert({ created_by: req.user.id, title, meeting_date: meetingDate, location: location || null, attendees: attendees || [], notes: notes || null }).select().single();
if (error) throw error;
res.status(201).json({ message: 'Meeting booked', data });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/scouts/:id/plan', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { subscriptionPlan } = req.body;
const plan = normalizePlan(subscriptionPlan);
if (!plan) return res.status(400).json({ error: 'Invalid plan. Use Core, Plus, Elite or Enterprise' });
const limits = limitsForPlan(plan);
const planStart = new Date();
const planEnd = new Date(Date.now() + 365*24*60*60*1000);
const { error } = await supabase.from('scouts').update({
subscription_plan: plan, plan_start: planStart, plan_end: planEnd,
exports_remaining: limits.exports, predictions_remaining: limits.predictions, interests_remaining: limits.interests
}).eq('id', req.params.id);
if (error) throw error;
res.json({ message: 'Plan updated to ' + plan });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// =================== SCOUT TEAMS ===================
router.get('/scout-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error, count } = await supabase.from('scout_teams').select('*',{count:'exact'}).eq('is_demo', false).order('team_name');
if (error) throw error;
const usage = await Promise.all((data || []).map(t => scoutTeamUsage(t)));
res.json({ data: (data||[]).map((t, i) => ({ ...t, usage: usage[i] })), total: count||0 });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/scout-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { team_name, tier, country, formation, playing_style } = req.body;
if (!team_name) return res.status(400).json({ error: 'team_name required' });
const urls = teamUrlPayload(req.body);
const savedLeague = await ensureLeagueOption(urls.leagueName, req.user.id, urls.leagueFullTimeUrl, urls.teamWebsiteUrl);
const { data, error } = await supabase.from('scout_teams').insert({
team_name,
status:'draft',
subscription_plan:req.body.subscription_plan || req.body.subscriptionPlan || 'Core',
plan_limits:limitsForPlan(req.body.subscription_plan || req.body.subscriptionPlan || 'Core'),
limit_overrides:{},
league:savedLeague?savedLeague.name:null,
league_name:savedLeague?savedLeague.name:(urls.leagueName || null),
league_fulltime_url:urls.leagueFullTimeUrl || (savedLeague && savedLeague.fulltime_url) || null,
team_website_url:urls.teamWebsiteUrl || null,
tier:tier||null,
country:country?titleCase(country):'England',
formation:formation||null,
playing_style:playing_style||null
}).select().single();
if (error) throw error;
res.status(201).json({ data, message: 'Scout team created' });
} catch(err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
});

router.patch('/scout-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const updates = {};
if (req.body.team_name !== undefined) updates.team_name = String(req.body.team_name || '').trim();
if (req.body.tier !== undefined) updates.tier = req.body.tier || null;
if (req.body.country !== undefined) updates.country = req.body.country ? titleCase(req.body.country) : null;
if (req.body.formation !== undefined) updates.formation = req.body.formation || null;
if (req.body.playing_style !== undefined) updates.playing_style = req.body.playing_style || null;
if (req.body.subscription_plan !== undefined || req.body.subscriptionPlan !== undefined) {
updates.subscription_plan = req.body.subscription_plan || req.body.subscriptionPlan || 'Core';
updates.plan_limits = limitsForPlan(updates.subscription_plan);
}
const urls = teamUrlPayload(req.body);
if (req.body.league !== undefined || req.body.league_name !== undefined) {
const savedLeague = await ensureLeagueOption(urls.leagueName, req.user.id, urls.leagueFullTimeUrl, urls.teamWebsiteUrl);
updates.league = savedLeague ? savedLeague.name : (urls.leagueName || null);
updates.league_name = savedLeague ? savedLeague.name : (urls.leagueName || null);
}
if (req.body.league_fulltime_url !== undefined || req.body.fulltime_url !== undefined) updates.league_fulltime_url = urls.leagueFullTimeUrl;
if (req.body.team_website_url !== undefined) updates.team_website_url = urls.teamWebsiteUrl;
const { data, error } = await supabase.from('scout_teams').update(updates).eq('id', req.params.id).select().single();
if (error) throw error;
res.json({ data, message: 'Scout team updated' });
} catch(err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
});

router.get('/scout-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { data, error } = await supabase.from('scout_teams').select('*').eq('id', req.params.id).eq('is_demo', false).maybeSingle();
if (error || !data) return res.status(404).json({ error: 'Scout team not found' });
res.json({ data, usage: await scoutTeamUsage(data) });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/scout-teams/:id/activate', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const admin = await requireSensitiveAdmin(req, res);
if (!admin) return;
const { data: team, error: loadErr } = await supabase.from('scout_teams').select('*').eq('id', req.params.id).maybeSingle();
if (loadErr || !team) return res.status(404).json({ error: 'Scout team not found' });
const plan = req.body.subscriptionPlan || req.body.subscription_plan || team.subscription_plan || 'Core';
const limits = limitsForPlan(plan);
const start = new Date();
const renewal = addSubscriptionYear(start);
const patch = {
status:'Active',
subscription_plan:plan,
plan_limits:limits,
subscription_start_at:start.toISOString(),
subscription_renewal_at:renewal.toISOString(),
current_year_started_at:start.toISOString(),
current_year_ends_at:renewal.toISOString(),
activated_at:start.toISOString(),
activated_by:req.user.id,
updated_at:start.toISOString()
};
const { data, error } = await supabase.from('scout_teams').update(patch).eq('id', req.params.id).select().single();
if (error) throw error;
await supabase.from('scouts').update({
subscription_plan:plan,
plan_start:start.toISOString(),
plan_end:renewal.toISOString(),
exports_remaining:limits.exports,
predictions_remaining:limits.predictions,
interests_remaining:limits.interests
}).eq('scout_team_id', req.params.id);
await auditScoutTeam(req.params.id, req.user.id, 'activate', { status: team.status || 'draft', subscription_plan: team.subscription_plan || null }, patch, req.body.reason || null);
res.json({ message: 'Scout team activated', data, usage: await scoutTeamUsage(data) });
} catch(err) { console.error('[Scout team activate]', err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
});

router.patch('/scout-teams/:id/limits', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const admin = await requireSensitiveAdmin(req, res);
if (!admin) return;
const { data: team, error: loadErr } = await supabase.from('scout_teams').select('*').eq('id', req.params.id).maybeSingle();
if (loadErr || !team) return res.status(404).json({ error: 'Scout team not found' });
const next = Object.assign({}, team.limit_overrides || {});
['seats','exports','predictions','interests'].forEach(k => {
if (req.body[k] !== undefined && req.body[k] !== '') next[k] = Math.max(0, Math.floor(Number(req.body[k]) || 0));
});
const { data, error } = await supabase.from('scout_teams').update({
limit_overrides:next,
override_reason:req.body.reason || null,
updated_at:new Date().toISOString()
}).eq('id', req.params.id).select().single();
if (error) throw error;
await auditScoutTeam(req.params.id, req.user.id, 'limit_override', team.limit_overrides || {}, next, req.body.reason || null);
res.json({ message: 'Scout team limits updated', data, usage: await scoutTeamUsage(data) });
} catch(err) { console.error('[Scout team limits]', err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
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
const { data, error } = await supabase.from('scouts').select('id,first_name,last_name,email,club_name,scout_id').eq('scout_team_id', req.params.id).eq('is_demo', false);
if (error) throw error;
res.json({ data: data||[] });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add scout to scout team
router.post('/scout-teams/:id/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { scout_id } = req.body;
if (!scout_id) return res.status(400).json({ error: 'scout_id required' });
const { data: team, error: teamErr } = await supabase.from('scout_teams').select('id,status,subscription_plan,subscription_start_at,subscription_renewal_at,limit_overrides').eq('id', req.params.id).maybeSingle();
if (teamErr || !team) return res.status(404).json({ error: 'Scout team not found' });
const patch = { scout_team_id: req.params.id };
if (String(team.status || '').toLowerCase() === 'active') {
const limits = effectiveLimits(team.subscription_plan || 'Core', team.limit_overrides || {});
patch.subscription_plan = team.subscription_plan || 'Core';
patch.plan_start = team.subscription_start_at || null;
patch.plan_end = team.subscription_renewal_at || null;
patch.exports_remaining = limits.exports;
patch.predictions_remaining = limits.predictions;
patch.interests_remaining = limits.interests;
}
const { error } = await supabase.from('scouts').update(patch).eq('id', scout_id);
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
const { data, error, count } = await supabase.from('school_academy_teams').select('*',{count:'exact'}).eq('is_demo', false).order('team_name');
if (error) throw error;
res.json({ data: data||[], total: count||0 });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/school-teams', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const { team_name, county, city, country, contact_email } = req.body;
if (!team_name) return res.status(400).json({ error: 'team_name required' });
const urls = teamUrlPayload(req.body);
const savedLeague = await ensureLeagueOption(urls.leagueName, req.user.id, urls.leagueFullTimeUrl, urls.teamWebsiteUrl);
const { data, error } = await supabase.from('school_academy_teams').insert({
team_name,
county:county?titleCase(county):null,
city:city?titleCase(city):(county?titleCase(county):null),
country:country?titleCase(country):'England',
league:savedLeague?savedLeague.name:null,
league_name:savedLeague?savedLeague.name:(urls.leagueName || null),
league_fulltime_url:urls.leagueFullTimeUrl || (savedLeague && savedLeague.fulltime_url) || null,
team_website_url:urls.teamWebsiteUrl || null,
contact_email:contact_email||null
}).select().single();
if (error) throw error;
res.status(201).json({ data, message: 'Non Pro Academy created' });
} catch(err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
});

router.patch('/school-teams/:id', requireAuth, requireRole('Stratex'), async (req, res) => {
try {
const updates = {};
if (req.body.team_name !== undefined) updates.team_name = String(req.body.team_name || '').trim();
if (req.body.county !== undefined) updates.county = req.body.county ? titleCase(req.body.county) : null;
if (req.body.city !== undefined) updates.city = req.body.city ? titleCase(req.body.city) : null;
if (req.body.country !== undefined) updates.country = req.body.country ? titleCase(req.body.country) : null;
if (req.body.contact_email !== undefined) updates.contact_email = req.body.contact_email || null;
const urls = teamUrlPayload(req.body);
if (req.body.league !== undefined || req.body.league_name !== undefined) {
const savedLeague = await ensureLeagueOption(urls.leagueName, req.user.id, urls.leagueFullTimeUrl, urls.teamWebsiteUrl);
updates.league = savedLeague ? savedLeague.name : (urls.leagueName || null);
updates.league_name = savedLeague ? savedLeague.name : (urls.leagueName || null);
}
if (req.body.league_fulltime_url !== undefined || req.body.fulltime_url !== undefined) updates.league_fulltime_url = urls.leagueFullTimeUrl;
if (req.body.team_website_url !== undefined) updates.team_website_url = urls.teamWebsiteUrl;
const { data, error } = await supabase.from('school_academy_teams').update(updates).eq('id', req.params.id).select().single();
if (error) throw error;
res.json({ data, message: 'Non Pro Academy updated' });
} catch(err) { res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' }); }
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
const { data, error } = await supabase.from('coaches').select('id,first_name,last_name,email,role_at_club,created_at,last_login,is_active').eq('team_id', req.params.id).eq('is_demo', false);
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
