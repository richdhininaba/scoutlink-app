'use strict';

/*
 * Keeps public/Admin demo state aligned with the authoritative V4 engine.
 * Existing session-only demo actions continue to work, while seeded Supabase
 * demo players retain their real overall, evidence, position, prediction and
 * value outputs instead of being replaced by a browser-only approximation.
 */
(function () {
  var authoritative = new Map();
  var attempts = 0;
  var installed = false;
  var baseApi = null;

  function isDemo() {
    try {
      return (typeof window.isDemoMode === 'function' && window.isDemoMode()) ||
        (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) ||
        sessionStorage.getItem('sl_public_demo') === '1' ||
        localStorage.getItem('sl_demo_mode') === '1';
    } catch (_) { return false; }
  }

  function analysisFrom(player) {
    var stored = player.scoring_result && typeof player.scoring_result === 'object'
      ? player.scoring_result : null;
    if (stored && (stored.scoringVersion || stored.overallRating != null)) return stored;
    return {
      scoringVersion:player.scoring_version || 'v4.0.0',
      overallRating:player.overall_rating,
      overallBreakdown:player.overall_breakdown || {},
      positionRatings:player.position_ratings || {},
      predictionDetails:player.prediction_analysis || {},
      valueAnalysis:player.value_analysis || {},
      footballValueIndex:player.value_analysis && player.value_analysis.footballValueIndex,
      transferValue:player.transfer_value,
      transferValueFormatted:player.transfer_value_formatted || null,
      evidenceConfidence:player.evidence_confidence || {},
      warnings:[]
    };
  }

  function remember(players) {
    (players || []).forEach(function (player) {
      if (!player || !player.id) return;
      authoritative.set(String(player.id), {
        player:player,
        analysis:analysisFrom(player)
      });
    });
  }

  function mergePlayer(player) {
    if (!player || !player.id) return player;
    var source = authoritative.get(String(player.id));
    if (!source) return player;
    var compatibility = player.compatibility || player.compatibilityBreakdown || null;
    var compatibilityScore = player.compatibilityScore ?? compatibility?.conservativeScore ?? null;
    var analysis = Object.assign({}, source.analysis, {
      compatibility:compatibility,
      compatibilityBreakdown:compatibility,
      compatibilityScore:compatibilityScore
    });
    return Object.assign({}, player, source.player, {
      overall_rating:analysis.overallRating ?? source.player.overall_rating,
      analysis:analysis,
      overall_breakdown:analysis.overallBreakdown || source.player.overall_breakdown || {},
      position_ratings:analysis.positionRatings || source.player.position_ratings || {},
      evidence_confidence:analysis.evidenceConfidence || source.player.evidence_confidence || {},
      prediction_analysis:analysis.predictionDetails || source.player.prediction_analysis || {},
      value_analysis:analysis.valueAnalysis || source.player.value_analysis || {},
      scoring_result:analysis,
      compatibility:compatibility,
      compatibilityScore:compatibilityScore
    });
  }

  function mergeState(state) {
    if (!state || typeof state !== 'object') return state;
    var next = Object.assign({}, state);
    next.players = (state.players || []).map(mergePlayer);
    next.pipeline = (state.pipeline || []).map(function (item) {
      var id = item.player_id || item.playerId || item.player?.id;
      var player = next.players.find(function (row) { return String(row.id) === String(id); });
      return player ? Object.assign({}, item, { player:player, compatibilityScore:player.compatibilityScore }) : item;
    });
    return next;
  }

  function installStateBridge() {
    if (installed || typeof window.getDemoState !== 'function') return false;
    installed = true;
    var get = window.getDemoState;
    var set = window.setDemoState;
    window.getDemoState = function () { return mergeState(get()); };
    if (typeof set === 'function') {
      window.setDemoState = function (state) { return set(mergeState(state)); };
    }
    return true;
  }

  async function prepare() {
    if (!isDemo() || typeof baseApi !== 'function') return;
    try { await baseApi('GET','/api/scoring/prepare-demo'); } catch (_) {}
    try {
      var response = await baseApi('GET','/api/players/public-demo');
      var players = response.data || response.players || [];
      remember(players);
      installStateBridge();
      if (typeof window.getDemoState === 'function' && typeof window.setDemoState === 'function') {
        var state = window.getDemoState();
        var byId = new Map((state.players || []).map(function (row) { return [String(row.id), row]; }));
        players.forEach(function (player) {
          if (byId.has(String(player.id))) byId.set(String(player.id), Object.assign({}, byId.get(String(player.id)), player));
          else byId.set(String(player.id), player);
        });
        state.players = Array.from(byId.values()).map(mergePlayer);
        window.setDemoState(state);
      }
      document.dispatchEvent(new CustomEvent('scoutlink:demo-v4-authoritative-ready'));
    } catch (_) {}
  }

  function repairActiveProfile() {
    var current = window._profilePlayer;
    if (!current || !current.id) return;
    var merged = mergePlayer(current);
    if (merged !== current) {
      window._profilePlayer = merged;
      window._profileAnalysis = merged.analysis || window._profileAnalysis;
    }
  }

  function init() {
    if (!isDemo()) return;
    if (typeof window.api !== 'function') {
      attempts += 1;
      if (attempts < 150) setTimeout(init, 40);
      return;
    }
    baseApi = window.api.bind(window);
    prepare();
    var bridgeTimer = setInterval(function () {
      installStateBridge();
      repairActiveProfile();
      if (installed && authoritative.size) clearInterval(bridgeTimer);
    }, 80);
    document.addEventListener('scoutlink:profile-ready', repairActiveProfile);
    document.addEventListener('scoutlink:players-rendered', repairActiveProfile);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
}());
