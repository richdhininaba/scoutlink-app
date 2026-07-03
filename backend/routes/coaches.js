'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const email = require('../services/email');
const config = require('../config');
const { isDemoSession, applyRealDataFilter, demoWriteFields } = require('../utils/demo');
const { sendDbError } = require('../utils/dbErrors');

const COACH_PROFILE_SELECT = 'id,coach_id,first_name,last_name,email,phone,team_id,team_name,role_at_club,data_policy_agreed,last_login,is_active,created_at,updated_at,registration_complete,is_super_user';

function isValidEmail(emailAddr) {
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(emailAddr || '').trim());
}

// My players - coaches only see players assigned to them (assigned_coach_id)
// NOTE: coaches table requires is_super_user column (boolean, default false) - added via migration
// Super user coaches see ALL players on their team
router.get('/my-players', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data: coach } = await supabase.from('coaches').select('id,team_name,team_id,is_super_user').eq('id', req.user.id).single();
if (!coach) return res.status(404).json({ error: 'Coach not found' });

let q = supabase.from('players')
.select('id,first_name,last_name,age,position_group,specific_position,primary_position,overall_rating,transfer_value,predicted_salary_weekly,height_category,build_category,foot,team_name,assigned_coach_id,avatar_config,appearances,goals,assists,clean_sheets,yellow_cards,red_cards')
.eq('is_active', true)
.order('last_name');
q = applyRealDataFilter(q, req);

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
const { data, error } = await supabase.from('coaches').select(COACH_PROFILE_SELECT).eq('id', req.user.id).single();
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
q = applyRealDataFilter(q, req);
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
const { firstName, lastName, emailAddr, phone, isSuperUser } = req.body;
if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName, email required' });
if (!isValidEmail(emailAddr)) return res.status(400).json({ error: 'Please enter a valid email address.' });

// Check duplicates
const tables = ['scouts','coaches','players','stratex'];
for (const t of tables) {
const { data: eRow } = await supabase.from(t).select('id').eq('email', emailAddr.toLowerCase().trim()).maybeSingle();
if (eRow) return res.status(409).json({ error: t === 'coaches' ? 'A coach with this email already exists.' : 'This email is already registered on ScoutLink.' });
}
if (phone) {
for (const t of ['scouts','coaches']) {
const { data: pRow } = await supabase.from(t).select('id').eq('phone', phone.trim()).maybeSingle();
if (pRow) return res.status(409).json({ error: t === 'coaches' ? 'A coach with this phone number already exists.' : 'This phone number is already registered.' });
}
}

// Generate unique login code
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let loginCode = '', attempts = 0;
while (attempts < 20) {
let c = '';
for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random()*chars.length)];
const [s,co,p,stx] = await Promise.all([
supabase.from('scouts').select('id').eq('login_code',c).maybeSingle(),
supabase.from('coaches').select('id').eq('login_code',c).maybeSingle(),
supabase.from('players').select('id').eq('login_code',c).maybeSingle(),
supabase.from('stratex').select('id').eq('login_code',c).maybeSingle()
]);
if (!s.data && !co.data && !p.data && !stx.data) { loginCode = c; break; }
attempts++;
}
if (!loginCode) return res.status(500).json({ error: 'Could not generate unique login code' });

const expires = new Date(Date.now() + 7*24*60*60*1000);
const { data: newCoach, error } = await supabase.from('coaches').insert({
coach_id: generateId('CHC'), first_name: firstName.trim(), last_name: lastName.trim(),
email: emailAddr.toLowerCase().trim(), phone: phone||null,
team_name: me.team_name, team_id: me.team_id,
role_at_club: 'Coach',
data_policy_agreed: true, login_code: loginCode, login_code_expires: expires,
is_active: true, is_super_user: !!isSuperUser, registration_complete: false,
...demoWriteFields(req)
}).select().single();
if (error) throw error;

const baseUrl = config.brandUrl||'https://scoutlink.app';
const completeLink = baseUrl + '/complete-registration?code=' + loginCode + '&email=' + encodeURIComponent(emailAddr.toLowerCase()) + '&type=Coach';
const emailResult = isDemoSession(req) ? { success: true, template: 'demo-no-email' } : await email.sendCompleteSignup({ to: emailAddr, email: emailAddr, firstName, loginCode, accountType: 'Coach', completeLink }).catch(e => {
  console.error('[Email]', e.message);
  return { success: false, error: e.message };
});
if (!emailResult || !emailResult.success) {
await supabase.from('coaches').delete().eq('id', newCoach.id);
return res.status(502).json({ error: 'SendGrid did not accept the coach invite email. Coach was not created.', details: emailResult && (emailResult.error || emailResult.details) || 'Unknown email error' });
}

res.status(201).json({ message: 'Coach added. Complete-registration email sent.', coachId: newCoach.id, loginCode, completeLink, emailSent: true, emailTemplate: emailResult.template || null });
} catch(err) { console.error(err); sendDbError(res, err); }
});

