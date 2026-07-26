'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const { applyRealDataFilter } = require('../utils/demo');
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function score(value, fallback = 50) {
  let n = number(value, fallback);
  if (n > 0 && n <= 10) n *= 10;
  return Math.max(0, Math.min(100, n));
}
function average(values, fallback = 50) {
  const usable = values.map(value => number(value, NaN)).filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : fallback;
}
function round(value, places = 1) {
  const p = Math.pow(10, places);
  return Math.round(number(value) * p) / p;
}
function text(value) {
  return String(value == null ? '' : value).trim();
}
function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}
function playerName(player) {
  return [player?.first_name, player?.last_name].filter(Boolean).join(' ') || 'Player';
}
function playerPosition(player) {
  return player?.specific_position || player?.primary_position || player?.position_group || 'Position TBC';
}
function displayNeed(type, need) {
  return {
    weaknesses: 'Team weakness',
    roles: 'Role expectation',
    goals: 'Long-term goal',
    positions: 'Preferred position',
    ages: 'Age group'
  }[type] + ': ' + need;
}

async function contextFor(req) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('id', req.user.id)
    .single();
  if (error || !scout) {
    const e = new Error('Scout account not found.');
    e.status = 404;
    throw e;
  }
  let team = {};
  if (scout.scout_team_id) {
    const result = await supabase.from('scout_teams').select('*').eq('id', scout.scout_team_id).maybeSingle();
    if (result.error) throw result.error;
    team = result.data || {};
  }
  const prefs = scout.scout_preferences || {};
  return { req, scout, team, prefs };
}

async function allPlayers(context) {
  let query = supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('overall_rating', { ascending: false })
    .limit(300);
  query = applyRealDataFilter(query, context.req);
  const { data, error } = await query;
  if (error) throw error;
  const players = data || [];
  const ids = players.map(player => player.id);
  const factsResult = ids.length
    ? await supabase.from('match_facts').select('*').in('player_id', ids).order('match_date', { ascending: false }).limit(1000)
    : { data: [] };
  if (factsResult.error) throw factsResult.error;
  const factsByPlayer = {};
  (factsResult.data || []).forEach(fact => {
    if (!factsByPlayer[fact.player_id]) factsByPlayer[fact.player_id] = [];
    if (factsByPlayer[fact.player_id].length < 12) factsByPlayer[fact.player_id].push(fact);
  });
  return players.map(player => {
    const analysis = analysePlayer(player, context.team, factsByPlayer[player.id] || [], context.prefs);
    return {
      ...player,
      compatibilityScore: round(analysis.compatibilityScore, 1),
      compatibility: analysis.compatibility || {},
      compatibilityBreakdown: analysis.compatibilityBreakdown || {},
      overallBreakdown: analysis.overallBreakdown || {},
      positionRatings: analysis.positionRatings || {},
      dataConfidence: analysis.dataConfidence || analysis.compatibilityBreakdown?.dataConfidence || null,
      _analysis: analysis,
      _facts: factsByPlayer[player.id] || []
    };
  });
}

function needValues(context) {
  const prefs = context.prefs || {};
  const team = context.team || {};
  return {
    weaknesses: list(prefs.teamWeaknesses || team.team_weaknesses),
    roles: list(prefs.roleExpectations || team.role_expectations),
    goals: list(prefs.longTermGoals || team.long_term_goals),
    positions: list(prefs.preferredPositions || team.preferred_positions),
    ages: list(prefs.ageGroups || team.age_groups)
  };
}

function containsAny(haystack, words) {
  const value = String(haystack || '').toLowerCase();
  return words.some(word => value.includes(word));
}

