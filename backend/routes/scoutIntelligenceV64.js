'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer } = require('../engines/compatibility');
const { applyRealDataFilter, isDemoSession } = require('../utils/demo');
const { getScoutUsageSnapshot } = require('../utils/scoutUsage');
function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function score(value, fallback = 50) {
    let n = number(value, fallback);
    if (n > 0 && n <= 10)
        n *= 10;
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
    if (Array.isArray(value))
        return value.filter(Boolean);
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
async function loadScoutTeam(scout) {
    if (!scout?.scout_team_id) {
        return {};
    }

    const { data, error } = await supabase
        .from('scout_teams')
        .select('*')
        .eq('id', scout.scout_team_id)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || {};
}

function preferenceMaterialScore(scout) {
    const prefs = scout?.scout_preferences || {};
    const arrayKeys = [
        'teamWeaknesses',
        'roleExpectations',
        'longTermGoals',
        'preferredPositions',
        'ageGroups'
    ];

    const arrayScore = arrayKeys.reduce((total, key) => {
        return total + list(prefs[key]).length;
    }, 0);

    return arrayScore +
        (prefs.formation ? 1 : 0) +
        (prefs.playingStyle ? 1 : 0) +
        (prefs.scoutRegion ? 1 : 0);
}

async function contextFor(req) {
    const { data: scout, error } = await supabase
        .from('scouts')
        .select('*')
        .eq('id', req.user.id)
        .single();

    if (error || !scout) {
        const issue = new Error('Scout account not found.');
        issue.status = 404;
        throw issue;
    }

    const team = await loadScoutTeam(scout);

    return {
        req,
        scout,
        team,
        prefs: scout.scout_preferences || {},
        publicDemo: false
    };
}

async function publicDemoContext() {
    const { data: scouts, error } = await supabase
        .from('scouts')
        .select('*')
        .eq('is_demo', true)
        .eq('is_active', true)
        .limit(50);

    if (error) {
        throw error;
    }

    const scout = (scouts || [])
        .slice()
        .sort((a, b) => {
            const scoreDifference =
                preferenceMaterialScore(b) -
                preferenceMaterialScore(a);

            if (scoreDifference) {
                return scoreDifference;
            }

            return String(a.email || '').localeCompare(
                String(b.email || '')
            );
        })[0];

    if (!scout) {
        const issue = new Error('The Scout demo account could not be loaded.');
        issue.status = 404;
        throw issue;
    }

    const team = await loadScoutTeam(scout);

    return {
        req: null,
        scout,
        team,
        prefs: scout.scout_preferences || {},
        publicDemo: true
    };
}

async function allPlayers(context) {
    const playerSelect = [
        'id', 'player_id', 'first_name', 'last_name',
        'age', 'age_group', 'nationality', 'position_group',
        'specific_position', 'primary_position', 'positions', 'foot',
        'height_category', 'height_range_cm', 'build_category', 'weight_range_kg',
        'team_id', 'team_name', 'appearances', 'goals', 'assists',
        'clean_sheets', 'yellow_cards', 'red_cards', 'pace', 'agility',
        'strength', 'stamina', 'jumping', 'composure', 'shooting',
        'passing', 'dribbling', 'defending', 'crossing', 'vision',
        'positioning', 'heading', 'tackling', 'gk_diving', 'gk_handling',
        'gk_kicking', 'gk_reflexes', 'gk_positioning', 'gk_distribution',
        'gk_communication', 'gk_sweeping', 'overall_rating',
        'transfer_value', 'predicted_salary_weekly',
        'avatar_config', 'is_active', 'is_demo', 'created_at', 'updated_at'
    ].join(',');
    let query = supabase
        .from('players')
        .select(playerSelect)
        .order('overall_rating', { ascending: false })
        .limit(300);
    if (context.publicDemo) {
        query = query
            .eq('is_demo', true)
            .eq('is_active', true);
    }
    else {
        if (!isDemoSession(context.req)) {
            query = query.eq('is_active', true);
        }
        query = applyRealDataFilter(query, context.req);
    }
    const { data, error } = await query;
    if (error)
        throw error;
    const players = data || [];
    const playerIds = players.map(player => player.id);
    const teamIds = [...new Set(players.map(player => player.team_id).filter(Boolean))];
    const [factsResult, teamsResult] = await Promise.all([
        playerIds.length
            ? supabase.from('match_facts').select('*').in('player_id', playerIds).order('match_date', { ascending: false }).limit(2000)
            : Promise.resolve({ data: [], error: null }),
        teamIds.length
            ? supabase.from('school_academy_teams').select('id,team_name,city,county,country,league_name,league_fulltime_url,team_website_url').in('id', teamIds)
            : Promise.resolve({ data: [], error: null })
    ]);
    if (factsResult.error)
        throw factsResult.error;
    if (teamsResult.error)
        throw teamsResult.error;
    const factsByPlayer = {};
    (factsResult.data || []).forEach(fact => {
        factsByPlayer[fact.player_id] = factsByPlayer[fact.player_id] || [];
        if (factsByPlayer[fact.player_id].length < 20)
            factsByPlayer[fact.player_id].push(fact);
    });
    const teamsById = Object.fromEntries((teamsResult.data || []).map(team => [team.id, team]));
    return players.map(player => {
        const facts = factsByPlayer[player.id] || [];
        const analysis = analysePlayer(player, context.team, facts, context.prefs);
        const team = teamsById[player.team_id] || null;
        const evidenceScore = facts.length >= 10 ? 90 : facts.length >= 5 ? 72 : facts.length ? 48 : 32;
        return {
            ...player,
            team,
            team_city: team?.city || team?.county || null,
            team_country: team?.country || null,
            team_website_url: team?.team_website_url || null,
            league_fulltime_url: team?.league_fulltime_url || null,
            league_name: team?.league_name || null,
            compatibilityScore: round(analysis.compatibilityScore, 1),
            compatibility: analysis.compatibility || {},
            compatibilityBreakdown: analysis.compatibilityBreakdown || {},
            overallBreakdown: analysis.overallBreakdown || {},
            positionRatings: analysis.positionRatings || {},
            dataConfidence: analysis.dataConfidence || analysis.compatibilityBreakdown?.dataConfidence || null,
            evidence_score: evidenceScore,
            _analysis: analysis,
            _facts: facts
        };
    });
}
function firstMaterialList(...values) {
    for (const value of values) {
        const items = list(value)
            .map(item => text(item))
            .filter(Boolean);

        if (items.length) {
            return [...new Set(items)];
        }
    }

    return [];
}

function needValues(context) {
    const prefs = context.prefs || {};
    const team = context.team || {};
    const setup = prefs.setup || prefs.recruitmentBrief || {};

    return {
        weaknesses: firstMaterialList(
            prefs.teamWeaknesses,
            prefs.team_weaknesses,
            setup.teamWeaknesses,
            setup.team_weaknesses,
            team.team_weaknesses
        ),
        roles: firstMaterialList(
            prefs.roleExpectations,
            prefs.role_expectations,
            setup.roleExpectations,
            setup.role_expectations,
            team.role_expectations
        ),
        goals: firstMaterialList(
            prefs.longTermGoals,
            prefs.long_term_goals,
            setup.longTermGoals,
            setup.long_term_goals,
            team.long_term_goals
        ),
        positions: firstMaterialList(
            prefs.preferredPositions,
            prefs.preferred_positions,
            setup.preferredPositions,
            setup.preferred_positions,
            team.preferred_positions
        ),
        ages: firstMaterialList(
            prefs.ageGroups,
            prefs.age_groups,
            setup.ageGroups,
            setup.age_groups,
            team.age_groups
        )
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
    if (type === 'ages')
        return String(player.age_group).toUpperCase() === String(need).toUpperCase();
    if (containsAny(n, ['pace', 'speed', 'transition', 'wide']))
        return average([a('pace'), a('agility'), a('stamina')]) >= 65;
    if (containsAny(n, ['physical', 'strength', 'aerial', 'resilience']))
        return average([a('strength'), a('jumping'), a('stamina')]) >= 65;
    if (containsAny(n, ['defen', 'ball-winning', 'tackle', 'screen']))
        return average([a('defending'), a('tackling'), a('positioning')]) >= 65;
    if (containsAny(n, ['evidence', 'match fact', 'data confidence', 'proof']))
        return number(player.evidence_score) >= 60 || list(player._facts).length >= 5;
    if (containsAny(n, ['creative', 'vision', 'passing', 'retention', 'pressure']))
        return average([a('passing'), a('vision'), a('dribbling'), a('composure')]) >= 65;
    if (containsAny(n, ['goal', 'offensive', 'finish', 'attack']))
        return average([a('shooting'), a('positioning'), a('composure')]) >= 65;
    if (containsAny(n, ['leadership', 'communication', 'coachability', 'decision']))
        return average([a('composure'), a('positioning'), score(compatibility.roleFit)]) >= 65;
    if (containsAny(n, ['financial', 'resale', 'value', 'risk']))
        return score(player.overall_rating) >= 65 && number(player.transfer_value) <= 100000;
    if (containsAny(n, ['readiness', 'maturity', 'pathway', 'development', 'growth', 'potential'])) {
        const overall = analysis.overallBreakdown || {};
        return average([
            score(overall.currentReadiness || player.overall_rating),
            score(overall.potentialRating || player.overall_rating),
            score(compatibility.developmentPathwayFit)
        ]) >= 65;
    }
    if (containsAny(n, ['tactical', 'formation', 'role']))
        return average([score(compatibility.roleFit), score(compatibility.tacticalStyleFit), score(compatibility.formationPositionFit)]) >= 65;
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
    return getScoutUsageSnapshot(context);
}

async function activePipelineCount(context) {
    const { count, error } = await supabase
        .from('recruitment_pipeline')
        .select('id', { count: 'exact', head: true })
        .eq('scout_id', context.scout.id)
        .eq('is_active', true);

    if (error) {
        console.warn('[Scout active pipeline count]', error.message);
        return 0;
    }

    return count || 0;
}

async function dashboardActions(context, players) {
    const { data: pipelineRows, error: pipelineError } = await supabase
        .from('recruitment_pipeline')
        .select('id,player_id,stage,updated_at,created_at,next_action,next_action_due_at,assigned_scout_id,is_active')
        .eq('scout_id', context.scout.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: true });

    if (pipelineError) {
        throw pipelineError;
    }

    const pipeline = pipelineRows || [];
    const byId = Object.fromEntries(players.map(player => [player.id, player]));
    const actions = [];
    const now = Date.now();

    function profileUrl(playerId, anchor) {
        return '/player/profile?id=' + encodeURIComponent(playerId) + (anchor || '');
    }

    function stageAction(row, player) {
        const stage = String(row.stage || '').toLowerCase();

        if (stage === 'trial_pending') {
            return {
                kind: 'trial_preparation',
                priority: 76,
                playerId: player.id,
                pipelineId: row.id,
                title: 'Prepare the next trial step for ' + playerName(player),
                body: 'This player is trial pending. Confirm the observation objective, evidence gap and decision owner before the next football action.',
                actionLabel: 'Open player plan',
                actionUrl: profileUrl(player.id, '#decisionSummary')
            };
        }

        if (stage === 'shortlisted') {
            return {
                kind: 'shortlist_review',
                priority: 62,
                playerId: player.id,
                pipelineId: row.id,
                title: 'Review the shortlist decision for ' + playerName(player),
                body: 'The player is shortlisted but no later recruitment action is recorded. Review the evidence and decide the next step.',
                actionLabel: 'Review player',
                actionUrl: profileUrl(player.id, '#decisionSummary')
            };
        }

        if (stage === 'watching' || stage === 'monitoring') {
            return {
                kind: 'watchlist_review',
                priority: 56,
                playerId: player.id,
                pipelineId: row.id,
                title: 'Review the latest evidence for ' + playerName(player),
                body: 'This player is being monitored. Check whether new evidence changes the recruitment position.',
                actionLabel: 'Review evidence',
                actionUrl: profileUrl(player.id, '#evidence')
            };
        }

        return {
            kind: 'pipeline_review',
            priority: 50,
            playerId: player.id,
            pipelineId: row.id,
            title: 'Review ' + playerName(player) + ' in the pipeline',
            body: 'A recruitment interest is active but the next decision step has not been recorded.',
            actionLabel: 'Open pipeline item',
            actionUrl: '/scout/pipeline?focus=' + encodeURIComponent(row.id)
        };
    }

    for (const row of pipeline) {
        const player = byId[row.player_id];

        if (!player) {
            continue;
        }

        const candidates = [];
        const updatedAt = new Date(row.updated_at || row.created_at || 0).getTime();
        const daysSinceUpdate = Number.isFinite(updatedAt)
            ? Math.max(0, Math.floor((now - updatedAt) / 86400000))
            : 0;
        const dueAt = row.next_action_due_at
            ? new Date(row.next_action_due_at).getTime()
            : null;

        if (dueAt && Number.isFinite(dueAt) && dueAt <= now) {
            candidates.push({
                kind: 'overdue_action',
                priority: 100,
                playerId: player.id,
                pipelineId: row.id,
                title: playerName(player) + ' has an overdue next action',
                body: row.next_action
                    ? 'Overdue action: ' + row.next_action
                    : 'A recorded pipeline action is overdue and needs an owner or outcome.',
                actionLabel: 'Open overdue action',
                actionUrl: '/scout/pipeline?focus=' + encodeURIComponent(row.id)
            });
        }

        if (daysSinceUpdate >= 14) {
            candidates.push({
                kind: 'pipeline_stagnation',
                priority: 88,
                playerId: player.id,
                pipelineId: row.id,
                title: playerName(player) + ' needs a pipeline decision',
                body: 'This player has remained in ' + (row.stage || 'the pipeline') + ' for ' + daysSinceUpdate + ' days without a recorded progression step.',
                actionLabel: 'Review pipeline',
                actionUrl: '/scout/pipeline?focus=' + encodeURIComponent(row.id)
            });
        }

        const factCount = Array.isArray(player._facts) ? player._facts.length : 0;

        if (factCount < 5) {
            candidates.push({
                kind: 'evidence_gap',
                priority: 72,
                playerId: player.id,
                pipelineId: row.id,
                title: playerName(player) + ' needs stronger evidence',
                body: 'Only ' + factCount + ' recorded Match Fact' + (factCount === 1 ? '' : 's') + ' currently support this recruitment decision. Plan a focused observation or request more evidence.',
                actionLabel: 'Review evidence',
                actionUrl: profileUrl(player.id, '#evidence')
            });
        }

        candidates.push(stageAction(row, player));
        candidates.sort((a, b) => b.priority - a.priority);
        actions.push(candidates[0]);
    }

    const teamIds = [...new Set(
        pipeline
            .map(row => byId[row.player_id] && byId[row.player_id].team_id)
            .filter(Boolean)
    )];

    if (teamIds.length) {
        const today = new Date().toISOString().slice(0, 10);
        const fixturesResult = await supabase
            .from('fixtures')
            .select('*')
            .in('team_id', teamIds)
            .gte('fixture_date', today)
            .order('fixture_date', { ascending: true })
            .limit(100);

        if (!fixturesResult.error) {
            const planResult = await supabase
                .from('scout_fixture_plans')
                .select('fixture_id,player_id')
                .eq('scout_id', context.scout.id);
            const planned = new Set(
                (planResult.data || []).map(plan => plan.fixture_id + ':' + (plan.player_id || ''))
            );

            (fixturesResult.data || []).slice(0, 20).forEach(fixture => {
                pipeline
                    .filter(row => byId[row.player_id] && byId[row.player_id].team_id === fixture.team_id)
                    .forEach(row => {
                        const player = byId[row.player_id];
                        const planKey = fixture.id + ':' + player.id;

                        if (!planned.has(planKey)) {
                            actions.push({
                                kind: 'upcoming_fixture',
                                priority: 82,
                                playerId: player.id,
                                fixtureId: fixture.id,
                                title: playerName(player) + ' has an upcoming match',
                                body: (fixture.opponent_name || fixture.opponent || 'Opponent TBC') + ' on ' + fixture.fixture_date + '. Define the live evidence objective before attending.',
                                actionLabel: 'Plan observation',
                                actionUrl: '/scout/fixtures?fixture=' + encodeURIComponent(fixture.id) + '&player=' + encodeURIComponent(player.id)
                            });
                        }
                    });
            });
        }
    }

    const unique = [];
    const playerKeys = new Set();

    actions
        .sort((a, b) => b.priority - a.priority)
        .forEach(action => {
            const playerKey = action.playerId || action.kind + ':' + (action.fixtureId || '');

            if (!playerKeys.has(playerKey)) {
                playerKeys.add(playerKey);
                unique.push(action);
            }
        });

    if (!unique.length && pipeline.length) {
        unique.push({
            kind: 'pipeline_review',
            priority: 20,
            title: 'Review the active recruitment pipeline',
            body: pipeline.length + ' active player interest' + (pipeline.length === 1 ? '' : 's') + ' need a confirmed next decision step.',
            actionLabel: 'Open pipeline',
            actionUrl: '/scout/pipeline'
        });
    }

    if (!unique.length) {
        unique.push({
            kind: 'explore',
            priority: 1,
            title: 'No next steps right now',
            body: 'There are no active pipeline actions. Explore the player database to identify the next recruitment target.',
            actionLabel: 'Explore player database',
            actionUrl: '/scout/player-search'
        });
    }

    return unique.slice(0, 6);
}
async function buildDashboardPayload(context) {
    const players = await allPlayers(context);
    const needs = teamNeeds(context, players);

    const [usage, actions, pipelineCount] = await Promise.all([
        usageSnapshot(context),
        dashboardActions(context, players),
        activePipelineCount(context)
    ]);

    const ordered = players
        .slice()
        .sort((a, b) => number(b.compatibilityScore) - number(a.compatibilityScore));

    const top = ordered[0] || null;

    return {
        playerCount: players.length,
        playersInSystem: players.length,
        activePipelineCount: pipelineCount,
        topMatches: ordered.slice(0, 5),
        brief: needValues(context),
        setupComplete: needs.length > 0,
        usage,
        teamNeeds: needs,
        nextActions: actions,
        topFit: top
            ? {
                player: top,
                score: top.compatibilityScore,
                reason: 'This player leads the current recruitment brief after team need, role, tactical style, formation, development and evidence signals are evaluated together.'
            }
            : null
    };
}

router.get('/public-demo/dashboard', async (req, res) => {
    try {
        const context = await publicDemoContext();
        const payload = await buildDashboardPayload(context);

        res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
        res.json(payload);
    }
    catch (error) {
        console.error('[Public Scout dashboard]', error);
        res.status(error.status || 500).json({
            error: error.message || 'The demo dashboard could not be loaded.'
        });
    }
});


router.get('/public-demo/usage', async (req, res) => {
    try {
        const context = await publicDemoContext();
        const usage = await usageSnapshot(context);

        res.set('Cache-Control', 'no-store');
        res.json({ usage });
    }
    catch (error) {
        console.error('[Public Scout usage]', error);
        res.status(error.status || 500).json({
            error: error.message || 'The demo usage totals could not be loaded.'
        });
    }
});

router.post('/public-demo/compare', async (req, res) => {
    try {
        const context = await publicDemoContext();
        const result = await buildComparisonResult(context, req.body || {});
        res.json({ result });
    }
    catch (error) {
        console.error('[Public Scout comparison]', error);
        res.status(error.status || 500).json({
            error: error.message || 'The demo comparison could not be completed.'
        });
    }
});

router.use(requireAuth, requireRole('Scout'));

router.get('/usage', async (req, res) => {
    try {
        const context = await contextFor(req);
        const usage = await usageSnapshot(context);

        res.set('Cache-Control', 'no-store');
        res.json({ usage });
    }
    catch (error) {
        console.error('[Scout usage]', error);
        res.status(error.status || 500).json({
            error: error.message || 'The Scout usage totals could not be loaded.'
        });
    }
});

router.get('/players', async (req, res) => {
    try {
        const context = await contextFor(req);
        const players = await allPlayers(context);
        res.json({
            data: players,
            total: players.length,
            source: 'supabase'
        });
    }
    catch (error) {
        console.error('[Scout players v6.6]', error);
        res.status(error.status || 500).json({
            error: error.message || 'Players could not be loaded.'
        });
    }
});
router.get('/dashboard', async (req, res) => {
    try {
        const context = await contextFor(req);
        const payload = await buildDashboardPayload(context);
        res.json(payload);
    }
    catch (error) {
        console.error('[Scout dashboard v6.7]', error);
        res.status(error.status || 500).json({
            error: error.message || 'The dashboard could not be loaded.'
        });
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
        if (error)
            throw error;
        res.json({ data: data || [] });
    }
    catch (error) {
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
    specific_tactical_role: {
        label: 'Specific tactical role',
        weights: { positionFit: .28, compatibility: .18, possession: .13, pressing: .13, readiness: .10, evidence: .08, risk: .06, potential: .04 }
    },
    resale_upside: {
        label: 'Resale upside',
        weights: { potential: .24, development: .20, financial: .18, compatibility: .12, evidence: .10, positionFit: .07, risk: .05, readiness: .04 }
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
async function buildComparisonResult(context, body) {
    const playerAId = body.playerAId;
    const playerBId = body.playerBId;

    if (!playerAId || !playerBId || String(playerAId) === String(playerBId)) {
        const issue = new Error('Choose two different players.');
        issue.status = 400;
        throw issue;
    }

    const players = await allPlayers(context);
    const playerA = players.find(player => String(player.id) === String(playerAId));
    const playerB = players.find(player => String(player.id) === String(playerBId));

    if (!playerA || !playerB) {
        const issue = new Error('One or both players could not be loaded.');
        issue.status = 404;
        throw issue;
    }

    const selected = CONTEXTS[body.contextKey] || CONTEXTS.immediate_starter;
    const categoriesA = comparisonCategories(playerA, body.targetPosition, body.budget);
    const categoriesB = comparisonCategories(playerB, body.targetPosition, body.budget);
    const totalA = weighted(categoriesA, selected);
    const totalB = weighted(categoriesB, selected);
    const winner = totalA === totalB ? 'tie' : totalA > totalB ? 'a' : 'b';

    const rows = Object.keys(selected.weights).map(key => ({
        category: key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, character => character.toUpperCase()),
        key,
        weight: selected.weights[key],
        playerA: round(categoriesA[key], 1),
        playerB: round(categoriesB[key], 1),
        winner: categoriesA[key] === categoriesB[key]
            ? 'Tie'
            : categoriesA[key] > categoriesB[key]
                ? playerName(playerA)
                : playerName(playerB),
        margin: round(Math.abs(categoriesA[key] - categoriesB[key]), 1)
    }));

    const winnerPlayer = winner === 'a'
        ? playerA
        : winner === 'b'
            ? playerB
            : null;

    return {
        context: {
            key: body.contextKey || 'immediate_starter',
            label: selected.label,
            weights: selected.weights
        },
        playerA: {
            player: playerA,
            totalScore: totalA,
            categories: categoriesA
        },
        playerB: {
            player: playerB,
            totalScore: totalB,
            categories: categoriesB
        },
        winner,
        winnerPlayerId: winnerPlayer?.id || null,
        decisionScoreMargin: round(Math.abs(totalA - totalB), 1),
        categories: rows,
        recommendation: winnerPlayer
            ? playerName(winnerPlayer) +
                ' is the stronger option for the ' +
                selected.label.toLowerCase() +
                ' context. The recommendation changes when the decision context changes because the category weights change.'
            : 'The players are level in the selected context. Use live evidence and the most important category trade-offs to make the decision.',
        tradeOff: rows
            .slice()
            .sort((a, b) => b.margin * b.weight - a.margin * a.weight)
            .slice(0, 3)
            .map(row => row.category + ': ' + row.winner + ' leads by ' + row.margin + '.')
            .join(' '),
        changeFactors: [
            'Additional recent Match Facts can change evidence confidence and readiness.',
            'Changing the decision context changes the category weights and may change the recommendation.',
            'A different target position or budget changes position-fit and financial-fit scores.'
        ]
    };
}

router.post('/compare', async (req, res) => {
    try {
        const context = await contextFor(req);
        const result = await buildComparisonResult(context, req.body || {});
        res.json({ result });
    }
    catch (error) {
        console.error('[Scout comparison v6.7]', error);
        res.status(error.status || 500).json({
            error: error.message || 'The comparison could not be completed.'
        });
    }
});

const CHAT_THREAD_SELECT = '*,players(id,first_name,last_name,team_name,specific_position,primary_position,age_group),coaches(id,first_name,last_name,team_name),scouts(id,first_name,last_name,club_name)';
async function scoutChatThread(threadId, scoutId) {
    const { data, error } = await supabase.from('chat_threads').select(CHAT_THREAD_SELECT).eq('id', threadId).eq('scout_id', scoutId).maybeSingle();
    if (error)
        throw error;
    if (!data) {
        const issue = new Error('Player conversation not found.');
        issue.status = 404;
        throw issue;
    }
    return data;
}
async function pipelinePlayerForChat(scoutId, playerId) {
    const { data, error } = await supabase.from('recruitment_pipeline')
        .select('id,player_id,scout_id,is_active,players(id,first_name,last_name,team_id,team_name,assigned_coach_id,specific_position,primary_position,age_group)')
        .eq('scout_id', scoutId).eq('player_id', playerId).eq('is_active', true).maybeSingle();
    if (error)
        throw error;
    return data || null;
}
async function coachForChatPlayer(player) {
    if (player.assigned_coach_id) {
        const direct = await supabase.from('coaches').select('id,first_name,last_name,team_name').eq('id', player.assigned_coach_id).maybeSingle();
        if (direct.data)
            return direct.data;
    }
    let query = supabase.from('coaches').select('id,first_name,last_name,team_name,is_super_user').eq('is_active', true);
    if (player.team_id)
        query = query.eq('team_id', player.team_id);
    else
        query = query.eq('team_name', player.team_name);
    const result = await query.order('is_super_user', { ascending: false }).limit(1);
    if (result.error)
        throw result.error;
    return (result.data || [])[0] || null;
}
router.get('/chat/threads', async (req, res) => {
    try {
        const { data, error } = await supabase.from('chat_threads').select(CHAT_THREAD_SELECT).eq('scout_id', req.user.id).not('player_id', 'is', null).order('updated_at', { ascending: false }).limit(100);
        if (error)
            throw error;
        res.json({ data: data || [] });
    }
    catch (error) {
        res.status(500).json({ error: 'Player conversations could not be loaded.' });
    }
});
router.post('/chat/threads', async (req, res) => {
    try {
        const playerId = req.body.playerId;
        if (!playerId)
            return res.status(400).json({ error: 'playerId required' });
        const pipeline = await pipelinePlayerForChat(req.user.id, playerId);
        if (!pipeline || !pipeline.players)
            return res.status(403).json({ error: 'Register interest in this player before messaging their coach.' });
        const coach = await coachForChatPlayer(pipeline.players);
        if (!coach)
            return res.status(404).json({ error: 'No authorised coach is assigned to this player.' });
        const existing = await supabase.from('chat_threads').select(CHAT_THREAD_SELECT).eq('scout_id', req.user.id).eq('coach_id', coach.id).eq('player_id', playerId).maybeSingle();
        if (existing.error)
            throw existing.error;
        if (existing.data)
            return res.json({ thread: existing.data, coach });
        const created = await supabase.from('chat_threads').insert({ scout_id: req.user.id, coach_id: coach.id, player_id: playerId, pipeline_id: pipeline.id, last_message_at: new Date().toISOString() }).select(CHAT_THREAD_SELECT).single();
        if (created.error)
            throw created.error;
        res.status(201).json({ thread: created.data, coach });
    }
    catch (error) {
        res.status(error.status || 500).json({ error: error.message || 'The player conversation could not be opened.' });
    }
});
router.get('/chat/threads/:id/messages', async (req, res) => {
    try {
        await scoutChatThread(req.params.id, req.user.id);
        const result = await supabase.from('chat_messages').select('*').eq('thread_id', req.params.id).order('created_at', { ascending: true });
        if (result.error)
            throw result.error;
        res.json({ data: result.data || [] });
    }
    catch (error) {
        res.status(error.status || 500).json({ error: error.message || 'Messages could not be loaded.' });
    }
});
router.post('/chat/threads/:id/messages', async (req, res) => {
    try {
        const thread = await scoutChatThread(req.params.id, req.user.id);
        const body = text(req.body.body);
        if (!body)
            return res.status(400).json({ error: 'Write a message first.' });
        if (body.length > 4000)
            return res.status(400).json({ error: 'Messages must be 4,000 characters or fewer.' });
        const created = await supabase.from('chat_messages').insert({ thread_id: thread.id, sender_id: req.user.id, sender_type: 'Scout', body, message_kind: 'text', metadata: { playerId: thread.player_id } }).select().single();
        if (created.error)
            throw created.error;
        await supabase.from('chat_threads').update({ last_message_at: created.data.created_at, updated_at: created.data.created_at }).eq('id', thread.id);
        res.status(201).json({ message: created.data });
    }
    catch (error) {
        res.status(error.status || 500).json({ error: error.message || 'The message could not be sent.' });
    }
});
module.exports = router;