// Assign a player to this coach (coach assigns themselves to a player, or super user assigns)
router.post('/assign-player/:playerId', requireAuth, requireRole('Coach'), async (req, res) => {
try {
const { data: coach } = await supabase.from('coaches').select('id,team_id,team_name,is_super_user').eq('id', req.user.id).single();
if (!coach) return res.status(404).json({ error: 'Coach not found' });
const targetCoachId = req.body.coachId || req.user.id;
// Super user can assign to any coach on team; regular coach can only self-assign
if (!coach.is_super_user && targetCoachId !== req.user.id) return res.status(403).json({ error: 'Only super user coaches can reassign players' });
const { data: targetCoach } = await supabase.from('coaches').select('id,team_id,team_name').eq('id', targetCoachId).eq('is_active', true).single();
if (!targetCoach) return res.status(404).json({ error: 'Target coach not found' });
const targetSameTeam = (coach.team_id && targetCoach.team_id === coach.team_id) || (!coach.team_id && coach.team_name && targetCoach.team_name === coach.team_name) || targetCoach.id === coach.id;
if (!targetSameTeam) return res.status(403).json({ error: 'Target coach must be on your team' });
// Verify player is on same team
const { data: player } = await supabase.from('players').select('id,team_id,team_name').eq('id', req.params.playerId).single();
if (!player) return res.status(404).json({ error: 'Player not found' });
const playerSameTeam = (coach.team_id && player.team_id === coach.team_id) || (!coach.team_id && coach.team_name && player.team_name === coach.team_name);
if (!playerSameTeam) return res.status(403).json({ error: 'Player must be on your team' });
const { error } = await supabase.from('players').update({ assigned_coach_id: targetCoachId }).eq('id', req.params.playerId);
if (error) throw error;
res.json({ message: 'Player assigned to coach' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});


// GET /api/coaches/dashboard - coach dashboard stats
router.get('/dashboard', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const coachId = req.user.id;
    // Get coach record to find team_id
    const { data: coach } = await supabase.from('coaches').select('team_id,team_name').eq('id', coachId).single();
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    
    const teamId = coach.team_id;
    if (!teamId) {
      return res.json({ totalPlayers: 0, topRatedPlayer: null, totalSquadValue: 0, scoutsInterested: 0, teamName: coach.team_name || '' });
    }
    
    // Get all players for this team
    let playerQ = supabase.from('players')
      .select('id,first_name,last_name,overall_rating,transfer_value,position_group,appearances')
      .eq('team_id', teamId).eq('is_active', true);
    playerQ = applyRealDataFilter(playerQ, req);
    const { data: players, error: pErr } = await playerQ;
    if (pErr) throw pErr;
    
    const playerList = players || [];
    const totalPlayers = playerList.length;
    
    // Top rated player
    const sorted = [...playerList].sort((a,b) => (parseFloat(b.overall_rating)||0) - (parseFloat(a.overall_rating)||0));
    const topRated = sorted[0] || null;
    
    // Total squad value (sum transfer_value)
    const totalSquadValue = playerList.reduce((sum, p) => sum + (Number(p.transfer_value)||0), 0);
    
    // Scouts interested (distinct scouts in recruitment_pipeline for these players)
    let scoutsInterested = 0;
    if (playerList.length > 0) {
      const playerIds = playerList.map(p => p.id);
      const { data: pipeline } = await supabase.from('recruitment_pipeline')
        .select('scout_id').in('player_id', playerIds);
      if (pipeline) {
        scoutsInterested = new Set(pipeline.map(r => r.scout_id)).size;
      }
    }
    
    res.json({
      totalPlayers, totalSquadValue, scoutsInterested,
      topRatedPlayer: topRated ? { name: (topRated.first_name||'') + ' ' + (topRated.last_name||''), overall_rating: topRated.overall_rating } : null,
      teamName: coach.team_name || ''
    });
  } catch(err) { console.error('[CoachDashboard]', err); res.status(500).json({ error: err.message || 'Internal server error' }); }
});

// GET /api/coaches/profile - coach profile
router.get('/profile', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data: coach, error } = await supabase.from('coaches').select(COACH_PROFILE_SELECT).eq('id', req.user.id).single();
    if (error || !coach) return res.status(404).json({ error: 'Coach not found' });
    res.json({ coach });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/coaches/players/:playerId - delete a player
router.delete('/players/:playerId', requireAuth, requireRole('Coach'), async (req, res) => {
  try {
    const { data: player } = await supabase.from('players').select('team_id').eq('id', req.params.playerId).single();
    const { data: coach } = await supabase.from('coaches').select('team_id').eq('id', req.user.id).single();
    if (!player || !coach || player.team_id !== coach.team_id) return res.status(403).json({ error: 'Not authorised' });
    const { error } = await supabase.from('players').update({ is_active: false }).eq('id', req.params.playerId);
    if (error) throw error;
    res.json({ message: 'Player removed from squad' });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