function needFit(player, type, need) {
  const n = String(need || '').toLowerCase();
  const a = key => score(player[key]);
  const analysis = player._analysis || {};
  const compatibility = analysis.compatibility || {};
  if (type === 'positions') {
    const positions = list(player.positions).concat([playerPosition(player)]).map(item => String(item).toUpperCase());
    return positions.includes(String(need).toUpperCase());
  }
  if (type === 'ages') return String(player.age_group).toUpperCase() === String(need).toUpperCase();
  if (containsAny(n, ['pace', 'speed', 'transition', 'wide'])) return average([a('pace'), a('agility'), a('stamina')]) >= 65;
  if (containsAny(n, ['physical', 'strength', 'aerial', 'resilience'])) return average([a('strength'), a('jumping'), a('stamina')]) >= 65;
  if (containsAny(n, ['defen', 'ball-winning', 'tackle', 'screen'])) return average([a('defending'), a('tackling'), a('positioning')]) >= 65;
  if (containsAny(n, ['creative', 'vision', 'passing', 'retention', 'pressure'])) return average([a('passing'), a('vision'), a('dribbling'), a('composure')]) >= 65;
  if (containsAny(n, ['goal', 'offensive', 'finish', 'attack'])) return average([a('shooting'), a('positioning'), a('composure')]) >= 65;
  if (containsAny(n, ['leadership', 'communication', 'coachability', 'decision'])) return average([a('composure'), a('positioning'), score(compatibility.roleFit)]) >= 65;
  if (containsAny(n, ['financial', 'resale', 'value', 'risk'])) return score(player.overall_rating) >= 65 && number(player.transfer_value) <= 100000;
  if (containsAny(n, ['tactical', 'formation', 'role'])) return average([score(compatibility.roleFit), score(compatibility.tacticalStyleFit), score(compatibility.formationPositionFit)]) >= 65;
  return number(player.compatibilityScore) >= 70;
}

function teamNeeds(context, players) {
  const values = needValues(context);
  return Object.keys(values).flatMap(type => values[type].map(need => {
    const matching = players.filter(player => needFit(player, type, need));
    return {
      type,
      label: displayNeed(type, need),
      need,
      relevantPlayers: matching.length,
      playerIds: matching.slice(0, 20).map(player => player.id)
    };
  }));
}

async function usageSnapshot(context) {
  const plan = context.team.subscription_plan || context.scout.subscription_plan || 'Core';
  const limits = context.scout.scout_team_id
    ? effectiveLimits(plan, context.team.limit_overrides || {})
    : limitsForPlan(plan);
  const count = async (table, activeOnly) => {
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    if (activeOnly) query = query.eq('is_active', true);
    query = context.scout.scout_team_id
      ? query.eq('scout_team_id', context.scout.scout_team_id)
      : query.eq('scout_id', context.scout.id);
    const { count: total, error } = await query;
    if (error) throw error;
    return total || 0;
  };
  const [predictions, exportsUsed, interests] = await Promise.all([
    count('predictions_log'), count('scout_exports'), count('recruitment_pipeline', true)
  ]);
  const row = (used, limit) => ({ used, limit: number(limit), remaining: Math.max(0, number(limit) - used) });
  return {
    plan,
    predictions: row(predictions, limits.predictions),
    exports: row(exportsUsed, limits.exports),
    interests: row(interests, limits.interests)
  };
}

