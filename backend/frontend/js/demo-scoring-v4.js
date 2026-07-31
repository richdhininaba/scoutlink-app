'use strict';

/*
 * Public and Stratex Admin demo V4 state adapter.
 *
 * Rebuilds any cached V3 demo state into canonical positions, complete
 * position-aware integer ratings and setup-dependent compatibility. It never
 * writes demo changes to Supabase.
 */
(function () {
  var SCHEMA_VERSION = 4;
  var STATE_KEY = 'sl_public_demo_state';
  var client = null;
  var options = null;
  var initAttempts = 0;
  var originalApi = window.api;
  var originalGetDemoState = window.getDemoState;
  var originalSetDemoState = window.setDemoState;

  var POSITION_SEQUENCE = [
    'ST','RW','AM','CB','CM','RB','LW','LB','GK','DM',
    'CF','RWB','LM','LWB','RM'
  ];

  function hash(value) {
    var text = String(value || 'scoutlink');
    var result = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return Math.abs(result >>> 0);
  }

  function whole(value, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    if (number > 10) number /= 10;
    return Math.max(1, Math.min(10, Math.round(number)));
  }

  function nestedCompleteRatings(player, position, index) {
    var group = client.groupForPosition(position);
    var keys = client.attributesForPosition(position, options).map(function (row) { return row[0]; });
    var existing = client.flattenRatings(player.attribute_ratings || player.attributeRatings || {});
    var base = whole(player.overall_rating, 70) / 10;
    if (base < 1) base = 7;
    var flat = {};

    keys.forEach(function (key, attributeIndex) {
      var current = existing[key];
      var seed = hash((player.id || index) + ':' + key);
      var variation = (seed % 5) - 2;
      var rating = current === null || current === undefined || current === ''
        ? Math.round(base + variation * 0.55)
        : whole(current, Math.round(base));
      flat[key] = Math.max(4, Math.min(10, rating));
    });

    return client.nestRatings(flat, group, options);
  }

  function canonicalAgeGroup(value, index) {
    var match = String(value || '').toUpperCase().match(/^U(\d+)$/);
    var number = match ? Number(match[1]) : 12 + (index % 5);
    number = Math.max(7, Math.min(16, number));
    return 'U' + number;
  }

  function upgradePlayer(player, index) {
    var requested = client.normalisePosition(
      player.primary_position || player.specific_position ||
      (Array.isArray(player.positions) ? player.positions[0] : null)
    );
    var position = requested || POSITION_SEQUENCE[index % POSITION_SEQUENCE.length];
    var group = client.groupForPosition(position);
    var ageGroup = canonicalAgeGroup(player.age_group, index);
    var ratings = nestedCompleteRatings(player, position, index);
    var flat = client.flattenRatings(ratings);
    var scores = Object.values(flat).map(Number).filter(Number.isFinite);
    var overall = scores.length
      ? Math.round(scores.reduce(function (sum, score) { return sum + score; }, 0) / scores.length * 10)
      : 60;

    return Object.assign({}, player, {
      id:String(player.id || 'demo-player-' + (index + 1)),
      age:Number(ageGroup.slice(1)),
      age_group:ageGroup,
      position_group:group,
      specific_position:position,
      primary_position:position,
      positions:[position],
      alternative_positions:[],
      attribute_ratings:ratings,
      attribute_rating_scale:'ten',
      attribute_assessment_version:'2026-07-31-ten',
      attribute_assessed_at:player.attribute_assessed_at || new Date().toISOString(),
      overall_rating:overall,
      scoring_version:'v4.0.0',
      avatar_config:undefined
    });
  }

  function normaliseSetup(setup) {
    setup = Object.assign({}, setup || {});
    var target = client.normalisePosition(
      setup.targetPosition || setup.target_position ||
      setup.positionNeeded || setup.position_needed ||
      (Array.isArray(setup.preferredPositions) ? setup.preferredPositions[0] : null)
    ) || 'ST';

    var preferred = (Array.isArray(setup.preferredPositions) ? setup.preferredPositions : [target])
      .map(client.normalisePosition)
      .filter(Boolean);

    return Object.assign({}, setup, {
      teamName:setup.teamName || setup.clubName || 'ScoutLink Demo FC',
      clubName:setup.clubName || setup.teamName || 'ScoutLink Demo FC',
      matchFormat:setup.matchFormat || setup.match_format || '11v11',
      formation:setup.formation || '4-3-3',
      targetPosition:target,
      target_position:target,
      requiredRole:setup.requiredRole || setup.required_role || 'advanced_forward',
      playingStyle:setup.playingStyle || setup.playing_style || 'High Press',
      teamNeeds:setup.teamNeeds || setup.team_needs || setup.teamWeaknesses || ['Increase goal output'],
      developmentPlan:setup.developmentPlan || setup.development_plan || 'Balanced',
      ageGroups:(setup.ageGroups || ['U12','U13','U14','U15','U16'])
        .map(function (age) { return canonicalAgeGroup(age, 0); })
        .filter(function (age, index, array) { return array.indexOf(age) === index; }),
      preferredPositions:preferred.length ? preferred : [target],
      scoringSetupVersion:'v4.0.0'
    });
  }

  function groupRelation(playerPosition, targetPosition) {
    var source = client.groupForPosition(playerPosition);
    var target = client.groupForPosition(targetPosition);
    if (playerPosition === targetPosition) return 100;
    if (source === target) return 84;
    if (source === 'Goalkeeper' || target === 'Goalkeeper') return 20;
    return 58;
  }

  function averageAttributes(player, keys) {
    var flat = client.flattenRatings(player.attribute_ratings || {});
    var values = keys.map(function (key) { return Number(flat[key]); }).filter(Number.isFinite);
    if (!values.length) return 50;
    return Math.round(values.reduce(function (sum, value) { return sum + value; }, 0) / values.length * 10);
  }

  function styleKeys(style, group) {
    var value = String(style || '').toLowerCase();
    if (group === 'Goalkeeper') {
      if (value.includes('build') || value.includes('possession')) return ['gk_distribution','gk_decision_making','gk_composure'];
      if (value.includes('press')) return ['gk_sweeping','gk_agility_explosiveness','gk_decision_making'];
      return ['gk_positioning','gk_communication','gk_composure'];
    }
    if (value.includes('press')) return ['stamina','decision_making','pace','coachability'];
    if (value.includes('possession') || value.includes('build')) return ['first_touch','passing','awareness','decision_making','composure'];
    if (value.includes('counter') || value.includes('vertical')) return ['pace','decision_making','awareness','dribbling'];
    if (value.includes('wing')) return ['pace','dribbling','crossing','crossing_attacking_support'];
    return ['awareness','decision_making','composure'];
  }

  function needKeys(setup, group) {
    var text = JSON.stringify(setup.teamNeeds || setup.teamWeaknesses || []).toLowerCase();
    if (group === 'Goalkeeper') {
      if (text.includes('distribution')) return ['gk_distribution','gk_decision_making','gk_composure'];
      return ['gk_positioning','gk_shot_stopping','gk_communication'];
    }
    if (text.includes('goal')) return ['finishing','shooting','attacking_movement','chance_creation'];
    if (text.includes('defen')) return ['one_v_one_defending','tackling','defensive_positioning','anticipation_interceptions'];
    if (text.includes('press')) return ['pressing_from_front','pressing_counter_pressing','pressing_defensive_transition','stamina'];
    if (text.includes('chance') || text.includes('creativ')) return ['chance_creation','passing','awareness','decision_making'];
    return ['decision_making','awareness','composure'];
  }

  function compatibilityFor(player, setup) {
    var target = setup.targetPosition;
    var group = client.groupForPosition(player.primary_position);
    var positionFit = groupRelation(player.primary_position, target);
    var overall = Number(player.overall_rating) || 50;
    var styleFit = averageAttributes(player, styleKeys(setup.playingStyle, group));
    var needFit = averageAttributes(player, needKeys(setup, group));
    var estimated = Math.round(
      positionFit * 0.25 +
      overall * 0.35 +
      styleFit * 0.20 +
      needFit * 0.20
    );
    var evidence = Math.min(92, 55 + (Number(player.appearances) || 0) * 4);
    var width = Math.max(4, Math.round((100 - evidence) * 0.12));
    var conservative = Math.max(0, Math.min(100, estimated - width));
    return {
      finalScore:conservative,
      score:conservative,
      conservativeScore:conservative,
      estimatedScore:estimated,
      likelyRange:{
        minimum:conservative,
        maximum:Math.min(100, estimated + Math.round(width * 0.65))
      },
      label:conservative >= 80 ? 'Strong fit' : conservative >= 65 ? 'Promising fit' : conservative >= 50 ? 'Conditional fit' : 'Low fit',
      formationPositionFit:positionFit,
      roleFit:Math.round((positionFit + overall) / 2),
      tacticalStyleFit:styleFit,
      teamNeedFit:needFit,
      developmentPathwayFit:Math.min(100, overall + 6),
      evidenceConfidence:{ score:evidence, label:evidence >= 80 ? 'Strong' : evidence >= 60 ? 'Provisional' : 'Insufficient' },
      setup:Object.assign({}, setup),
      explanation:'Demo compatibility has been recalculated from the saved Scout setup and the player’s V4 position-aware ratings.',
      scoringVersion:'v4.0.0'
    };
  }

  function positionRatings(player) {
    var group = client.groupForPosition(player.primary_position);
    var candidates = options.positions.filter(function (position) { return position.group === group; });
    var base = Number(player.overall_rating) || 60;
    var ratings = {};
    candidates.forEach(function (position, index) {
      ratings[position.code] = Math.max(35, Math.min(100,
        base - (position.code === player.primary_position ? 0 : 2 + index % 4)
      ));
    });
    var sorted = Object.keys(ratings)
      .map(function (position) { return { position:position, role:position, score:ratings[position], group:group }; })
      .sort(function (a, b) { return b.score - a.score; });
    return {
      ratings:ratings,
      sorted:sorted,
      bestCurrentPosition:sorted[0] && sorted[0].position,
      bestCurrentScore:sorted[0] && sorted[0].score,
      positionGroup:group
    };
  }

  function analysisFor(player, setup) {
    var compatibility = compatibilityFor(player, setup);
    var positions = positionRatings(player);
    var evidenceScore = compatibility.evidenceConfidence.score;
    return {
      scoringVersion:'v4.0.0',
      overallRating:player.overall_rating,
      overallBreakdown:{
        finalScore:player.overall_rating,
        overallRating:player.overall_rating,
        currentReadiness:player.overall_rating,
        potentialRating:Math.min(100, player.overall_rating + 6),
        positionRatings:positions,
        dataConfidenceScore:evidenceScore,
        dataConfidenceLabel:compatibility.evidenceConfidence.label,
        explanation:'V4 demo overall uses the canonical position-aware assessment.'
      },
      positionRatings:positions,
      compatibilityScore:compatibility.conservativeScore,
      compatibilityBreakdown:compatibility,
      compatibility:compatibility,
      predictionScore:Math.min(100, player.overall_rating + 6),
      predictionDetails:{
        currentOverall:player.overall_rating,
        potentialOverall:Math.min(100, player.overall_rating + 6),
        bestProjectedFuturePosition:positions.bestCurrentPosition,
        roleFits:positions.sorted
      },
      footballValueIndex:Math.round(player.overall_rating * 0.72 + Math.min(100, player.overall_rating + 6) * 0.28),
      transferValue:null,
      transferValueFormatted:null,
      valueAnalysis:{
        footballValueIndex:Math.round(player.overall_rating * 0.72 + Math.min(100, player.overall_rating + 6) * 0.28),
        value:null,
        valueFormatted:null,
        displayValue:'Not estimated',
        currencyEstimateStatus:'Not estimated',
        warnings:['The demo does not invent a transfer fee or salary without verified market anchors.']
      },
      evidenceConfidence:compatibility.evidenceConfidence,
      warnings:[]
    };
  }

  function recalculateState(state) {
    state = Object.assign({}, state || {});
    state.schemaVersion = SCHEMA_VERSION;
    state.scoringVersion = 'v4.0.0';
    state.setup = normaliseSetup(state.setup);
    state.players = (state.players || []).map(upgradePlayer);

    state.players = state.players.map(function (player) {
      var analysis = analysisFor(player, state.setup);
      return Object.assign({}, player, {
        compatibilityScore:analysis.compatibilityScore,
        compatibility:analysis.compatibility,
        analysis:analysis,
        overall_breakdown:analysis.overallBreakdown,
        position_ratings:analysis.positionRatings,
        evidence_confidence:analysis.evidenceConfidence,
        prediction_analysis:analysis.predictionDetails,
        value_analysis:analysis.valueAnalysis,
        scoring_result:analysis
      });
    });

    state.pipeline = (state.pipeline || []).map(function (item) {
      var player = state.players.find(function (row) {
        return String(row.id) === String(item.player_id || item.playerId);
      });
      return Object.assign({}, item, {
        player:player || item.player,
        compatibilityScore:player ? player.compatibilityScore : item.compatibilityScore
      });
    });
    return state;
  }

  function rawSetState(state) {
    var next = recalculateState(state);
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(next));
    } catch (_) {}
    return next;
  }

  function readState() {
    var state = null;
    try {
      if (typeof originalGetDemoState === 'function') state = originalGetDemoState();
    } catch (_) {}
    if (!state) {
      try { state = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null'); } catch (_) {}
    }
    state = recalculateState(state || { players:[], pipeline:[], predictions:[], fixtures:[], videos:[], setup:{} });
    try { sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
    return state;
  }

  function predictionResult(type, player, input, state) {
    var canonical = String(type || '').toLowerCase();
    var analysis = player.analysis || analysisFor(player, state.setup);
    if (canonical.includes('roi')) {
      return {
        type:'ROI Analysis',
        currentTransferValue:{ value:null, formatted:null, footballValueIndex:analysis.footballValueIndex },
        projection:[1,2,3,4,5].map(function (year) {
          return {
            year:year,
            horizon:'Year ' + year,
            footballValueIndex:Math.min(100, analysis.footballValueIndex + year * 2),
            projectedValue:null,
            projectedValueFormatted:null,
            roiPercent:null
          };
        }),
        suitability:'Not assessed — verified financial anchors required',
        recommendation:'Use the football value index for prioritisation. The demo does not invent a fee, ROI or salary.',
        confidence:analysis.evidenceConfidence,
        valueAnalysis:analysis.valueAnalysis,
        disclaimer:'Demo decision-support output. Currency and ROI require verified anchors.'
      };
    }
    if (canonical.includes('scenario')) {
      return {
        type:'Match Scenario Prediction',
        scenario:input.scenario || input.scenarioKey || 'Selected match scenario',
        scenarioScore:Math.round((analysis.overallRating + analysis.compatibilityScore) / 2),
        likelyRange:analysis.compatibility.likelyRange,
        confidence:analysis.evidenceConfidence,
        risk:analysis.compatibilityScore >= 75 ? 'Lower current role risk' : 'Moderate current role risk',
        recommendation:'Verify the repeated behaviour through live observation.',
        evidence:client.attributesForPosition(player.primary_position, options).slice(0,5).map(function (row) {
          var flat = client.flattenRatings(player.attribute_ratings);
          return { key:row[0], label:row[1], score:Number(flat[row[0]]) * 10 };
        })
      };
    }
    if (canonical.includes('development') || canonical.includes('attribute')) {
      return {
        type:'Attribute Development',
        focus:input.focus || input.trainingFocus || 'Balanced',
        currentOverall:analysis.overallRating,
        potentialOverall:analysis.predictionScore,
        confidence:analysis.evidenceConfidence,
        seasons:[1,2,3,4,5].map(function (year) {
          return {
            year:year,
            overall:Math.min(100, analysis.overallRating + Math.round((analysis.predictionScore - analysis.overallRating) * year / 5)),
            footballValueIndex:Math.min(100, analysis.footballValueIndex + year)
          };
        }),
        currentAttributes:client.flattenRatings(player.attribute_ratings)
      };
    }
    var target = client.normalisePosition(input.targetPosition || input.position) || state.setup.targetPosition;
    var rating = analysis.positionRatings.ratings[target];
    return {
      type:'Position Fit Projection',
      targetPosition:target,
      targetVerdict:rating >= analysis.positionRatings.bestCurrentScore - 3 ? 'Natural or near-natural fit' : 'Managed conversion required',
      bestCurrentPosition:analysis.positionRatings.bestCurrentPosition,
      bestCurrentScore:analysis.positionRatings.bestCurrentScore,
      bestFuturePosition:analysis.positionRatings.bestCurrentPosition,
      bestFutureScore:analysis.predictionScore,
      targetScore:rating || null,
      positionRatings:analysis.positionRatings.ratings,
      topRoles:analysis.positionRatings.sorted,
      confidence:analysis.evidenceConfidence
    };
  }

  async function v4Api(method, path, body) {
    var url = new URL(path, 'https://scoutlink.local');
    var pathname = url.pathname;
    var state = readState();

    if (method === 'GET' && pathname === '/api/scoring/options') {
      return options;
    }

    if (method === 'GET' && pathname === '/api/scouts/setup') {
      return {
        preferences:state.setup,
        scoutTeam:{
          team_name:state.setup.teamName,
          scoring_setup:state.setup,
          scoring_setup_version:'v4.0.0'
        }
      };
    }

    if (method === 'POST' && pathname === '/api/scouts/setup') {
      state.setup = normaliseSetup(Object.assign({}, state.setup, body || {}));
      state = rawSetState(state);
      return {
        success:true,
        message:'Demo Scout setup saved and compatibility recalculated for every player.',
        preferences:state.setup,
        players:state.players
      };
    }

    if (method === 'GET' && pathname === '/api/players') {
      var list = state.players.slice();
      var search = String(url.searchParams.get('search') || '').toLowerCase();
      var posGroup = url.searchParams.get('posGroup');
      var specific = client.normalisePosition(url.searchParams.get('specificPos'));
      if (search) {
        list = list.filter(function (player) {
          return (player.first_name + ' ' + player.last_name).toLowerCase().includes(search);
        });
      }
      if (posGroup) {
        posGroup = posGroup === 'Forward' ? 'Attacker' : posGroup;
        list = list.filter(function (player) { return player.position_group === posGroup; });
      }
      if (specific) list = list.filter(function (player) { return player.positions.includes(specific); });
      list.sort(function (a, b) { return b.compatibilityScore - a.compatibilityScore; });
      return {
        data:list,
        total:list.length,
        page:Number(url.searchParams.get('page') || 1),
        limit:Number(url.searchParams.get('limit') || list.length),
        demoSchemaVersion:SCHEMA_VERSION
      };
    }

    var playerMatch = pathname.match(/^\/api\/players\/([^/]+)$/);
    if (method === 'GET' && playerMatch) {
      var player = state.players.find(function (row) { return String(row.id) === playerMatch[1]; }) || state.players[0];
      return {
        player:player,
        analysis:player.analysis,
        recentMatches:[],
        matches:[],
        upcomingFixtures:state.fixtures || [],
        fixtures:state.fixtures || [],
        videos:(state.videos || []).filter(function (video) { return String(video.player_id) === String(player.id); }),
        pipelineStatus:(state.pipeline || []).some(function (item) { return String(item.player_id) === String(player.id); }) ? 'watching' : null,
        interestAlreadyRegistered:(state.pipeline || []).some(function (item) { return String(item.player_id) === String(player.id); })
      };
    }

    if (method === 'POST' && pathname === '/api/players') {
      var position = client.normalisePosition(body.primaryPosition || body.specificPosition) || 'CM';
      var created = upgradePlayer({
        id:'demo-player-' + Date.now(),
        first_name:body.firstName || body.first_name || 'Demo',
        last_name:body.lastName || body.last_name || 'Player',
        age_group:body.ageGroup || body.age_group || 'U13',
        primary_position:position,
        specific_position:position,
        position_group:client.groupForPosition(position),
        foot:body.foot || 'Right',
        attribute_ratings:body.attributeRatings || body.attribute_ratings || {}
      }, state.players.length);
      state.players.unshift(created);
      state = rawSetState(state);
      created = state.players.find(function (row) { return row.id === created.id; });
      return { success:true, player:created, analysis:created.analysis, message:'Demo player added for this session.' };
    }

    if (method === 'PUT' && playerMatch) {
      var index = state.players.findIndex(function (row) { return String(row.id) === playerMatch[1]; });
      if (index >= 0) {
        state.players[index] = upgradePlayer(Object.assign({}, state.players[index], {
          first_name:body.firstName || body.first_name || state.players[index].first_name,
          last_name:body.lastName || body.last_name || state.players[index].last_name,
          age_group:body.ageGroup || body.age_group || state.players[index].age_group,
          primary_position:body.primaryPosition || body.primary_position || body.specificPosition || body.specific_position || state.players[index].primary_position,
          specific_position:body.specificPosition || body.specific_position || body.primaryPosition || body.primary_position || state.players[index].specific_position,
          attribute_ratings:body.attributeRatings || body.attribute_ratings || state.players[index].attribute_ratings
        }), index);
        state = rawSetState(state);
        return { player:state.players[index], analysis:state.players[index].analysis };
      }
    }

    if (method === 'POST' && pathname === '/api/match-facts') {
      (body.players || []).forEach(function (item) {
        var player = state.players.find(function (row) { return String(row.id) === String(item.playerId); });
        if (!player) return;
        player.appearances = (Number(player.appearances) || 0) + 1;
        player.goals = (Number(player.goals) || 0) + (Number(item.goals) || 0);
        player.assists = (Number(player.assists) || 0) + (Number(item.assists) || 0);
        if (item.attributeRatings || item.attribute_ratings) {
          var existing = client.flattenRatings(player.attribute_ratings);
          var observed = client.flattenRatings(item.attributeRatings || item.attribute_ratings);
          Object.keys(observed).forEach(function (key) {
            existing[key] = Math.round((Number(existing[key] || observed[key]) * 0.8) + Number(observed[key]) * 0.2);
          });
          player.attribute_ratings = client.nestRatings(existing, player.position_group, options);
        }
      });
      state = rawSetState(state);
      return { success:true, message:'Demo Match Facts saved and player scores recalculated.', matchFacts:body.players || [], errors:[] };
    }

    if (method === 'POST' && pathname === '/api/predictions/run') {
      var selected = state.players.find(function (row) { return String(row.id) === String(body.playerId); }) || state.players[0];
      var result = predictionResult(body.predictionType, selected, body.inputParams || body, state);
      var log = {
        id:'demo-prediction-' + Date.now(),
        player_id:selected.id,
        player:selected,
        prediction_type:result.type,
        input_snapshot:body,
        result:result,
        scoring_version:'v4.0.0',
        created_at:new Date().toISOString()
      };
      state.predictions = state.predictions || [];
      state.predictions.unshift(log);
      rawSetState(state);
      return { result:result, logId:log.id, creditsRemaining:999 };
    }

    if (method === 'GET' && pathname === '/api/predictions') {
      return { data:state.predictions || [], planLimit:999, remaining:999, currentPlan:'DEMO' };
    }

    return originalApi(method, path, body);
  }

  async function init() {
    client = window.ScoutLinkScoringV4;
    if (!client) {
      initAttempts += 1;
      if (initAttempts < 100) window.setTimeout(init, 50);
      return;
    }
    options = await client.loadOptions();

    window.getDemoState = readState;
    window.setDemoState = rawSetState;
    window.api = v4Api;
    window.SCOUTLINK_DEMO_SCHEMA_VERSION = SCHEMA_VERSION;

    if (
      (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) ||
      localStorage.getItem('sl_demo_mode') === '1'
    ) {
      rawSetState(readState());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
}());
