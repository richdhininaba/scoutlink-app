'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole, generateLoginCode, generateId } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const email = require('../services/email');

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

// Get all team names (for bulk import dropdown)
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

// List all scouts
router.get('/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
    try {
          const { data, error, count } = await supabase.from('scouts').select('*',{count:'exact'}).order('created_at',{ascending:false});
          if (error) throw error;
          res.json({ data, total: count });
    } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// List all coaches
router.get('/coaches', requireAuth, requireRole('Stratex'), async (req, res) => {
    try {
          const { data, error, count } = await supabase.from('coaches').select('*',{count:'exact'}).order('created_at',{ascending:false});
          if (error) throw error;
          res.json({ data, total: count });
    } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Add scout directly (bypass registration)
router.post('/scouts', requireAuth, requireRole('Stratex'), async (req, res) => {
    try {
          const { firstName, lastName, emailAddr, phone, scoutClub, scoutLeague, subscriptionPlan } = req.body;
          if (!firstName||!lastName||!emailAddr) return res.status(400).json({ error: 'firstName, lastName and email required' });
          const loginCode = generateLoginCode();
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

// Add coach directly (bypass registration)
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

// Update scout subscription plan
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

module.exports = router;