async function dashboardActions(context, players) {
  let pipelineQuery = supabase
    .from('recruitment_pipeline')
    .select('id,player_id,stage,updated_at,created_at,next_action,next_action_due_at,assigned_scout_id,is_active')
    .eq('is_active', true)
    .order('updated_at', { ascending: true });
  pipelineQuery = context.scout.scout_team_id
    ? pipelineQuery.eq('scout_team_id', context.scout.scout_team_id)
    : pipelineQuery.eq('scout_id', context.scout.id);
  const pipelineResult = await pipelineQuery;
  if (pipelineResult.error) throw pipelineResult.error;
  const pipeline = pipelineResult.data || [];
  const byId = Object.fromEntries(players.map(player => [player.id, player]));
  const actions = [];
  const now = Date.now();

  for (const row of pipeline) {
    const player = byId[row.player_id];
    if (!player) continue;
    const updated = new Date(row.updated_at || row.created_at || 0).getTime();
    const days = Number.isFinite(updated) ? Math.floor((now - updated) / 86400000) : 0;
    const due = row.next_action_due_at && new Date(row.next_action_due_at).getTime() < now;
    if (due) {
      actions.push({
        kind: 'overdue_action', priority: 100, playerId: player.id, pipelineId: row.id,
        title: playerName(player),
        body: row.next_action ? 'Next action is overdue: ' + row.next_action : 'A pipeline action is overdue.',
        actionLabel: 'Open action', actionUrl: '/scout/pipeline?focus=' + encodeURIComponent(row.id)
      });
    } else if (days >= 14) {
      actions.push({
        kind: 'pipeline_stagnation', priority: 85, playerId: player.id, pipelineId: row.id,
        title: playerName(player), body: 'This player has remained in ' + (row.stage || 'the pipeline') + ' for ' + days + ' days without a recorded step.',
        actionLabel: 'Review pipeline', actionUrl: '/scout/pipeline?focus=' + encodeURIComponent(row.id)
      });
    }
    const confidence = player._facts.length >= 10 ? 'high' : player._facts.length >= 5 ? 'medium' : 'low';
    if (confidence === 'low') {
      actions.push({
        kind: 'evidence_gap', priority: 70, playerId: player.id, pipelineId: row.id,
        title: playerName(player), body: 'The current evidence is thin. Plan a focused observation or request more Match Facts.',
        actionLabel: 'Review evidence', actionUrl: '/player/profile?id=' + encodeURIComponent(player.id) + '#evidence'
      });
    }
  }

  const teamIds = [...new Set(pipeline.map(row => byId[row.player_id]?.team_id).filter(Boolean))];
  if (teamIds.length) {
    const today = new Date().toISOString().slice(0, 10);
    const fixturesResult = await supabase
      .from('fixtures').select('*').in('team_id', teamIds).gte('fixture_date', today)
      .order('fixture_date', { ascending: true }).limit(100);
    if (!fixturesResult.error) {
      const fixtures = fixturesResult.data || [];
      let planQuery = supabase.from('scout_fixture_plans').select('fixture_id,player_id');
      planQuery = context.scout.scout_team_id
        ? planQuery.eq('scout_team_id', context.scout.scout_team_id)
        : planQuery.eq('scout_id', context.scout.id);
      const planResult = await planQuery;
      const planned = new Set((planResult.data || []).map(plan => plan.fixture_id + ':' + (plan.player_id || '')));
      fixtures.slice(0, 20).forEach(fixture => {
        pipeline.filter(row => byId[row.player_id]?.team_id === fixture.team_id).forEach(row => {
          const player = byId[row.player_id];
          if (!planned.has(fixture.id + ':' + player.id)) {
            actions.push({
              kind: 'upcoming_fixture', priority: 80, playerId: player.id, fixtureId: fixture.id,
              title: playerName(player) + ' has an upcoming match',
              body: (fixture.opponent_name || fixture.opponent || 'Opponent TBC') + ' on ' + fixture.fixture_date + '. Define what the scout must test before attending.',
              actionLabel: 'Plan observation',
              actionUrl: '/scout/fixtures?fixture=' + encodeURIComponent(fixture.id) + '&player=' + encodeURIComponent(player.id)
            });
          }
        });
      });
    }
  }

  const unique = [];
  const keys = new Set();
  actions.sort((a, b) => b.priority - a.priority).forEach(action => {
    const key = action.kind + ':' + (action.playerId || '') + ':' + (action.fixtureId || '');
    if (!keys.has(key)) { keys.add(key); unique.push(action); }
  });
  if (!unique.length) {
    unique.push({
      kind: 'explore', priority: 1, title: 'No next steps right now',
      body: 'There are no overdue or evidence-led actions. Explore the player database to identify the next recruitment target.',
      actionLabel: 'Explore player database', actionUrl: '/scout/player-search'
    });
  }
  return unique.slice(0, 6);
}

