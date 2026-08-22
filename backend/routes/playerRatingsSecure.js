'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { applyRealDataFilter } = require('../utils/demo');
const engines = require('../engines');
const scoringService = require('../services/playerScoringService');
const playerRoutes = require('./players');

const normaliseAttributeRatings = playerRoutes.normaliseAttributeRatings;

const SAFE_PLAYER_SELECT = [
  'id','player_id','first_name','last_name','age','age_group','nationality',
  'position_group','specific_position','primary_position','positions','alternative_positions',
  'foot','height_category','height_range_cm','build_category','weight_range_kg',
  'team_id','team_name','appearances','goals','assists','clean_sheets',
  'yellow_cards','red_cards','availability',
  'pace','agility','strength','stamina','jumping','composure','shooting',
  'passing','dribbling','defending','crossing','vision','positioning','heading','tackling',
  'gk_diving','gk_handling','gk_kicking','gk_reflexes','gk_positioning',
  'gk_distribution','gk_communication','gk_sweeping',
  'attribute_ratings','attribute_rating_scale','attribute_assessment_version','attribute_assessed_at',
  'overall_rating','overall_breakdown','position_ratings','evidence_confidence',
  'prediction_analysis','value_analysis','scoring_result','scoring_version',
  'transfer_value','predicted_salary_weekly','avatar_config',
  'is_active','is_demo','created_at','updated_at'
].join(',');

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function preferenceMaterialScore(scout) {
  const prefs = scout?.scout_preferences || {};
  return [
    'teamWeaknesses',
    'roleExpectations',
    'longTermGoals',
    'preferredPositions',
    'ageGroups'
  ].reduce((total, key) => total + list(prefs[key]).length, 0) +
    (prefs.formation ? 1 : 0) +
    (prefs.playingStyle ? 1 : 0) +
    (prefs.scoutRegion ? 1 : 0);
}

async function loadScoutTeam(scout) {
  if (!scout?.scout_team_id) return {};
  const { data, error } = await supabase
    .from('scout_teams')
    .select('*')
    .eq('id', scout.scout_team_id)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}

async function liveScoutContext(req) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('id,scout_team_id,scout_preferences,interests_remaining')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!scout) throw requestError('Scout account not found.', 404);

  return {
    scout,
    team: await loadScoutTeam(scout),
    prefs: scout.scout_preferences || {}
  };
}

async function publicDemoContext() {
  const { data: scouts, error } = await supabase
    .from('scouts')
    .select('id,email,scout_team_id,scout_preferences,interests_remaining,is_demo,is_active')
    .eq('is_demo', true)
    .eq('is_active', true)
    .limit(50);

  if (error) throw error;

  const scout = (scouts || [])
    .slice()
    .sort((a, b) => {
      const material = preferenceMaterialScore(b) - preferenceMaterialScore(a);
      return material || String(a.email || '').localeCompare(String(b.email || ''));
    })[0];

  if (!scout) throw requestError('The Scout demo account could not be loaded.', 404);

  return {
    scout,
    team: await loadScoutTeam(scout),
    prefs: scout.scout_preferences || {}
  };
}

function evidenceScore(facts) {
  const count = (facts || []).length;
  return count >= 10 ? 90 : count >= 5 ? 72 : count ? 48 : 32;
}

