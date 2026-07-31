'use strict';

/**
 * Target path: backend/services/playerScoringService.js
 * Shared data-loading and persistence boundary for scoring v4.
 */

const { supabase } = require('../db/supabase');
const engines = require('../engines');

function mergeTeamSetup(team = null) {
  if (!team) return null;
  const setup = team.scoring_setup && typeof team.scoring_setup === 'object'
    ? team.scoring_setup
    : {};
  return { ...team, ...setup };
}

function scoringInputSnapshot(player = {}, matchHistory = [], team = null, scoutPrefs = {}) {
  return {
    scoringVersion: engines.config.SCORING_VERSION,
    rubricVersion: engines.config.ATTRIBUTE_RUBRIC_VERSION,
    playerId: player.id || null,
    ageGroup: engines.utils.getAgeGroup(player),
    primaryPosition: engines.utils.getPrimaryPosition(player),
    declaredPositions: engines.utils.unique([
      ...engines.utils.normalisePositions(player.positions),
      ...engines.utils.normalisePositions(player.alternative_positions || player.alternativePositions)
    ]),
    attributeAssessmentVersion: player.attribute_assessment_version || player.attributeAssessmentVersion || null,
    attributeAssessedAt: player.attribute_assessed_at || player.attributeAssessedAt || null,
    attributeRatings: player.attribute_ratings || player.attributeRatings || {},
    matchEvidence: (matchHistory || []).map(fact => ({
      id: fact.id || null,
      matchDate: fact.match_date || fact.matchDate || null,
      positionPlayed: fact.position_played || fact.positionPlayed || null,
      minutesPlayed: fact.minutes_played ?? fact.minutesPlayed ?? null,
      sourceType: fact.source_type || fact.sourceType || null,
      rubricVersion: fact.rubric_version || fact.rubricVersion || null
    })),
    teamId: team?.id || null,
    teamScoringSetup: team?.scoring_setup || null,
    scoutPreferences: scoutPrefs || {}
  };
}

function playerPersistencePayload(analysis = {}, snapshot = {}) {
  return {
    overall_rating: analysis.overallRating,
    transfer_value: analysis.transferValue,
    predicted_salary_weekly: analysis.predictedSalaryWeekly,
    overall_breakdown: analysis.overallBreakdown || {},
    position_ratings: analysis.positionRatings || {},
    value_analysis: analysis.valueAnalysis || {},
    evidence_confidence: analysis.evidenceConfidence || {},
    prediction_analysis: analysis.predictionDetails || {},
    scoring_input_snapshot: snapshot,
    scoring_result: analysis,
    scoring_version: engines.config.SCORING_VERSION
  };
}

function compatibilityPersistencePayload(playerId, teamId, analysis = {}) {
  const compatibility = analysis.compatibility;
  if (!compatibility || compatibility.score === null || !teamId) return null;
  return {
    player_id: playerId,
    scout_team_id: teamId,
    compatibility_score: compatibility.conservativeScore,
    conservative_score: compatibility.conservativeScore,
    estimated_score: compatibility.estimatedScore,
    likely_range: compatibility.likelyRange || {},
    position_status: compatibility.positionStatus || null,
    score_ceiling: compatibility.scoreCeiling,
    prediction_score: analysis.predictionScore,
    transfer_value: analysis.transferValue,
    breakdown: compatibility,
    compatibility,
    overall_breakdown: analysis.overallBreakdown || {},
    position_ratings: analysis.positionRatings || {},
    value_analysis: analysis.valueAnalysis || {},
    evidence_confidence: analysis.evidenceConfidence || {},
    calculation_setup: compatibility.setup || {},
    calculation_breakdown: compatibility,
    input_fingerprint: compatibility.inputFingerprint || null,
    scoring_version: engines.config.SCORING_VERSION,
    calculated_at: analysis.calculatedAt || new Date().toISOString()
  };
}

function calculatePlayerAnalysis(player = {}, matchHistory = [], team = null, scoutPrefs = {}, context = {}) {
  const resolvedTeam = mergeTeamSetup(team);
  return engines.analysePlayer(player, resolvedTeam, matchHistory, scoutPrefs, context);
}

async function loadPlayerScoringInputs(playerId, teamId = null, matchLimit = 30) {
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (playerError || !player) {
    const error = new Error('Player not found');
    error.status = 404;
    error.cause = playerError;
    throw error;
  }

  const { data: matchHistory, error: matchError } = await supabase
    .from('match_facts')
    .select('*')
    .eq('player_id', playerId)
    .order('match_date', { ascending: false })
    .limit(Math.max(1, Math.min(Number(matchLimit) || 30, 100)));
  if (matchError) throw matchError;

  let team = null;
  if (teamId) {
    const { data, error: teamError } = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();
    if (teamError) throw teamError;
    team = data || null;
  }
  return { player, matchHistory: matchHistory || [], team };
}

async function persistPlayerAnalysis(playerId, analysis, snapshot) {
  const payload = playerPersistencePayload(analysis, snapshot);
  const { error } = await supabase.from('players').update(payload).eq('id', playerId);
  if (error) throw error;
  return payload;
}

async function persistCompatibilityAnalysis(playerId, teamId, analysis) {
  const payload = compatibilityPersistencePayload(playerId, teamId, analysis);
  if (!payload) return null;
  const { error } = await supabase
    .from('compatibility_scores')
    .upsert(payload, { onConflict: 'player_id,scout_team_id' });
  if (error) throw error;
  return payload;
}

async function recalculatePlayer(playerId, options = {}) {
  const {
    teamId = null,
    scoutPrefs = {},
    persistCompatibility = Boolean(teamId),
    matchLimit = 30,
    context = {}
  } = options;
  const { player, matchHistory, team } = await loadPlayerScoringInputs(playerId, teamId, matchLimit);
  const snapshot = scoringInputSnapshot(player, matchHistory, team, scoutPrefs);
  const analysis = calculatePlayerAnalysis(player, matchHistory, team, scoutPrefs, context);
  await persistPlayerAnalysis(playerId, analysis, snapshot);
  if (persistCompatibility && teamId) {
    await persistCompatibilityAnalysis(playerId, teamId, analysis);
  }
  return analysis;
}

module.exports = {
  mergeTeamSetup,
  scoringInputSnapshot,
  playerPersistencePayload,
  compatibilityPersistencePayload,
  calculatePlayerAnalysis,
  loadPlayerScoringInputs,
  persistPlayerAnalysis,
  persistCompatibilityAnalysis,
  recalculatePlayer
};