router.use(requireAuth, requireRole('Scout'));

router.get('/dashboard', async (req, res) => {
  try {
    const context = await contextFor(req);
    const players = await allPlayers(context);
    const needs = teamNeeds(context, players);
    const usage = await usageSnapshot(context);
    const actions = await dashboardActions(context, players);
    const top = players.slice().sort((a, b) => number(b.compatibilityScore) - number(a.compatibilityScore))[0] || null;
    res.json({
      playerCount: players.length,
      usage,
      teamNeeds: needs,
      nextActions: actions,
      topFit: top ? {
        player: top,
        score: top.compatibilityScore,
        reason: 'This player leads the current recruitment brief after team need, role, tactical style, formation, development and evidence signals are evaluated together.'
      } : null
    });
  } catch (error) {
    console.error('[Scout dashboard v6.4]', error);
    res.status(error.status || 500).json({ error: error.message || 'The dashboard could not be loaded.' });
  }
});

router.get('/team-members', async (req, res) => {
  try {
    const context = await contextFor(req);
    let query = supabase.from('scouts').select('id,first_name,last_name,club_name,is_super_user').eq('is_active', true);
    query = context.scout.scout_team_id
      ? query.eq('scout_team_id', context.scout.scout_team_id)
      : query.eq('id', context.scout.id);
    const { data, error } = await query.order('first_name', { ascending: true });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Team scouts could not be loaded.' });
  }
});

const CONTEXTS = {
  immediate_starter: {
    label: 'Immediate starter',
    weights: { readiness: .22, compatibility: .18, positionFit: .16, matchOutput: .14, evidence: .12, risk: .10, potential: .04, financial: .04 }
  },
  development_prospect: {
    label: 'Development prospect',
    weights: { potential: .27, development: .18, compatibility: .14, positionFit: .10, evidence: .10, financial: .10, readiness: .06, risk: .05 }
  },
  high_press: {
    label: 'High-press role',
    weights: { pressing: .30, readiness: .15, compatibility: .14, positionFit: .12, evidence: .10, matchOutput: .09, risk: .06, potential: .04 }
  },
  possession: {
    label: 'Possession role',
    weights: { possession: .30, compatibility: .16, positionFit: .14, readiness: .12, evidence: .10, matchOutput: .08, risk: .06, potential: .04 }
  },
  low_financial_risk: {
    label: 'Low financial risk',
    weights: { financial: .28, risk: .20, evidence: .16, readiness: .12, compatibility: .10, positionFit: .06, potential: .05, matchOutput: .03 }
  },
  squad_depth: {
    label: 'Squad depth',
    weights: { versatility: .22, readiness: .18, positionFit: .16, compatibility: .15, evidence: .12, financial: .08, risk: .06, potential: .03 }
  }
};

function comparisonCategories(player, targetPosition, budget) {
  const overall = player.overallBreakdown || {};
  const positions = player.positionRatings || {};
  const ratings = positions.ratings || {};
  const target = String(targetPosition || playerPosition(player)).toUpperCase();
  const value = Math.max(1, number(player.transfer_value));
  const maxBudget = Math.max(1, number(budget, value));
  const affordability = Math.max(0, Math.min(100, 100 - Math.max(0, value - maxBudget) / maxBudget * 100));
  const facts = player._facts || [];
  const evidence = facts.length >= 10 ? 90 : facts.length >= 5 ? 72 : facts.length ? 48 : 32;
  const risks = list(player.compatibility?.risks || player.compatibilityBreakdown?.risks).length;
  const attrs = key => score(player[key]);
  return {
    compatibility: score(player.compatibilityScore),
    readiness: score(overall.currentReadiness || overall.finalScore || player.overall_rating),
    potential: score(overall.potentialRating || player.potential_rating || player.overall_rating),
    development: average([score(overall.potentialRating || player.overall_rating), attrs('composure'), attrs('stamina')]),
    positionFit: score(ratings[target] || positions.bestCurrentScore || player.overall_rating),
    matchOutput: score(overall.matchOutputScore || overall.matchOutput || player.overall_rating),
    evidence,
    risk: Math.max(0, 100 - risks * 13 - Math.max(0, 60 - evidence) * .4),
    financial: average([affordability, score(player.compatibilityScore), score(overall.potentialRating || player.overall_rating)]),
    pressing: average([attrs('stamina'), attrs('pace'), attrs('defending'), attrs('positioning'), attrs('composure')]),
    possession: average([attrs('passing'), attrs('vision'), attrs('dribbling'), attrs('composure'), attrs('positioning')]),
    versatility: Math.min(100, 42 + list(player.positions).length * 12 + (positions.sorted?.length || 0) * 3)
  };
}