async function searchPlayers(context, req, publicDemo) {
  let query = supabase
    .from('players')
    .select(SAFE_PLAYER_SELECT)
    .eq('is_active', true)
    .order('overall_rating', { ascending: false })
    .limit(300);

  if (publicDemo) {
    query = query.eq('is_demo', true);
  } else {
    query = applyRealDataFilter(query, req);
  }

  const { data: players, error } = await query;
  if (error) throw error;

  const rows = players || [];
  const playerIds = rows.map((player) => player.id);
  const teamIds = [...new Set(rows.map((player) => player.team_id).filter(Boolean))];

  const [factsResult, teamsResult] = await Promise.all([
    playerIds.length
      ? supabase
          .from('match_facts')
          .select('*')
          .in('player_id', playerIds)
          .order('match_date', { ascending: false })
          .limit(2000)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? supabase
          .from('school_academy_teams')
          .select('id,team_name,city,county,country,league_name,league_fulltime_url,team_website_url')
          .in('id', teamIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (factsResult.error) throw factsResult.error;
  if (teamsResult.error) throw teamsResult.error;

  const factsByPlayer = {};
  (factsResult.data || []).forEach((fact) => {
    factsByPlayer[fact.player_id] = factsByPlayer[fact.player_id] || [];
    if (factsByPlayer[fact.player_id].length < 20) {
      factsByPlayer[fact.player_id].push(fact);
    }
  });

  const teamsById = Object.fromEntries(
    (teamsResult.data || []).map((team) => [team.id, team])
  );

  return rows
    .map((player) => {
      const facts = factsByPlayer[player.id] || [];
      const team = teamsById[player.team_id] || null;
      const analysis = scoringService.calculatePlayerAnalysis(
        player,
        facts,
        context.team,
        context.prefs
      );

      return {
        ...player,
        team,
        team_city: team?.city || team?.county || null,
        team_country: team?.country || null,
        team_website_url: team?.team_website_url || null,
        league_fulltime_url: team?.league_fulltime_url || null,
        league_name: team?.league_name || null,
        compatibilityScore: analysis.compatibilityScore,
        compatibility: analysis.compatibility || {},
        compatibilityBreakdown: analysis.compatibilityBreakdown || {},
        overallBreakdown: analysis.overallBreakdown || {},
        positionRatings: analysis.positionRatings || {},
        evidenceConfidence: analysis.evidenceConfidence || null,
        dataConfidence: analysis.dataConfidence || analysis.evidenceConfidence || null,
        valueAnalysis: analysis.valueAnalysis || {},
        evidence_score: evidenceScore(facts),
        _analysis: analysis,
        _facts: facts
      };
    })
    .sort((a, b) => Number(b.compatibilityScore || -1) - Number(a.compatibilityScore || -1));
}

async function scoutPlayerDetail(req, id) {
  let playerQuery = supabase
    .from('players')
    .select(SAFE_PLAYER_SELECT)
    .eq('id', id)
    .eq('is_active', true);

  playerQuery = applyRealDataFilter(playerQuery, req);

  const { data: player, error } = await playerQuery.maybeSingle();
  if (error) throw error;
  if (!player) throw requestError('Player not found.', 404);

  const context = await liveScoutContext(req);

  const [factsResult, teamResult, pipelineResult] = await Promise.all([
    supabase
      .from('match_facts')
      .select('*')
      .eq('player_id', player.id)
      .order('match_date', { ascending: false }),
    player.team_id
      ? supabase
          .from('school_academy_teams')
          .select('id,team_name,league,league_name,league_fulltime_url,team_website_url,city,county,country')
          .eq('id', player.team_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('recruitment_pipeline')
      .select('id,stage,is_active')
      .eq('scout_id', req.user.id)
      .eq('player_id', player.id)
      .eq('is_active', true)
      .maybeSingle()
  ]);

  if (factsResult.error) throw factsResult.error;
  if (teamResult.error) throw teamResult.error;
  if (pipelineResult.error) throw pipelineResult.error;

  const facts = factsResult.data || [];
  const team = teamResult.data || null;
  const analysis = scoringService.calculatePlayerAnalysis(
    player,
    facts,
    context.team,
    context.prefs
  );

  let upcomingFixtures = [];
  if (player.team_id) {
    const { data, error: fixturesError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('team_id', player.team_id)
      .gte('fixture_date', new Date().toISOString().slice(0, 10))
      .order('fixture_date', { ascending: true })
      .limit(20);

    if (fixturesError) throw fixturesError;
    upcomingFixtures = data || [];
  }

  const enriched = {
    ...player,
    team,
    team_city: team?.city || team?.county || null,
    team_country: team?.country || null,
    team_website_url: team?.team_website_url || null,
    league_fulltime_url: team?.league_fulltime_url || null,
    league_name: team?.league_name || null,
    analysis,
    compatibilityScore: analysis.compatibilityScore,
    compatibility: analysis.compatibility || {},
    compatibilityBreakdown: analysis.compatibilityBreakdown || {},
    overallBreakdown: analysis.overallBreakdown || {},
    positionRatings: analysis.positionRatings || {},
    evidenceConfidence: analysis.evidenceConfidence || null,
    dataConfidence: analysis.dataConfidence || analysis.evidenceConfidence || null,
    valueAnalysis: analysis.valueAnalysis || {},
    evidence_score: evidenceScore(facts),
    _analysis: analysis,
    _facts: facts
  };

  return {
    player: enriched,
    team,
    analysis,
    recentMatches: facts,
    matchFacts: facts,
    matches: facts,
    /*
     * Deliberately empty here.
     * Scout video is loaded through GET /api/videos?playerId=... where the
     * videos router enforces moderation_status = approved for Scouts.
     */
    videos: [],
    upcomingFixtures,
    pipelineStatus: pipelineResult.data?.stage || null,
    interestAlreadyRegistered: Boolean(pipelineResult.data),
    interestsRemaining: context.scout.interests_remaining ?? null
  };
}

/*
 * Safe Scout player-search surface.
 *
 * This is mounted before routes/players.js so the Scout frontend can use the
 * real availability field without falling back to the broad select('*') list.
 */
router.get(
  '/scout-search',
  requireAuth,
  requireRole('Scout'),
  async (req, res) => {
    try {
      const context = await liveScoutContext(req);
      const players = await searchPlayers(context, req, false);
      res.set('Cache-Control', 'no-store');
      res.json({
        data: players,
        total: players.length,
        source: 'scout-safe'
      });
    } catch (error) {
      console.error('[Secure Scout player search]', error);
      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Players could not be loaded.'
      });
    }
  }
);

/*
 * Public-demo equivalent of the safe Scout list. Only demo rows and the
 * explicit safe field set are returned.
 */
router.get('/public-demo-scout-search', async (req, res) => {
  try {
    const context = await publicDemoContext();
    const players = await searchPlayers(context, req, true);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    res.json({
      data: players,
      total: players.length,
      source: 'scout-safe-demo'
    });
  } catch (error) {
    console.error('[Secure public Scout player search]', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'The demo players could not be loaded.'
    });
  }
});

/*
 * Rich Scout player detail.
 *
 * This route intentionally does not return player_videos. The frontend loads
 * video through /api/videos, whose Scout branch only returns approved reels.
 */
router.get(
  '/scout-detail/:id',
  requireAuth,
  requireRole('Scout'),
  async (req, res) => {
    try {
      const payload = await scoutPlayerDetail(req, req.params.id);
      res.set('Cache-Control', 'no-store');
      res.json(payload);
    } catch (error) {
      console.error('[Secure Scout player detail]', error);
      res.status(error.status || 500).json({
        error: error.status ? error.message : 'Player profile could not be loaded.'
      });
    }
  }
);

async function coachRecord(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,team_id,team_name,is_super_user')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw requestError('Coach not found', 404);
  return data;
}

function coachMayManagePlayer(coach, player) {
  if (!coach || !player) return false;

  if (!coach.is_super_user) {
    return String(player.assigned_coach_id || '') === String(coach.id);
  }

  if (
    coach.team_id &&
    player.team_id &&
    String(coach.team_id) === String(player.team_id)
  ) {
    return true;
  }

  if (
    !coach.team_id &&
    coach.team_name &&
    player.team_name &&
    String(coach.team_name) === String(player.team_name)
  ) {
    return true;
  }

  return String(player.assigned_coach_id || '') === String(coach.id);
}

/*
 * Compatibility guard for the legacy PATCH /api/players/:id/ratings route.
 *
 * This router is mounted before routes/players.js. The active V6 profile
 * currently saves assessments through PUT /api/players/:id, but older clients
 * can still call this endpoint. Keep it working while applying the same Coach
 * workspace permission rules as the current Player update route.
 */
router.patch(
  '/:id/ratings',
  requireAuth,
  requireRole('Coach','Stratex'),
  async (req, res) => {
    try {
      let query = supabase
        .from('players')
        .select([
          'id','team_id','team_name','assigned_coach_id','position_group',
          'specific_position','primary_position','positions',
          'attribute_ratings','is_active','is_demo'
        ].join(','))
        .eq('id', req.params.id)
        .eq('is_active', true);

      if (req.user.accountType === 'Coach') {
        query = applyRealDataFilter(query, req);
      }

      const { data: player, error } = await query.maybeSingle();
      if (error) throw error;
      if (!player) {
        return res.status(404).json({ error:'Player not found' });
      }

      if (req.user.accountType === 'Coach') {
        const coach = await coachRecord(req.user.id);

        if (!coachMayManagePlayer(coach, player)) {
          return res.status(403).json({
            error:'You can only update players you are permitted to manage.'
          });
        }
      }

      const position = engines.utils.getPrimaryPosition(player);
      const attributeRatings = normaliseAttributeRatings(
        req.body.attributeRatings ||
          req.body.attribute_ratings ||
          {},
        position
      );

      const { error: updateError } = await supabase
        .from('players')
        .update({
          attribute_ratings:attributeRatings,
          attribute_rating_scale:'ten',
          attribute_assessment_version:engines.config.ATTRIBUTE_RUBRIC_VERSION,
          attribute_assessed_at:new Date().toISOString(),
          attribute_assessed_by:req.user.id,
          updated_at:new Date().toISOString()
        })
        .eq('id', player.id);

      if (updateError) throw updateError;

      const analysis =
        await scoringService.recalculatePlayer(player.id);

      const { data: refreshed, error: refreshError } = await supabase
        .from('players')
        .select('*')
        .eq('id', player.id)
        .single();

      if (refreshError) throw refreshError;

      res.json({
        player:refreshed,
        analysis,
        message:'Ratings updated.'
      });
    } catch (error) {
      console.error('[Secure legacy player ratings]', error);
      res.status(error.status || 500).json({
        error:error.status ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;