function weighted(categories, context) {
  return round(Object.entries(context.weights).reduce((total, [key, weight]) => total + number(categories[key]) * weight, 0), 1);
}

router.post('/compare', async (req, res) => {
  try {
    const context = await contextFor(req);
    const playerAId = req.body.playerAId;
    const playerBId = req.body.playerBId;
    if (!playerAId || !playerBId || playerAId === playerBId) {
      return res.status(400).json({ error: 'Choose two different players.' });
    }
    const players = await allPlayers(context);
    const a = players.find(player => String(player.id) === String(playerAId));
    const b = players.find(player => String(player.id) === String(playerBId));
    if (!a || !b) return res.status(404).json({ error: 'One or both players could not be loaded.' });
    const selected = CONTEXTS[req.body.contextKey] || CONTEXTS.immediate_starter;
    const categoriesA = comparisonCategories(a, req.body.targetPosition, req.body.budget);
    const categoriesB = comparisonCategories(b, req.body.targetPosition, req.body.budget);
    const totalA = weighted(categoriesA, selected);
    const totalB = weighted(categoriesB, selected);
    const winner = totalA === totalB ? 'tie' : totalA > totalB ? 'a' : 'b';
    const keys = Object.keys(selected.weights);
    const rows = keys.map(key => ({
      category: key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase()),
      key,
      weight: selected.weights[key],
      playerA: round(categoriesA[key], 1),
      playerB: round(categoriesB[key], 1),
      winner: categoriesA[key] === categoriesB[key] ? 'Tie' : categoriesA[key] > categoriesB[key] ? playerName(a) : playerName(b),
      margin: round(Math.abs(categoriesA[key] - categoriesB[key]), 1)
    }));
    const winnerPlayer = winner === 'a' ? a : winner === 'b' ? b : null;
    const result = {
      context: { key: req.body.contextKey || 'immediate_starter', label: selected.label, weights: selected.weights },
      playerA: { player: a, totalScore: totalA, categories: categoriesA },
      playerB: { player: b, totalScore: totalB, categories: categoriesB },
      winner,
      winnerPlayerId: winnerPlayer?.id || null,
      decisionScoreMargin: round(Math.abs(totalA - totalB), 1),
      categories: rows,
      recommendation: winnerPlayer
        ? playerName(winnerPlayer) + ' is the stronger option for the ' + selected.label.toLowerCase() + ' context. The recommendation changes when the decision context changes because the category weights change.'
        : 'The players are level in the selected context. Use live evidence and the most important category trade-offs to make the decision.',
      tradeOff: rows.slice().sort((x, y) => y.margin * y.weight - x.margin * x.weight).slice(0, 3)
        .map(row => row.category + ': ' + row.winner + ' leads by ' + row.margin + '.').join(' ')
    };
    res.json({ result });
  } catch (error) {
    console.error('[Scout comparison v6.4]', error);
    res.status(error.status || 500).json({ error: error.message || 'The comparison could not be completed.' });
  }
});

module.exports = router;
