'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const {
  analysePlayer,
  ROLE_WEIGHTS,
  ATTR_LABELS,
  attr100
} = require('../engines/compatibility');
const { limitsForPlan, effectiveLimits } = require('../utils/scoutPlans');
const { applyRealDataFilter } = require('../utils/demo');

const PLAYER_FIELDS = [
  'id','player_id','first_name','last_name','age','age_group',
  'position_group','specific_position','primary_position','positions',
  'team_id','team_name','overall_rating',
  'transfer_value','predicted_salary_weekly','height_category',
  'height_range_cm','build_category','weight_range_kg','foot',
  'appearances','goals','assists','clean_sheets','yellow_cards',
  'red_cards','pace','agility','strength','stamina','jumping',
  'composure','shooting','passing','dribbling','defending',
  'crossing','vision','positioning','heading','tackling',
  'gk_diving','gk_handling','gk_kicking','gk_reflexes',
  'gk_positioning','gk_distribution','gk_communication',
  'gk_sweeping','avatar_config','created_at','updated_at'
].join(',');

const CONTEXT_WEIGHTS = {
  immediate_starter: {
    readiness:0.25, teamFit:0.20, evidence:0.15, tactical:0.15,
    positionFit:0.10, matchOutput:0.10, financial:0.05
  },
  development_prospect: {
    development:0.26, evidence:0.12, technical:0.14, physical:0.12,
    teamFit:0.10, positionFit:0.10, financial:0.10, readiness:0.06
  },
  tactical_role: {
    tactical:0.26, positionFit:0.22, teamFit:0.18, technical:0.12,
    evidence:0.10, readiness:0.07, financial:0.05
  },
  low_financial_risk: {
    financial:0.30, evidence:0.18, readiness:0.16, teamFit:0.12,
    tactical:0.08, positionFit:0.08, development:0.08
  },
  resale_upside: {
    development:0.25, financial:0.25, technical:0.12, physical:0.10,
    evidence:0.10, teamFit:0.08, positionFit:0.06, readiness:0.04
  },
  squad_depth: {
    teamFit:0.22, positionFit:0.20, readiness:0.18, evidence:0.14,
    tactical:0.12, financial:0.08, development:0.06
  }
};

const CONTEXT_LABELS = {
  immediate_starter:'Immediate starter',
  development_prospect:'Development prospect',
  tactical_role:'Specific tactical role',
  low_financial_risk:'Low financial risk',
  resale_upside:'Resale upside',
  squad_depth:'Squad depth'
};

const SEARCH_POSITIONS = [
  'GK','CB','BPD','RB','LB','RWB','LWB','CDM','CM','B2B',
  'CAM','LW','RW','CF','ST','SS'
];

function cleanText(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num(value)));
}

function scoreFrom(value, fallback = 50) {
  const parsed = num(value, fallback);
  return clamp(parsed > 0 && parsed <= 10 ? parsed * 10 : parsed);
}

function round(value, digits = 0) {
  const factor = Math.pow(10, digits);
  return Math.round(num(value) * factor) / factor;
}

function average(values, fallback = 50) {
  const valid = values.map(Number).filter(Number.isFinite);
  if (!valid.length) return fallback;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function playerName(player) {
  return [player?.first_name, player?.last_name]
    .filter(Boolean)
    .join(' ') || 'Player';
}

function playerPosition(player) {
  return String(
    player?.specific_position ||
    player?.primary_position ||
    (Array.isArray(player?.positions) && player.positions[0]) ||
    player?.position_group ||
    '—'
  ).toUpperCase();
}

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value) {
  const date = safeDate(value);
  if (!date) return null;
  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86400000)
  );
}

function getNested(object, keys, fallback = 0) {
  for (const key of keys) {
    const parts = String(key).split('.');
    let current = object;

    for (const part of parts) {
      current = current && current[part];
    }

    const parsed = Number(current);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function compatibilityPart(analysis, ...keys) {
  return scoreFrom(getNested(analysis, keys, 50));
}

function scopeColumn(context) {
  return context.scout.scout_team_id
    ? 'scout_team_id'
    : 'scout_id';
}

function scopeValue(context) {
  return context.scout.scout_team_id || context.scout.id;
}

function applyScope(query, context) {
  return query.eq(
    scopeColumn(context),
    scopeValue(context)
  );
}

async function loadContext(req) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) throw error;

  if (!scout) {
    const notFound = new Error('Scout account not found');
    notFound.status = 404;
    throw notFound;
  }

  let team = { tier:5 };

  if (scout.scout_team_id) {
    const { data, error: teamError } = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();

    if (teamError) throw teamError;
    if (data) team = data;
  }

  const prefs = scout.scout_preferences || {};

  if (prefs.teamWeaknesses?.length) {
    team.team_weaknesses = prefs.teamWeaknesses;
  }

  if (prefs.roleExpectations?.length) {
    team.role_expectations = prefs.roleExpectations;
  }

  if (prefs.longTermGoals?.length) {
    team.long_term_goals = prefs.longTermGoals;
  }

  if (prefs.formation) {
    team.formation = prefs.formation;
  }

  if (prefs.playingStyle) {
    team.playing_style = prefs.playingStyle;
  }

  return {
    scout,
    team,
    prefs,
    req
  };
}

async function loadPlayers(context, ids) {
  const cleanIds = [
    ...new Set(asArray(ids).filter(Boolean))
  ];

  if (!cleanIds.length) return [];

  let query = supabase
    .from('players')
    .select(PLAYER_FIELDS)
    .in('id', cleanIds);

  query = applyRealDataFilter(
    query,
    context.req
  );

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function loadFacts(playerIds, perPlayer = 12) {
  const ids = [
    ...new Set(asArray(playerIds).filter(Boolean))
  ];

  if (!ids.length) return {};

  const { data, error } = await supabase
    .from('match_facts')
    .select('*')
    .in('player_id', ids)
    .order('match_date', { ascending:false })
    .limit(Math.max(100, ids.length * perPlayer));

  if (error) throw error;

  const grouped = {};

  (data || []).forEach((fact) => {
    if (!grouped[fact.player_id]) {
      grouped[fact.player_id] = [];
    }

    if (grouped[fact.player_id].length < perPlayer) {
      grouped[fact.player_id].push(fact);
    }
  });

  return grouped;
}

async function loadVideos(playerIds) {
  const ids = [
    ...new Set(asArray(playerIds).filter(Boolean))
  ];

  if (!ids.length) return {};

  const { data, error } = await supabase
    .from('player_videos')
    .select(
      'id,player_id,title,category,created_at,video_url'
    )
    .in('player_id', ids)
    .order('created_at', { ascending:false })
    .limit(Math.max(100, ids.length * 10));

  if (error) throw error;

  const grouped = {};

  (data || []).forEach((video) => {
    if (!grouped[video.player_id]) {
      grouped[video.player_id] = [];
    }

    grouped[video.player_id].push(video);
  });

  return grouped;
}

function evidenceQuality(player, facts, videos) {
  const attrs = [
    'pace','agility','strength','stamina','jumping',
    'composure','shooting','passing','dribbling',
    'defending','crossing','vision','positioning',
    'heading','tackling'
  ];

  const rated = attrs
    .filter((key) => num(player[key]) > 0)
    .length;

  const latestFact =
    facts[0]?.match_date ||
    facts[0]?.created_at;

  const recencyDays = daysSince(latestFact);

  const matchCount = Math.max(
    facts.length,
    num(player.appearances)
  );

  const completeness = Math.round(
    (rated / attrs.length) * 100
  );

  const recencyScore = recencyDays == null
    ? 25
    : recencyDays <= 14
      ? 100
      : recencyDays <= 30
        ? 85
        : recencyDays <= 60
          ? 65
          : recencyDays <= 120
            ? 45
            : 25;

  const matchScore = matchCount >= 12
    ? 100
    : matchCount >= 8
      ? 84
      : matchCount >= 5
        ? 68
        : matchCount >= 2
          ? 48
          : matchCount >= 1
            ? 36
            : 20;

  const videoScore = videos.length >= 3
    ? 100
    : videos.length
      ? 70
      : 30;

  const score = Math.round(
    matchScore * 0.42 +
    completeness * 0.30 +
    recencyScore * 0.18 +
    videoScore * 0.10
  );

  const label = score >= 82
    ? 'High'
    : score >= 64
      ? 'Medium'
      : score >= 45
        ? 'Low'
        : 'Very low';

  const missing = [];

  if (matchCount < 5) {
    missing.push('More recorded matches');
  }

  if (completeness < 80) {
    missing.push(
      'More complete coach attribute ratings'
    );
  }

  if (!videos.length) {
    missing.push('Approved video evidence');
  }

  if (recencyDays == null || recencyDays > 60) {
    missing.push('More recent match evidence');
  }

  return {
    score,
    label,
    matchCount,
    attributeCompleteness:completeness,
    videoCount:videos.length,
    latestEvidenceAt:
      latestFact ||
      player.updated_at ||
      null,
    recencyDays,
    missing,
    note:label === 'High'
      ? 'The profile has enough recent and complete evidence to support stronger decision confidence.'
      : 'Treat the result as decision support and close the missing-evidence gaps before a final recruitment decision.'
  };
}

function weightedRoleAttributes(
  player,
  targetPosition
) {
  const role = String(
    targetPosition || playerPosition(player)
  ).toUpperCase();

  const weights = ROLE_WEIGHTS[role] || {};

  return Object.entries(weights)
    .map(([key, weight]) => ({
      key,
      label:ATTR_LABELS[key] || key,
      score:Math.round(attr100(player, key)),
      weight
    }))
    .sort(
      (a, b) =>
        (b.score * b.weight) -
        (a.score * a.weight)
    );
}

function buildPositionExplanation(
  player,
  analysis,
  targetPosition
) {
  const ratings = analysis.positionRatings || {};

  const target = String(
    targetPosition || playerPosition(player)
  ).toUpperCase();

  const targetScore = scoreFrom(
    ratings.ratings?.[target] ||
    ratings.bestCurrentScore
  );

  const bestScore = scoreFrom(
    ratings.bestCurrentScore
  );

  const gap = round(
    targetScore - bestScore,
    1
  );

  const verdict = gap >= -2
    ? 'Natural or near-natural fit'
    : gap >= -8
      ? 'Convertible with a managed development plan'
      : 'High-friction conversion';

  const attrs = weightedRoleAttributes(
    player,
    target
  );

  const supports = attrs.slice(0, 3);

  const blockers = [...attrs]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return {
    targetPosition:target,
    targetScore:Math.round(targetScore),
    bestCurrentPosition:
      ratings.bestCurrentPosition ||
      playerPosition(player),
    bestCurrentScore:Math.round(bestScore),
    bestFuturePosition:
      ratings.bestFuturePosition ||
      ratings.bestCurrentPosition ||
      playerPosition(player),
    bestFutureScore:Math.round(
      scoreFrom(
        ratings.bestFutureScore ||
        bestScore
      )
    ),
    gapVsBest:gap,
    verdict,
    supportingAttributes:supports,
    frictionAttributes:blockers,
    alternatives:
      (ratings.sorted || []).slice(0, 5),
    recommendation:
      verdict === 'Natural or near-natural fit'
        ? 'Use this role as a positive selection trigger, then confirm it through a live observation.'
        : verdict === 'Convertible with a managed development plan'
          ? 'Recruit only with a clear development plan, protected minutes and a review date.'
          : 'Do not recruit primarily for this role yet. Keep the player in their stronger role or test a closer conversion option.'
  };
}

function buildVerdict(
  player,
  analysis,
  evidence
) {
  const compatibility = scoreFrom(
    analysis.compatibilityScore
  );

  const readiness = scoreFrom(
    analysis.overallBreakdown?.currentReadiness ||
    analysis.overallBreakdown?.finalScore ||
    player.overall_rating
  );

  const potential = scoreFrom(
    analysis.overallBreakdown?.potentialRating ||
    player.potential_rating ||
    player.overall_rating
  );

  const risks = asArray(
    analysis.compatibility?.risks ||
    analysis.compatibilityBreakdown?.risks
  ).filter(Boolean);

  let label = 'Monitor';

  let action =
    'Keep the player under review and close the missing evidence gaps.';

  if (
    compatibility >= 82 &&
    readiness >= 75 &&
    evidence.score >= 64
  ) {
    label = 'Prioritise';
    action =
      'Prioritise live scouting and a structured coach conversation.';
  } else if (
    compatibility >= 72 &&
    potential >= 78
  ) {
    label = 'Development target';
    action =
      'Add to the development shortlist and review again after the next evidence milestone.';
  } else if (
    compatibility < 60 ||
    evidence.score < 40
  ) {
    label = 'Do not progress yet';
    action =
      'Do not progress to recruitment spend until fit or evidence materially improves.';
  }

  return {
    label,
    action,
    compatibility,
    readiness,
    potential,
    evidenceConfidence:evidence.label,
    risks,
    summary:
      playerName(player) +
      ' is a ' +
      label.toLowerCase() +
      ' for the current recruitment brief. Compatibility is ' +
      compatibility +
      '/100, current readiness is ' +
      readiness +
      '/100 and evidence confidence is ' +
      evidence.label.toLowerCase() +
      '.'
  };
}

function buildTimeline(
  player,
  facts,
  videos,
  events
) {
  const rows = [];

  facts.forEach((fact) => {
    rows.push({
      type:'match_fact',
      at:
        fact.match_date ||
        fact.created_at,
      title:'Match evidence recorded',
      body:[
        fact.opponent_name || fact.opponent,
        fact.performance_score
          ? 'Performance ' +
            fact.performance_score +
            '/100'
          : '',
        num(fact.goals)
          ? fact.goals + ' goal(s)'
          : '',
        num(fact.assists)
          ? fact.assists + ' assist(s)'
          : ''
      ]
        .filter(Boolean)
        .join(' · ')
    });
  });

  videos.forEach((video) => {
    rows.push({
      type:'video',
      at:video.created_at,
      title:'Video evidence added',
      body:
        video.title ||
        video.category ||
        'Approved player video'
    });
  });

  (events || []).forEach((event) => {
    rows.push({
      type:event.event_type,
      at:event.created_at,
      title:event.title,
      body:event.body
    });
  });

  if (player.updated_at) {
    rows.push({
      type:'profile_update',
      at:player.updated_at,
      title:'Player profile updated',
      body:
        'Coach-managed profile information changed.'
    });
  }

  return rows
    .filter((row) => row.at)
    .sort(
      (a, b) =>
        new Date(b.at) -
        new Date(a.at)
    )
    .slice(0, 30);
}

async function activityForPlayer(
  context,
  playerId
) {
  let query = supabase
    .from('scout_activity_events')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending:false })
    .limit(30);

  query = applyScope(query, context);

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

async function playerBundle(
  context,
  playerId
) {
  const players = await loadPlayers(
    context,
    [playerId]
  );

  const player = players[0];

  if (!player) {
    const error = new Error('Player not found');
    error.status = 404;
    throw error;
  }

  const [
    factsByPlayer,
    videosByPlayer,
    activity
  ] = await Promise.all([
    loadFacts([playerId], 15),
    loadVideos([playerId]),
    activityForPlayer(context, playerId)
  ]);

  const facts =
    factsByPlayer[playerId] || [];

  const videos =
    videosByPlayer[playerId] || [];

  const analysis = analysePlayer(
    player,
    context.team,
    facts,
    context.prefs
  );

  const evidence = evidenceQuality(
    player,
    facts,
    videos
  );

  const verdict = buildVerdict(
    player,
    analysis,
    evidence
  );

  const positionFit =
    buildPositionExplanation(
      player,
      analysis,
      playerPosition(player)
    );

  return {
    player,
    facts,
    videos,
    analysis,
    evidence,
    verdict,
    positionFit,
    timeline:buildTimeline(
      player,
      facts,
      videos,
      activity
    )
  };
}

function categoryScores(
  bundle,
  context = {}
) {
  const {
    player,
    analysis,
    evidence
  } = bundle;

  const overall =
    analysis.overallBreakdown || {};

  const compatibility =
    analysis.compatibility || {};

  const target = String(
    context.targetPosition ||
    playerPosition(player)
  ).toUpperCase();

  const targetScore = scoreFrom(
    analysis.positionRatings?.ratings?.[target] ||
    analysis.positionRatings?.bestCurrentScore ||
    player.overall_rating
  );

  const value = Math.max(
    1,
    num(
      analysis.valueAnalysis?.value ||
      player.transfer_value
    )
  );

  const budget = Math.max(
    1,
    num(context.budget, value)
  );

  const affordability = clamp(
    100 -
    Math.max(
      0,
      ((value - budget) / budget) * 100
    )
  );

  const valueEfficiency = clamp(
    scoreFrom(analysis.compatibilityScore) * 0.55 +
    scoreFrom(
      overall.potentialRating ||
      player.potential_rating ||
      player.overall_rating
    ) * 0.25 +
    affordability * 0.20
  );

  const riskCount =
    asArray(compatibility.risks).length;

  return {
    technical:scoreFrom(
      overall.technicalScore ||
      overall.technical ||
      player.passing
    ),
    tactical:Math.round(
      average([
        compatibility.needFit,
        compatibility.roleFit,
        compatibility.tacticalStyleFit,
        compatibility.formationPositionFit
      ], 50)
    ),
    physical:scoreFrom(
      overall.physicalProfileScore ||
      overall.physical ||
      player.strength
    ),
    mental:scoreFrom(
      overall.mentalCoachabilityScore ||
      overall.mental ||
      player.composure
    ),
    matchOutput:scoreFrom(
      overall.matchOutputScore ||
      overall.matchOutput ||
      player.overall_rating
    ),
    positionFit:targetScore,
    teamFit:scoreFrom(
      analysis.compatibilityScore
    ),
    development:scoreFrom(
      overall.potentialRating ||
      player.potential_rating ||
      player.overall_rating
    ),
    readiness:scoreFrom(
      overall.currentReadiness ||
      overall.finalScore ||
      player.overall_rating
    ),
    evidence:evidence.score,
    financial:valueEfficiency,
    risk:clamp(
      100 -
      riskCount * 12 -
      Math.max(0, 60 - evidence.score) * 0.4
    )
  };
}

function weightedScore(
  scores,
  contextKey
) {
  const weights =
    CONTEXT_WEIGHTS[contextKey] ||
    CONTEXT_WEIGHTS.immediate_starter;

  return round(
    Object.entries(weights).reduce(
      (sum, [key, weight]) =>
        sum +
        scoreFrom(scores[key]) * weight,
      0
    ),
    1
  );
}

function comparisonNarrative(
  a,
  b,
  scoresA,
  scoresB,
  contextKey,
  winnerKey
) {
  const winner =
    winnerKey === 'a' ? a : b;

  const loser =
    winnerKey === 'a' ? b : a;

  const winnerScores =
    winnerKey === 'a'
      ? scoresA
      : scoresB;

  const loserScores =
    winnerKey === 'a'
      ? scoresB
      : scoresA;

  const categories =
    Object.keys(winnerScores)
      .filter((key) => key !== 'risk')
      .map((key) => ({
        key,
        margin:round(
          winnerScores[key] -
          loserScores[key],
          1
        )
      }))
      .sort(
        (x, y) =>
          y.margin - x.margin
      );

  const leads = categories
    .filter((item) => item.margin > 0)
    .slice(0, 3);

  const tradeOffs = categories
    .filter((item) => item.margin < 0)
    .slice(-3)
    .reverse();

  const labelMap = {
    technical:'technical quality',
    tactical:'tactical suitability',
    physical:'physical profile',
    mental:'mental and composure indicators',
    matchOutput:'match output',
    positionFit:'position fit',
    teamFit:'team-brief fit',
    development:'development ceiling',
    readiness:'immediate readiness',
    evidence:'evidence confidence',
    financial:'financial value'
  };

  return {
    recommendation:
      playerName(winner.player) +
      ' is the stronger ' +
      (
        CONTEXT_LABELS[contextKey] ||
        'recruitment'
      ) +
      ' option because ' +
      (
        leads.length
          ? leads
              .map(
                (item) =>
                  labelMap[item.key]
              )
              .join(', ')
          : 'the weighted decision score is marginally higher'
      ) +
      ' are stronger in the current context.',
    tradeOff:
      playerName(winner.player) +
      ' gives you more ' +
      (
        leads[0]
          ? labelMap[leads[0].key]
          : 'overall fit'
      ) +
      ', while ' +
      playerName(loser.player) +
      ' retains an advantage in ' +
      (
        tradeOffs[0]
          ? labelMap[tradeOffs[0].key]
          : 'a narrower part of the profile'
      ) +
      '.',
    leads:leads.map((item) => ({
      category:item.key,
      label:labelMap[item.key],
      margin:item.margin
    })),
    tradeOffs:tradeOffs.map((item) => ({
      category:item.key,
      label:labelMap[item.key],
      margin:Math.abs(item.margin)
    }))
  };
}

function sensitivity(
  scoresA,
  scoresB,
  bundleA,
  bundleB,
  context
) {
  const rows = [];

  const margin = Math.abs(
    weightedScore(
      scoresA,
      context.contextKey
    ) -
    weightedScore(
      scoresB,
      context.contextKey
    )
  );

  if (margin < 5) {
    rows.push(
      'The recommendation is close. Two or three additional strong match records could change the winner.'
    );
  }

  if (
    Math.abs(
      scoresA.evidence -
      scoresB.evidence
    ) >= 12
  ) {
    rows.push(
      'The lower-confidence player can close the gap if new match and video evidence supports the current ratings.'
    );
  }

  if (
    context.targetPosition &&
    Math.abs(
      scoresA.positionFit -
      scoresB.positionFit
    ) >= 8
  ) {
    rows.push(
      'Changing the target position may materially change the recommendation.'
    );
  }

  const valueA = num(
    bundleA.player.transfer_value
  );

  const valueB = num(
    bundleB.player.transfer_value
  );

  if (
    valueA &&
    valueB &&
    Math.abs(valueA - valueB) /
      Math.max(valueA, valueB) >
      0.25
  ) {
    rows.push(
      'A different acquisition budget or negotiated price would change the financial recommendation.'
    );
  }

  if (!rows.length) {
    rows.push(
      'The recommendation is relatively stable under the current context, but should still be checked through live observation.'
    );
  }

  return rows;
}

async function createActivity(
  context,
  payload
) {
  const row = {
    scout_id:context.scout.id,
    scout_team_id:
      context.scout.scout_team_id ||
      null,
    player_id:payload.playerId || null,
    event_type:cleanText(
      payload.eventType,
      100
    ),
    title:cleanText(
      payload.title,
      220
    ),
    body:
      cleanText(payload.body, 1200) ||
      null,
    severity:cleanText(
      payload.severity || 'info',
      30
    ),
    data:payload.data || {}
  };

  const { data, error } = await supabase
    .from('scout_activity_events')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function recordUsage(
  context,
  eventType,
  quantity = 1,
  metadata = {}
) {
  const { error } = await supabase
    .from('scout_usage_events')
    .insert({
      scout_id:context.scout.id,
      scout_team_id:
        context.scout.scout_team_id ||
        null,
      event_type:eventType,
      quantity,
      metadata
    });

  if (error) {
    console.warn(
      '[Scout intelligence usage]',
      error.message
    );
  }
}

function parseNaturalLanguage(query) {
  const text = cleanText(query, 500);

  const lower = text
    .toLowerCase()
    .replace(/[–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const criteria = {};
  const chips = [];

  const addChip = (key, label) => {
    if (!chips.some((chip) =>
      chip.key === key)) {
      chips.push({ key, label });
    }
  };

  const ageGroup =
    text.match(/\bU([7-9]|1[0-8])\b/i) ||
    lower.match(/\bunder\s+([7-9]|1[0-8])\b/) ||
    lower.match(/\b([7-9]|1[0-8])\s*year\s*old\b/);

  if (ageGroup) {
    criteria.ageGroup =
      'U' + ageGroup[1];

    addChip(
      'ageGroup',
      criteria.ageGroup
    );
  }

  const phrasePositions = [
    {
      regex:/\bgoalkeepers?\b|\bkeepers?\b/,
      values:['GK'],
      label:'Goalkeeper'
    },
    {
      regex:/\bcentre backs?\b|\bcenter backs?\b/,
      values:['CB'],
      label:'Centre-back'
    },
    {
      regex:/\bball playing (?:centre|center) backs?\b/,
      values:['BPD'],
      label:'Ball-playing centre-back'
    },
    {
      regex:/\bleft backs?\b/,
      values:['LB'],
      label:'Left-back'
    },
    {
      regex:/\bright backs?\b/,
      values:['RB'],
      label:'Right-back'
    },
    {
      regex:/\bleft wing backs?\b/,
      values:['LWB'],
      label:'Left wing-back'
    },
    {
      regex:/\bright wing backs?\b/,
      values:['RWB'],
      label:'Right wing-back'
    },
    {
      regex:/\bdefensive midfielders?\b|\bholding midfielders?\b/,
      values:['CDM'],
      label:'Defensive midfielder'
    },
    {
      regex:/\bcentral midfielders?\b|\bcentre midfielders?\b/,
      values:['CM'],
      label:'Central midfielder'
    },
    {
      regex:/\bbox to box midfielders?\b/,
      values:['B2B'],
      label:'Box-to-box midfielder'
    },
    {
      regex:/\battacking midfielders?\b|\bnumber\s*10s?\b/,
      values:['CAM'],
      label:'Attacking midfielder'
    },
    {
      regex:/\bleft wingers?\b/,
      values:['LW'],
      label:'Left winger'
    },
    {
      regex:/\bright wingers?\b/,
      values:['RW'],
      label:'Right winger'
    },
    {
      regex:/\bwingers?\b/,
      values:['LW','RW'],
      label:'Winger'
    },
    {
      regex:/\bcentre forwards?\b|\bcenter forwards?\b/,
      values:['CF'],
      label:'Centre-forward'
    },
    {
      regex:/\bsecond strikers?\b/,
      values:['SS'],
      label:'Second striker'
    },
    {
      regex:/\bstrikers?\b/,
      values:['ST'],
      label:'Striker'
    }
  ];

  const positions = [];

  phrasePositions.forEach((entry) => {
    if (entry.regex.test(lower)) {
      entry.values.forEach((value) => {
        if (!positions.includes(value)) {
          positions.push(value);
        }
      });

      addChip(
        'positions',
        entry.label
      );
    }
  });

  SEARCH_POSITIONS.forEach((position) => {
    if (
      new RegExp(
        '\\b' + position + '\\b',
        'i'
      ).test(text) &&
      !positions.includes(position)
    ) {
      positions.push(position);
    }
  });

  if (positions.length) {
    criteria.positions = positions;

    if (!chips.some((chip) =>
      chip.key === 'positions')) {
      addChip(
        'positions',
        positions.join(', ')
      );
    }
  }

  const cityMatch = lower.match(
    /\b(?:in|near|around|from|within)\s+([a-z][a-z\s'-]{1,40}?)(?=\s+(?:with|who|under|below|max|maximum|and|that|on|for|ready|high|strong|left|right|either|both)\b|$)/
  );

  if (cityMatch) {
    criteria.city =
      cityMatch[1].trim();

    addChip(
      'city',
      'Near ' +
      criteria.city.replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      )
    );
  }

  const moneyMatch = lower.match(
    /(?:under|below|max(?:imum)?|up to)\s*£?\s*([\d,.]+)\s*(k|m)?/
  );

  if (moneyMatch) {
    let value = Number(
      moneyMatch[1].replace(/,/g, '')
    );

    if (moneyMatch[2] === 'k') {
      value *= 1000;
    }

    if (moneyMatch[2] === 'm') {
      value *= 1000000;
    }

    criteria.maxValue =
      Math.round(value);

    addChip(
      'maxValue',
      'Under GBP ' +
      Math.round(value)
        .toLocaleString('en-GB')
    );
  }

  if (
    /\bleft footed\b|\bleft footer\b/
      .test(lower)
  ) {
    criteria.foot = 'Left';
    addChip('foot', 'Left-footed');
  } else if (
    /\bright footed\b|\bright footer\b/
      .test(lower)
  ) {
    criteria.foot = 'Right';
    addChip('foot', 'Right-footed');
  } else if (
    /\beither foot\b|\bboth footed\b|\btwo footed\b/
      .test(lower)
  ) {
    criteria.foot = 'Either';
    addChip('foot', 'Either foot');
  }

  if (
    /\bhigh evidence confidence\b|\bhigh confidence\b|\bstrong evidence\b|\bwell evidenced\b/
      .test(lower)
  ) {
    criteria.minEvidence = 70;

    addChip(
      'minEvidence',
      'High evidence confidence'
    );
  }

  if (
    /\bstrong compatibility\b|\bhigh compatibility\b|\bbest fit\b|\bstrong fit\b/
      .test(lower)
  ) {
    criteria.minCompatibility = 75;

    addChip(
      'minCompatibility',
      'Strong compatibility'
    );
  }

  if (/\bhigh press\b/.test(lower)) {
    criteria.scenario = 'high_press';
    addChip('scenario', 'High press');
  }

  if (/\blow block\b/.test(lower)) {
    criteria.scenario = 'low_block';
    addChip('scenario', 'Low block');
  }

  if (
    /\bdevelopment prospect\b|\bdevelopment\b|\bhigh ceiling\b|\bhigh potential\b|\bpotential\b/
      .test(lower)
  ) {
    criteria.contextKey =
      'development_prospect';

    addChip(
      'contextKey',
      'Development prospect'
    );
  }

  if (
    /\bready now\b|\bimmediate starter\b|\bstarter\b|\bimmediate\b/
      .test(lower)
  ) {
    criteria.contextKey =
      'immediate_starter';

    addChip(
      'contextKey',
      'Immediate starter'
    );
  }

  if (
    /\blow financial risk\b/
      .test(lower)
  ) {
    criteria.contextKey =
      'low_financial_risk';

    addChip(
      'contextKey',
      'Low financial risk'
    );
  }

  if (
    /\bresale upside\b|\bunderpriced\b|\bvalue prospect\b/
      .test(lower)
  ) {
    criteria.contextKey =
      'resale_upside';

    addChip(
      'contextKey',
      'Resale upside'
    );
  }

  return {
    query:text,
    criteria,
    chips
  };
}

async function teamLocations(players) {
  const teamIds = [
    ...new Set(
      players
        .map((player) => player.team_id)
        .filter(Boolean)
    )
  ];

  if (!teamIds.length) return {};

  const { data, error } = await supabase
    .from('school_academy_teams')
    .select(
      'id,team_name,city,county,country,league_name'
    )
    .in('id', teamIds);

  if (error) throw error;

  const byId = {};

  (data || []).forEach((team) => {
    byId[team.id] = team;
  });

  return byId;
}

function criteriaMatch(
  player,
  team,
  criteria
) {
  const positions = asArray(
    criteria.positions
  ).map(
    (value) =>
      String(value).toUpperCase()
  );

  if (
    criteria.ageGroup &&
    String(
      player.age_group || ''
    ).toUpperCase() !==
    String(
      criteria.ageGroup
    ).toUpperCase()
  ) {
    return false;
  }

  if (
    criteria.minAge &&
    num(player.age) <
    num(criteria.minAge)
  ) {
    return false;
  }

  if (
    criteria.maxAge &&
    num(player.age) >
    num(criteria.maxAge)
  ) {
    return false;
  }

  if (
    criteria.maxValue &&
    num(player.transfer_value) >
    num(criteria.maxValue)
  ) {
    return false;
  }

  if (
    criteria.minOverall &&
    scoreFrom(player.overall_rating) <
    num(criteria.minOverall)
  ) {
    return false;
  }

  if (positions.length) {
    const playerPositions = [
      player.specific_position,
      player.primary_position,
      ...(
        Array.isArray(player.positions)
          ? player.positions
          : []
      )
    ]
      .filter(Boolean)
      .map(
        (value) =>
          String(value).toUpperCase()
      );

    if (!positions.some((position) =>
      playerPositions.includes(position))) {
      return false;
    }
  }

  if (criteria.city) {
    const location = [
      player.city,
      player.county,
      player.country,
      player.location,
      team?.city,
      team?.county,
      team?.country,
      team?.postcode
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!location.includes(
      String(criteria.city).toLowerCase()
    )) {
      return false;
    }
  }

  if (criteria.foot) {
    const foot = String(
      player.foot ||
      player.preferred_foot ||
      ''
    ).toLowerCase();

    if (criteria.foot === 'Either') {
      if (!/(either|both|two)/.test(foot)) {
        return false;
      }
    } else if (!foot.includes(
      criteria.foot.toLowerCase()
    )) {
      return false;
    }
  }

  if (criteria.search) {
    const haystack = [
      player.first_name,
      player.last_name,
      player.team_name,
      player.position_group,
      player.specific_position,
      player.primary_position,
      team?.city,
      team?.county,
      team?.country
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!haystack.includes(
      String(criteria.search).toLowerCase()
    )) {
      return false;
    }
  }

  return true;
}

function matchReasons(
  bundle,
  criteria,
  team
) {
  const reasons = [];

  if (
    criteria.ageGroup &&
    bundle.player.age_group ===
      criteria.ageGroup
  ) {
    reasons.push(
      'Matches the requested ' +
      criteria.ageGroup +
      ' age group.'
    );
  }

  if (
    asArray(criteria.positions).length
  ) {
    reasons.push(
      'Matches the requested position profile: ' +
      playerPosition(bundle.player) +
      '.'
    );
  }

  if (criteria.city && team) {
    reasons.push(
      'Located in the requested area: ' +
      [
        team.city,
        team.county
      ]
        .filter(Boolean)
        .join(', ') +
      '.'
    );
  }

  if (criteria.minCompatibility) {
    reasons.push(
      'Compatibility is ' +
      scoreFrom(
        bundle.analysis.compatibilityScore
      ) +
      '/100.'
    );
  }

  if (criteria.minEvidence) {
    reasons.push(
      'Evidence confidence is ' +
      bundle.evidence.label +
      ' at ' +
      bundle.evidence.score +
      '/100.'
    );
  }

  const setupReasons = asArray(
    bundle.analysis.compatibility
      ?.recommendedUse
  );

  if (setupReasons.length) {
    reasons.push(
      String(setupReasons[0])
    );
  }

  if (!reasons.length) {
    reasons.push(
      'The player matches the selected search criteria and is ranked by current team fit.'
    );
  }

  return reasons.slice(0, 4);
}

async function runSearch(
  context,
  criteria = {}
) {
  let playerQuery = supabase
    .from('players')
    .select(PLAYER_FIELDS)
    .eq('is_active', true);

  playerQuery = applyRealDataFilter(
    playerQuery,
    context.req
  );

  const {
    data:rawPlayers,
    error
  } = await playerQuery
    .order(
      'overall_rating',
      { ascending:false }
    )
    .limit(300);

  if (error) throw error;

  const teams = await teamLocations(
    rawPlayers || []
  );

  const filtered = (
    rawPlayers || []
  ).filter((player) =>
    criteriaMatch(
      player,
      teams[player.team_id],
      criteria
    )
  );

  const ids = filtered.map(
    (player) => player.id
  );

  const [
    factsByPlayer,
    videosByPlayer
  ] = await Promise.all([
    loadFacts(ids, 10),
    loadVideos(ids)
  ]);

  const results = filtered
    .map((player) => {
      const facts =
        factsByPlayer[player.id] || [];

      const videos =
        videosByPlayer[player.id] || [];

      const analysis = analysePlayer(
        player,
        context.team,
        facts,
        context.prefs
      );

      const evidence = evidenceQuality(
        player,
        facts,
        videos
      );

      const bundle = {
        player,
        facts,
        videos,
        analysis,
        evidence
      };

      return {
        player:{
          ...player,
          team:
            teams[player.team_id] ||
            null
        },
        compatibilityScore:scoreFrom(
          analysis.compatibilityScore
        ),
        evidence,
        verdict:buildVerdict(
          player,
          analysis,
          evidence
        ),
        positionFit:
          buildPositionExplanation(
            player,
            analysis,
            asArray(
              criteria.positions
            )[0] ||
            playerPosition(player)
          ),
        reasons:matchReasons(
          bundle,
          criteria,
          teams[player.team_id]
        )
      };
    })
    .filter((result) => {
      if (
        criteria.minCompatibility &&
        result.compatibilityScore <
        num(criteria.minCompatibility)
      ) {
        return false;
      }

      if (
        criteria.minEvidence &&
        result.evidence.score <
        num(criteria.minEvidence)
      ) {
        return false;
      }

      return true;
    });

  const contextKey =
    criteria.contextKey ||
    'immediate_starter';

  results.forEach((result) => {
    const analysis = analysePlayer(
      result.player,
      context.team,
      factsByPlayer[result.player.id] || [],
      context.prefs
    );

    result.decisionScore =
      weightedScore(
        categoryScores({
          player:result.player,
          analysis,
          evidence:result.evidence
        }, {
          contextKey,
          targetPosition:
            asArray(
              criteria.positions
            )[0],
          budget:criteria.maxValue
        }),
        contextKey
      );
  });

  results.sort((a, b) =>
    b.decisionScore -
    a.decisionScore ||
    b.compatibilityScore -
    a.compatibilityScore
  );

  return results.slice(
    0,
    Math.min(
      100,
      num(criteria.limit, 100)
    )
  );
}

function currentPlanCycle(context) {
  const team = context.team || {};
  const scout = context.scout || {};

  let startAt =
    team.current_year_started_at ||
    team.subscription_start_at ||
    team.activated_at ||
    scout.current_year_started_at ||
    scout.subscription_start_at ||
    scout.created_at ||
    null;

  const endAt =
    team.current_year_ends_at ||
    team.subscription_renewal_at ||
    team.access_expires_at ||
    team.subscription_end_date ||
    scout.current_year_ends_at ||
    scout.subscription_renewal_at ||
    scout.access_expires_at ||
    null;

  if (!startAt && endAt) {
    const derivedStart =
      new Date(endAt);

    if (!Number.isNaN(
      derivedStart.getTime()
    )) {
      derivedStart.setUTCFullYear(
        derivedStart.getUTCFullYear() - 1
      );

      startAt =
        derivedStart.toISOString();
    }
  }

  return {
    startAt,
    endAt
  };
}

async function usageSnapshot(context) {
  const plan =
    context.team.subscription_plan ||
    context.scout.subscription_plan ||
    'Core';

  const limits =
    context.scout.scout_team_id
      ? effectiveLimits(
          plan,
          context.team.limit_overrides || {}
        )
      : limitsForPlan(plan);

  const cycle =
    currentPlanCycle(context);

  const count = async (
    table,
    dateColumn,
    configure
  ) => {
    let query = supabase
      .from(table)
      .select('id', {
        count:'exact',
        head:true
      });

    query = configure
      ? configure(query)
      : applyScope(query, context);

    if (cycle.startAt) {
      query = query.gte(
        dateColumn,
        cycle.startAt
      );
    }

    if (cycle.endAt) {
      query = query.lt(
        dateColumn,
        cycle.endAt
      );
    }

    const {
      count:result,
      error
    } = await query;

    if (error) {
      console.warn(
        '[Scout intelligence usage]',
        table,
        error.message
      );

      return 0;
    }

    return result || 0;
  };

  const [
    predictionsUsed,
    exportsUsed,
    pipelineUsed
  ] = await Promise.all([
    count(
      'predictions_log',
      'run_at',
      (query) =>
        applyScope(query, context)
    ),
    count(
      'scout_exports',
      'created_at',
      (query) =>
        applyScope(query, context)
    ),
    count(
      'recruitment_pipeline',
      'created_at',
      (query) =>
        applyScope(
          query.eq('is_active', true),
          context
        )
    )
  ]);

  return {
    plan,
    cycleStartAt:cycle.startAt,
    resetAt:cycle.endAt,
    usageScope:'current_plan_year',
    predictions:{
      used:predictionsUsed,
      limit:num(limits.predictions),
      remaining:Math.max(
        0,
        num(limits.predictions) -
        predictionsUsed
      )
    },
    exports:{
      used:exportsUsed,
      limit:num(limits.exports),
      remaining:Math.max(
        0,
        num(limits.exports) -
        exportsUsed
      )
    },
    interests:{
      used:pipelineUsed,
      limit:num(limits.interests),
      remaining:Math.max(
        0,
        num(limits.interests) -
        pipelineUsed
      )
    }
  };
}

router.use(
  requireAuth,
  requireRole('Scout')
);

router.get('/overview', async (req, res) => {
  try {
    const context = await loadContext(req);

    const [
      usage,
      tasksResponse,
      eventsResponse
    ] = await Promise.all([
      usageSnapshot(context),
      applyScope(
        supabase
          .from('scout_tasks')
          .select('*')
          .neq('status', 'completed')
          .order(
            'due_at',
            { ascending:true }
          )
          .limit(12),
        context
      ),
      applyScope(
        supabase
          .from('scout_activity_events')
          .select('*')
          .order(
            'created_at',
            { ascending:false }
          )
          .limit(12),
        context
      )
    ]);

    const tasks =
      tasksResponse.data || [];

    const activity =
      eventsResponse.data || [];

    res.json({
      brief:{
        formation:
          context.team.formation ||
          context.prefs.formation ||
          null,
        playingStyle:
          context.team.playing_style ||
          context.prefs.playingStyle ||
          null,
        weaknesses:
          context.team.team_weaknesses ||
          context.prefs.teamWeaknesses ||
          [],
        roleExpectations:
          context.team.role_expectations ||
          context.prefs.roleExpectations ||
          [],
        longTermGoals:
          context.team.long_term_goals ||
          context.prefs.longTermGoals ||
          []
      },
      usage,
      tasks,
      activity
    });
  } catch (error) {
    console.error(
      '[Scout intelligence overview]',
      error
    );

    res.status(
      error.status || 500
    ).json({
      error:
        error.message ||
        'Could not load Scout intelligence overview.'
    });
  }
});

router.get('/players/:id', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const bundle =
      await playerBundle(
        context,
        req.params.id
      );

    res.json(bundle);
  } catch (error) {
    console.error(
      '[Scout intelligence player]',
      error
    );

    res.status(
      error.status || 500
    ).json({
      error:
        error.message ||
        'Could not load player intelligence.'
    });
  }
});

router.post('/search/parse', async (req, res) => {
  try {
    res.json(
      parseNaturalLanguage(
        req.body?.query
      )
    );
  } catch (error) {
    res.status(400).json({
      error:
        'The search request could not be parsed.'
    });
  }
});

router.post('/search/run', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const criteria =
      req.body?.criteria ||
      parseNaturalLanguage(
        req.body?.query
      ).criteria;

    const data =
      await runSearch(
        context,
        criteria
      );

    await recordUsage(
      context,
      'intelligent_search',
      1,
      { criteria }
    );

    res.json({
      data,
      total:data.length,
      criteria
    });
  } catch (error) {
    console.error(
      '[Scout intelligence search]',
      error
    );

    res.status(500).json({
      error:
        'The intelligent search could not be completed.'
    });
  }
});

router.post('/compare', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const playerAId =
      req.body?.playerAId;

    const playerBId =
      req.body?.playerBId;

    if (
      !playerAId ||
      !playerBId ||
      playerAId === playerBId
    ) {
      return res.status(400).json({
        error:
          'Choose two different players.'
      });
    }

    const contextKey =
      CONTEXT_WEIGHTS[
        req.body?.contextKey
      ]
        ? req.body.contextKey
        : 'immediate_starter';

    const comparisonContext = {
      contextKey,
      targetPosition:
        cleanText(
          req.body?.targetPosition,
          20
        ) || null,
      budget:
        num(req.body?.budget) ||
        null,
      formation:
        cleanText(
          req.body?.formation,
          40
        ) ||
        context.team.formation ||
        context.prefs.formation ||
        null,
      playingStyle:
        cleanText(
          req.body?.playingStyle,
          80
        ) ||
        context.team.playing_style ||
        context.prefs.playingStyle ||
        null
    };

    const [
      bundleA,
      bundleB
    ] = await Promise.all([
      playerBundle(
        context,
        playerAId
      ),
      playerBundle(
        context,
        playerBId
      )
    ]);

    const scoresA =
      categoryScores(
        bundleA,
        comparisonContext
      );

    const scoresB =
      categoryScores(
        bundleB,
        comparisonContext
      );

    const totalA =
      weightedScore(
        scoresA,
        contextKey
      );

    const totalB =
      weightedScore(
        scoresB,
        contextKey
      );

    const winnerKey =
      totalA >= totalB
        ? 'a'
        : 'b';

    const narrative =
      comparisonNarrative(
        bundleA,
        bundleB,
        scoresA,
        scoresB,
        contextKey,
        winnerKey
      );

    const categoryRows =
      Object.keys(scoresA)
        .map((key) => ({
          key,
          playerA:
            Math.round(scoresA[key]),
          playerB:
            Math.round(scoresB[key]),
          winner:
            scoresA[key] === scoresB[key]
              ? 'tie'
              : scoresA[key] >
                scoresB[key]
                ? 'a'
                : 'b',
          margin:round(
            Math.abs(
              scoresA[key] -
              scoresB[key]
            ),
            1
          )
        }));

    const result = {
      context:{
        ...comparisonContext,
        label:
          CONTEXT_LABELS[
            contextKey
          ]
      },
      playerA:{
        player:bundleA.player,
        verdict:bundleA.verdict,
        evidence:bundleA.evidence,
        positionFit:
          buildPositionExplanation(
            bundleA.player,
            bundleA.analysis,
            comparisonContext
              .targetPosition ||
            playerPosition(
              bundleA.player
            )
          ),
        scores:scoresA,
        totalScore:totalA
      },
      playerB:{
        player:bundleB.player,
        verdict:bundleB.verdict,
        evidence:bundleB.evidence,
        positionFit:
          buildPositionExplanation(
            bundleB.player,
            bundleB.analysis,
            comparisonContext
              .targetPosition ||
            playerPosition(
              bundleB.player
            )
          ),
        scores:scoresB,
        totalScore:totalB
      },
      winner:winnerKey,
      winnerPlayerId:
        winnerKey === 'a'
          ? playerAId
          : playerBId,
      recommendation:
        narrative.recommendation,
      tradeOff:
        narrative.tradeOff,
      leads:narrative.leads,
      tradeOffs:
        narrative.tradeOffs,
      categories:categoryRows,
      sensitivity:sensitivity(
        scoresA,
        scoresB,
        bundleA,
        bundleB,
        comparisonContext
      ),
      nextActions:[
        'Review the category margins that matter most to the selected context.',
        'Confirm the leading player through a live observation.',
        'Record the decision rationale before moving the player to the next pipeline stage.'
      ]
    };

    let saved = null;

    if (req.body?.save) {
      const {
        data,
        error
      } = await supabase
        .from('scout_comparisons')
        .insert({
          scout_id:
            context.scout.id,
          scout_team_id:
            context.scout
              .scout_team_id ||
            null,
          player_a_id:playerAId,
          player_b_id:playerBId,
          comparison_context:
            comparisonContext,
          result
        })
        .select()
        .single();

      if (error) throw error;

      saved = data;

      await createActivity(
        context,
        {
          eventType:
            'comparison_saved',
          playerId:
            result.winnerPlayerId,
          title:
            'Player comparison saved',
          body:
            result.recommendation,
          data:{
            comparisonId:data.id,
            playerAId,
            playerBId
          }
        }
      );
    }

    await recordUsage(
      context,
      'comparison',
      1,
      {
        playerAId,
        playerBId,
        contextKey,
        saved:!!saved
      }
    );

    res.json({
      result,
      comparison:saved
    });
  } catch (error) {
    console.error(
      '[Scout intelligence comparison]',
      error
    );

    res.status(
      error.status || 500
    ).json({
      error:
        error.message ||
        'The comparison could not be completed.'
    });
  }
});

router.get('/comparisons', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_comparisons')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
      )
      .limit(100);

    query = applyScope(
      query,
      context
    );

    const { data, error } =
      await query;

    if (error) throw error;

    const rows = data || [];

    const players =
      await loadPlayers(
        context,
        rows.flatMap((row) => [
          row.player_a_id,
          row.player_b_id
        ])
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    res.json({
      data:rows.map((row) => ({
        ...row,
        playerA:
          byId[row.player_a_id] ||
          null,
        playerB:
          byId[row.player_b_id] ||
          null
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Saved comparisons could not be loaded.'
    });
  }
});

router.post('/decisions', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const playerId =
      req.body?.playerId;

    const decision =
      cleanText(
        req.body?.decision,
        80
      );

    if (!playerId || !decision) {
      return res.status(400).json({
        error:
          'playerId and decision are required.'
      });
    }

    const bundle =
      await playerBundle(
        context,
        playerId
      );

    const row = {
      scout_id:
        context.scout.id,
      scout_team_id:
        context.scout.scout_team_id ||
        null,
      player_id:playerId,
      comparison_id:
        req.body?.comparisonId ||
        null,
      pipeline_id:
        req.body?.pipelineId ||
        null,
      decision,
      reason_code:
        cleanText(
          req.body?.reasonCode,
          100
        ) || null,
      rationale:
        cleanText(
          req.body?.rationale,
          4000
        ) || null,
      next_action:
        cleanText(
          req.body?.nextAction,
          500
        ) || null,
      due_at:
        req.body?.dueAt ||
        null,
      decision_context:
        req.body?.context ||
        {},
      model_snapshot:{
        verdict:bundle.verdict,
        evidence:bundle.evidence,
        positionFit:
          bundle.positionFit,
        compatibilityScore:
          bundle.analysis
            .compatibilityScore
      }
    };

    const {
      data,
      error
    } = await supabase
      .from('scout_decisions')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    await createActivity(
      context,
      {
        eventType:
          'decision_recorded',
        playerId,
        title:
          'Recruitment decision recorded',
        body:
          decision +
          (
            row.rationale
              ? ': ' + row.rationale
              : ''
          ),
        data:{
          decisionId:data.id,
          nextAction:
            row.next_action
        }
      }
    );

    res.status(201).json({
      decision:data
    });
  } catch (error) {
    console.error(
      '[Scout decision]',
      error
    );

    res.status(500).json({
      error:
        'The decision could not be saved.'
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let decisions = supabase
      .from('scout_decisions')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
      )
      .limit(150);

    decisions = applyScope(
      decisions,
      context
    );

    let events = supabase
      .from('scout_activity_events')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
      )
      .limit(150);

    events = applyScope(
      events,
      context
    );

    const [
      decisionResult,
      eventResult
    ] = await Promise.all([
      decisions,
      events
    ]);

    if (decisionResult.error) {
      throw decisionResult.error;
    }

    if (eventResult.error) {
      throw eventResult.error;
    }

    const decisionRows =
      decisionResult.data || [];

    const players =
      await loadPlayers(
        context,
        decisionRows.map(
          (row) => row.player_id
        )
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    res.json({
      decisions:
        decisionRows.map((row) => ({
          ...row,
          player:
            byId[row.player_id] ||
            null
        })),
      activity:
        eventResult.data || []
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Decision history could not be loaded.'
    });
  }
});

router.get('/saved-searches', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_saved_searches')
      .select('*')
      .eq('is_active', true)
      .order(
        'updated_at',
        { ascending:false }
      );

    query = applyScope(
      query,
      context
    );

    const { data, error } =
      await query;

    if (error) throw error;

    res.json({
      data:data || []
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Saved searches could not be loaded.'
    });
  }
});

router.post('/saved-searches', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const name =
      cleanText(
        req.body?.name,
        180
      );

    if (!name) {
      return res.status(400).json({
        error:
          'A search name is required.'
      });
    }

    const parsed =
      req.body?.query
        ? parseNaturalLanguage(
            req.body.query
          )
        : {
            criteria:
              req.body?.criteria ||
              {}
          };

    const {
      data,
      error
    } = await supabase
      .from('scout_saved_searches')
      .insert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        name,
        natural_language_query:
          cleanText(
            req.body?.query,
            500
          ) || null,
        criteria:
          req.body?.criteria ||
          parsed.criteria ||
          {},
        alert_rules:
          req.body?.alertRules ||
          {},
        alerts_enabled:
          !!req.body?.alertsEnabled
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      savedSearch:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The search could not be saved.'
    });
  }
});

router.patch('/saved-searches/:id', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const updates = {};

    if (req.body?.name !== undefined) {
      updates.name =
        cleanText(
          req.body.name,
          180
        );
    }

    if (req.body?.criteria !== undefined) {
      updates.criteria =
        req.body.criteria || {};
    }

    if (req.body?.alertRules !== undefined) {
      updates.alert_rules =
        req.body.alertRules || {};
    }

    if (req.body?.alertsEnabled !== undefined) {
      updates.alerts_enabled =
        !!req.body.alertsEnabled;
    }

    if (req.body?.isActive !== undefined) {
      updates.is_active =
        !!req.body.isActive;
    }

    let query = supabase
      .from('scout_saved_searches')
      .update(updates)
      .eq('id', req.params.id);

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error:
          'Saved search not found.'
      });
    }

    res.json({
      savedSearch:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The saved search could not be updated.'
    });
  }
});

router.delete('/saved-searches/:id', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_saved_searches')
      .update({
        is_active:false
      })
      .eq('id', req.params.id);

    query = applyScope(
      query,
      context
    );

    const { error } =
      await query;

    if (error) throw error;

    res.json({
      message:
        'Saved search removed.'
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The saved search could not be removed.'
    });
  }
});

router.post('/saved-searches/:id/run', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_saved_searches')
      .select('*')
      .eq('id', req.params.id);

    query = applyScope(
      query,
      context
    );

    const {
      data:search,
      error
    } = await query
      .maybeSingle();

    if (error) throw error;

    if (!search) {
      return res.status(404).json({
        error:
          'Saved search not found.'
      });
    }

    const results =
      await runSearch(
        context,
        search.criteria || {}
      );

    const ids = results.map(
      (result) => result.player.id
    );

    const {
      error:updateError
    } = await supabase
      .from('scout_saved_searches')
      .update({
        last_result_ids:ids,
        last_result_count:
          ids.length,
        last_run_at:
          new Date().toISOString()
      })
      .eq('id', search.id);

    if (updateError) {
      throw updateError;
    }

    res.json({
      data:results,
      total:results.length,
      savedSearch:search
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The saved search could not be run.'
    });
  }
});

router.get('/watches', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_player_watches')
      .select('*')
      .eq('status', 'active')
      .order(
        'updated_at',
        { ascending:false }
      );

    query = applyScope(
      query,
      context
    );

    const { data, error } =
      await query;

    if (error) throw error;

    const rows = data || [];

    const players =
      await loadPlayers(
        context,
        rows.map(
          (row) => row.player_id
        )
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    res.json({
      data:rows.map((row) => ({
        ...row,
        player:
          byId[row.player_id] ||
          null
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Watched players could not be loaded.'
    });
  }
});

router.post('/watches', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const playerId =
      req.body?.playerId;

    if (!playerId) {
      return res.status(400).json({
        error:
          'playerId is required.'
      });
    }

    const bundle =
      await playerBundle(
        context,
        playerId
      );

    const {
      data,
      error
    } = await supabase
      .from('scout_player_watches')
      .upsert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        player_id:playerId,
        reason:
          cleanText(
            req.body?.reason,
            1000
          ) || null,
        thresholds:
          req.body?.thresholds ||
          {},
        status:'active',
        last_snapshot:{
          overall:scoreFrom(
            bundle.player
              .overall_rating
          ),
          compatibility:scoreFrom(
            bundle.analysis
              .compatibilityScore
          ),
          evidence:
            bundle.evidence.score,
          updatedAt:
            bundle.player.updated_at
        }
      }, {
        onConflict:
          'scout_id,player_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      watch:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The player watch could not be saved.'
    });
  }
});

router.patch('/watches/:id', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const updates = {};

    if (req.body?.reason !== undefined) {
      updates.reason =
        cleanText(
          req.body.reason,
          1000
        );
    }

    if (req.body?.thresholds !== undefined) {
      updates.thresholds =
        req.body.thresholds || {};
    }

    if (req.body?.status !== undefined) {
      updates.status =
        cleanText(
          req.body.status,
          40
        );
    }

    let query = supabase
      .from('scout_player_watches')
      .update(updates)
      .eq('id', req.params.id);

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error:'Watch not found.'
      });
    }

    res.json({
      watch:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The player watch could not be updated.'
    });
  }
});

router.post('/alerts/evaluate', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let savedQuery = supabase
      .from('scout_saved_searches')
      .select('*')
      .eq('is_active', true)
      .eq('alerts_enabled', true);

    savedQuery = applyScope(
      savedQuery,
      context
    );

    let watchQuery = supabase
      .from('scout_player_watches')
      .select('*')
      .eq('status', 'active');

    watchQuery = applyScope(
      watchQuery,
      context
    );

    const [
      savedResult,
      watchResult
    ] = await Promise.all([
      savedQuery,
      watchQuery
    ]);

    if (savedResult.error) {
      throw savedResult.error;
    }

    if (watchResult.error) {
      throw watchResult.error;
    }

    const alerts = [];

    for (
      const search of
      savedResult.data || []
    ) {
      const results =
        await runSearch(
          context,
          search.criteria || {}
        );

      const currentIds =
        results.map(
          (result) =>
            result.player.id
        );

      const previousIds =
        asArray(
          search.last_result_ids
        );

      const newIds =
        currentIds.filter(
          (id) =>
            !previousIds.includes(id)
        );

      if (
        newIds.length &&
        previousIds.length
      ) {
        const event =
          await createActivity(
            context,
            {
              eventType:
                'saved_search_match',
              playerId:newIds[0],
              title:
                'New players match ' +
                search.name,
              body:
                newIds.length +
                ' new player(s) now match this saved search.',
              severity:'action',
              data:{
                savedSearchId:
                  search.id,
                playerIds:newIds
              }
            }
          );

        alerts.push(event);
      }

      await supabase
        .from('scout_saved_searches')
        .update({
          last_result_ids:
            currentIds,
          last_result_count:
            currentIds.length,
          last_run_at:
            new Date().toISOString()
        })
        .eq('id', search.id);
    }

    for (
      const watch of
      watchResult.data || []
    ) {
      const bundle =
        await playerBundle(
          context,
          watch.player_id
        );

      const thresholds =
        watch.thresholds || {};

      const snapshot = {
        overall:scoreFrom(
          bundle.player.overall_rating
        ),
        compatibility:scoreFrom(
          bundle.analysis
            .compatibilityScore
        ),
        evidence:
          bundle.evidence.score,
        updatedAt:
          bundle.player.updated_at
      };

      const previous =
        watch.last_snapshot || {};

      const changes = [];

      if (
        thresholds.minOverall &&
        snapshot.overall >=
          num(thresholds.minOverall) &&
        num(previous.overall) <
          num(thresholds.minOverall)
      ) {
        changes.push(
          'Overall crossed ' +
          thresholds.minOverall +
          '/100'
        );
      }

      if (
        thresholds.minCompatibility &&
        snapshot.compatibility >=
          num(
            thresholds.minCompatibility
          ) &&
        num(
          previous.compatibility
        ) <
          num(
            thresholds.minCompatibility
          )
      ) {
        changes.push(
          'Compatibility crossed ' +
          thresholds.minCompatibility +
          '/100'
        );
      }

      if (
        thresholds.minEvidence &&
        snapshot.evidence >=
          num(thresholds.minEvidence) &&
        num(previous.evidence) <
          num(thresholds.minEvidence)
      ) {
        changes.push(
          'Evidence confidence crossed ' +
          thresholds.minEvidence +
          '/100'
        );
      }

      if (
        bundle.player.updated_at &&
        (
          !watch.last_notified_at ||
          new Date(
            bundle.player.updated_at
          ) >
          new Date(
            watch.last_notified_at
          )
        )
      ) {
        if (
          thresholds.anyProfileUpdate
        ) {
          changes.push(
            'Player profile was updated'
          );
        }
      }

      if (changes.length) {
        const event =
          await createActivity(
            context,
            {
              eventType:
                'watched_player_change',
              playerId:
                watch.player_id,
              title:
                playerName(
                  bundle.player
                ) +
                ' changed',
              body:
                changes.join(' · '),
              severity:'action',
              data:{
                watchId:watch.id,
                snapshot,
                changes
              }
            }
          );

        alerts.push(event);

        await supabase
          .from(
            'scout_player_watches'
          )
          .update({
            last_snapshot:snapshot,
            last_notified_at:
              new Date()
                .toISOString()
          })
          .eq('id', watch.id);
      } else {
        await supabase
          .from(
            'scout_player_watches'
          )
          .update({
            last_snapshot:snapshot
          })
          .eq('id', watch.id);
      }
    }

    res.json({
      alerts,
      count:alerts.length
    });
  } catch (error) {
    console.error(
      '[Scout alerts evaluate]',
      error
    );

    res.status(500).json({
      error:
        'Scout alerts could not be evaluated.'
    });
  }
});

router.get('/rankings', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const rankingType =
      cleanText(
        req.query.type ||
        'team_fit',
        40
      );

    const criteria = {
      ageGroup:
        req.query.ageGroup ||
        null,
      positions:
        req.query.position
          ? [req.query.position]
          : [],
      limit:100
    };

    const results =
      await runSearch(
        context,
        criteria
      );

    const ranked = results
      .map((result) => {
        const score =
          rankingType === 'readiness'
            ? result.verdict
                .readiness
            : rankingType ===
              'development'
              ? result.verdict
                  .potential
              : rankingType ===
                'evidence'
                ? result.evidence
                    .score
                : rankingType ===
                  'value'
                  ? result
                      .decisionScore
                  : result
                      .compatibilityScore;

        return {
          ...result,
          rankingType,
          rankingScore:
            Math.round(score),
          rankingReasons:[
            result.reasons[0],
            'Evidence confidence is ' +
            result.evidence.label +
            '.',
            'Current verdict: ' +
            result.verdict.label +
            '.'
          ].filter(Boolean)
        };
      })
      .sort(
        (a, b) =>
          b.rankingScore -
          a.rankingScore
      )
      .map(
        (result, index) => ({
          ...result,
          rank:index + 1
        })
      );

    res.json({
      data:ranked,
      rankingType
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Explainable rankings could not be loaded.'
    });
  }
});

router.get('/fixtures', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let pipelineQuery = supabase
      .from('recruitment_pipeline')
      .select(
        'id,player_id,stage,interest_level,next_action_due_at,assigned_scout_id'
      )
      .eq('is_active', true);

    pipelineQuery = applyScope(
      pipelineQuery,
      context
    );

    const {
      data:pipeline,
      error:pipelineError
    } = await pipelineQuery;

    if (pipelineError) {
      throw pipelineError;
    }

    const playerIds = (
      pipeline || []
    ).map(
      (row) => row.player_id
    );

    const players =
      await loadPlayers(
        context,
        playerIds
      );

    const playersById =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    const teamIds = [
      ...new Set(
        players
          .map(
            (player) =>
              player.team_id
          )
          .filter(Boolean)
      )
    ];

    if (!teamIds.length) {
      return res.json({
        data:[]
      });
    }

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const {
      data:fixtures,
      error
    } = await supabase
      .from('fixtures')
      .select('*')
      .in('team_id', teamIds)
      .gte(
        'fixture_date',
        today
      )
      .order(
        'fixture_date',
        { ascending:true }
      )
      .limit(100);

    if (error) throw error;

    let planQuery = supabase
      .from('scout_fixture_plans')
      .select('*');

    planQuery = applyScope(
      planQuery,
      context
    );

    const {
      data:plans
    } = await planQuery;

    const plansByKey = {};

    (plans || []).forEach((plan) => {
      plansByKey[
        plan.fixture_id +
        ':' +
        (plan.player_id || '')
      ] = plan;
    });

    const rows = [];

    for (
      const fixture of
      fixtures || []
    ) {
      const related =
        players.filter(
          (player) =>
            player.team_id ===
            fixture.team_id
        );

      for (const player of related) {
        const pipelineRow = (
          pipeline || []
        ).find(
          (row) =>
            row.player_id ===
            player.id
        );

        const bundle =
          await playerBundle(
            context,
            player.id
          );

        const stagePriority = {
          negotiating:30,
          approached:24,
          shortlisted:18,
          watching:10
        }[pipelineRow?.stage] || 8;

        const evidenceNeed =
          Math.max(
            0,
            70 -
            bundle.evidence.score
          ) * 0.35;

        const compatibility =
          bundle.verdict
            .compatibility *
          0.35;

        const priority =
          Math.round(
            Math.min(
              100,
              stagePriority +
              evidenceNeed +
              compatibility
            )
          );

        rows.push({
          fixture,
          player:
            playersById[player.id] ||
            player,
          pipeline:pipelineRow,
          priority,
          plan:
            plansByKey[
              fixture.id +
              ':' +
              player.id
            ] || null,
          reasons:[
            'Pipeline stage: ' +
            (
              pipelineRow?.stage ||
              'watching'
            ) +
            '.',
            'Compatibility: ' +
            bundle.verdict
              .compatibility +
            '/100.',
            bundle.evidence.score < 65
              ? 'Live observation would materially improve evidence confidence.'
              : 'Evidence is already strong; use the fixture to confirm role execution.'
          ]
        });
      }
    }

    rows.sort((a, b) =>
      b.priority -
      a.priority ||
      new Date(
        a.fixture.fixture_date
      ) -
      new Date(
        b.fixture.fixture_date
      )
    );

    res.json({
      data:rows
    });
  } catch (error) {
    console.error(
      '[Scout fixture intelligence]',
      error
    );

    res.status(500).json({
      error:
        'Fixture intelligence could not be loaded.'
    });
  }
});

router.post('/fixture-plans', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    if (!req.body?.fixtureId) {
      return res.status(400).json({
        error:
          'fixtureId is required.'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('scout_fixture_plans')
      .upsert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        fixture_id:
          req.body.fixtureId,
        player_id:
          req.body.playerId ||
          null,
        assigned_scout_id:
          req.body.assignedScoutId ||
          context.scout.id,
        priority:
          Math.round(
            clamp(
              req.body.priority ||
              50
            )
          ),
        objective:
          cleanText(
            req.body.objective,
            1600
          ) || null,
        travel_notes:
          cleanText(
            req.body.travelNotes,
            1600
          ) || null,
        status:
          cleanText(
            req.body.status ||
            'planned',
            40
          )
      }, {
        onConflict:
          'scout_id,fixture_id,player_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      plan:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The fixture plan could not be saved.'
    });
  }
});

router.get('/observations', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_observations')
      .select('*')
      .order(
        'observation_date',
        { ascending:false }
      )
      .limit(150);

    if (req.query.playerId) {
      query = query.eq(
        'player_id',
        req.query.playerId
      );
    }

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query;

    if (error) throw error;

    const rows = data || [];

    const players =
      await loadPlayers(
        context,
        rows.map(
          (row) => row.player_id
        )
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    res.json({
      data:rows.map((row) => ({
        ...row,
        player:
          byId[row.player_id] ||
          null
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Observations could not be loaded.'
    });
  }
});

router.post('/observations', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const playerId =
      req.body?.playerId;

    if (!playerId) {
      return res.status(400).json({
        error:
          'playerId is required.'
      });
    }

    const bundle =
      await playerBundle(
        context,
        playerId
      );

    const observed =
      req.body?.structuredRatings ||
      {};

    const predicted = {
      technical:scoreFrom(
        bundle.analysis
          .overallBreakdown
          ?.technicalScore
      ),
      tactical:scoreFrom(
        bundle.analysis
          .overallBreakdown
          ?.tacticalScore
      ),
      physical:scoreFrom(
        bundle.analysis
          .overallBreakdown
          ?.physicalProfileScore
      ),
      mental:scoreFrom(
        bundle.analysis
          .overallBreakdown
          ?.mentalCoachabilityScore
      ),
      readiness:
        bundle.verdict.readiness
    };

    const deltas = {};

    Object.keys(observed)
      .forEach((key) => {
        if (
          Number.isFinite(
            Number(observed[key])
          ) &&
          predicted[key] !== undefined
        ) {
          deltas[key] = round(
            Number(observed[key]) -
            predicted[key],
            1
          );
        }
      });

    const {
      data,
      error
    } = await supabase
      .from('scout_observations')
      .insert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        player_id:playerId,
        fixture_id:
          req.body?.fixtureId ||
          null,
        observation_date:
          req.body?.observationDate ||
          new Date().toISOString(),
        objective:
          cleanText(
            req.body?.objective,
            1500
          ) || null,
        starting_position:
          cleanText(
            req.body
              ?.startingPosition,
            40
          ) || null,
        role_observed:
          cleanText(
            req.body?.roleObserved,
            100
          ) || null,
        first_half_rating:
          num(
            req.body
              ?.firstHalfRating
          ) || null,
        second_half_rating:
          num(
            req.body
              ?.secondHalfRating
          ) || null,
        technical_notes:
          cleanText(
            req.body
              ?.technicalNotes,
            4000
          ) || null,
        physical_notes:
          cleanText(
            req.body
              ?.physicalNotes,
            4000
          ) || null,
        tactical_notes:
          cleanText(
            req.body
              ?.tacticalNotes,
            4000
          ) || null,
        mental_notes:
          cleanText(
            req.body
              ?.mentalNotes,
            4000
          ) || null,
        key_incidents:
          asArray(
            req.body?.keyIncidents
          ),
        strengths:
          asArray(
            req.body?.strengths
          ),
        risks:
          asArray(
            req.body?.risks
          ),
        recommendation:
          cleanText(
            req.body
              ?.recommendation,
            120
          ) || null,
        follow_up_action:
          cleanText(
            req.body
              ?.followUpAction,
            1000
          ) || null,
        structured_ratings:
          observed,
        model_snapshot:{
          verdict:
            bundle.verdict,
          evidence:
            bundle.evidence,
          positionFit:
            bundle.positionFit,
          predicted
        },
        model_alignment:{
          deltas,
          summary:
            Object.keys(deltas).length
              ? 'Observation compared with the ScoutLink model. Positive values are stronger live evidence; negative values are weaker live evidence.'
              : 'No structured observation ratings were supplied.'
        }
      })
      .select()
      .single();

    if (error) throw error;

    await createActivity(
      context,
      {
        eventType:
          'observation_recorded',
        playerId,
        title:
          'Live observation recorded',
        body:
          (
            data.recommendation ||
            'Observation saved'
          ) +
          (
            data.follow_up_action
              ? ' · ' +
                data.follow_up_action
              : ''
          ),
        data:{
          observationId:data.id,
          fixtureId:
            data.fixture_id
        }
      }
    );

    res.status(201).json({
      observation:data
    });
  } catch (error) {
    console.error(
      '[Scout observation]',
      error
    );

    res.status(500).json({
      error:
        'The observation could not be saved.'
    });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_tasks')
      .select('*')
      .order(
        'due_at',
        { ascending:true }
      );

    if (req.query.status) {
      query = query.eq(
        'status',
        req.query.status
      );
    }

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query;

    if (error) throw error;

    const rows = data || [];

    const players =
      await loadPlayers(
        context,
        rows.map(
          (row) => row.player_id
        )
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    res.json({
      data:rows.map((row) => ({
        ...row,
        player:
          byId[row.player_id] ||
          null
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Scout tasks could not be loaded.'
    });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const title =
      cleanText(
        req.body?.title,
        220
      );

    if (!title) {
      return res.status(400).json({
        error:
          'A task title is required.'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('scout_tasks')
      .insert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        assigned_scout_id:
          req.body
            ?.assignedScoutId ||
          context.scout.id,
        player_id:
          req.body?.playerId ||
          null,
        pipeline_id:
          req.body?.pipelineId ||
          null,
        fixture_id:
          req.body?.fixtureId ||
          null,
        title,
        description:
          cleanText(
            req.body?.description,
            2000
          ) || null,
        priority:
          cleanText(
            req.body?.priority ||
            'medium',
            30
          ),
        status:'open',
        due_at:
          req.body?.dueAt ||
          null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      task:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The task could not be created.'
    });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const updates = {};

    [
      'title',
      'description',
      'priority',
      'status',
      'due_at',
      'assigned_scout_id'
    ].forEach((field) => {
      if (
        req.body?.[field] !==
        undefined
      ) {
        updates[field] =
          req.body[field];
      }
    });

    if (
      updates.status ===
      'completed'
    ) {
      updates.completed_at =
        new Date().toISOString();
    }

    let query = supabase
      .from('scout_tasks')
      .update(updates)
      .eq('id', req.params.id);

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error:
          'Task not found.'
      });
    }

    res.json({
      task:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The task could not be updated.'
    });
  }
});

router.patch('/pipeline/:id', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const updates = {};

    const map = {
      stage:'stage',
      decisionReason:
        'decision_reason',
      decisionRationale:
        'decision_rationale',
      nextAction:
        'next_action',
      nextActionDueAt:
        'next_action_due_at',
      assignedScoutId:
        'assigned_scout_id',
      recruitmentRisk:
        'recruitment_risk',
      evidenceConfidence:
        'evidence_confidence',
      decisionContext:
        'decision_context',
      archivedReason:
        'archived_reason'
    };

    Object.entries(map)
      .forEach(
        ([input, column]) => {
          if (
            req.body?.[input] !==
            undefined
          ) {
            updates[column] =
              req.body[input];
          }
        }
      );

    updates.last_reviewed_at =
      new Date().toISOString();

    if (req.body?.reopen) {
      updates.is_active = true;
      updates.reopened_at =
        new Date().toISOString();
      updates.archived_reason =
        null;
    }

    let query = supabase
      .from('recruitment_pipeline')
      .update(updates)
      .eq('id', req.params.id);

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error:
          'Pipeline item not found.'
      });
    }

    await createActivity(
      context,
      {
        eventType:
          'pipeline_updated',
        playerId:data.player_id,
        title:
          'Pipeline decision updated',
        body:[
          data.stage
            ? 'Stage ' +
              data.stage
            : '',
          data.next_action
            ? 'Next: ' +
              data.next_action
            : ''
        ]
          .filter(Boolean)
          .join(' · '),
        data:{
          pipelineId:data.id
        }
      }
    );

    res.json({
      pipeline:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The pipeline decision could not be updated.'
    });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const subjectType =
      cleanText(
        req.query.subjectType,
        60
      );

    const subjectId =
      req.query.subjectId;

    if (!subjectType || !subjectId) {
      return res.status(400).json({
        error:
          'subjectType and subjectId are required.'
      });
    }

    let query = supabase
      .from('scout_comments')
      .select('*')
      .eq(
        'subject_type',
        subjectType
      )
      .eq(
        'subject_id',
        subjectId
      )
      .order(
        'created_at',
        { ascending:true }
      );

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query;

    if (error) throw error;

    const rows = data || [];

    const scoutIds = [
      ...new Set(
        rows
          .map(
            (row) =>
              row.scout_id
          )
          .filter(Boolean)
      )
    ];

    let authors = [];

    if (scoutIds.length) {
      const authorResult =
        await supabase
          .from('scouts')
          .select(
            'id,first_name,last_name'
          )
          .in('id', scoutIds);

      if (!authorResult.error) {
        authors =
          authorResult.data || [];
      }
    }

    const byId =
      Object.fromEntries(
        authors.map((author) => [
          author.id,
          author
        ])
      );

    res.json({
      data:rows.map((row) => ({
        ...row,
        author:
          byId[row.scout_id] ||
          null
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Team comments could not be loaded.'
    });
  }
});

router.post('/comments', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const subjectType =
      cleanText(
        req.body?.subjectType,
        60
      );

    const subjectId =
      req.body?.subjectId;

    const body =
      cleanText(
        req.body?.body,
        4000
      );

    if (
      !subjectType ||
      !subjectId ||
      !body
    ) {
      return res.status(400).json({
        error:
          'subjectType, subjectId and body are required.'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('scout_comments')
      .insert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        subject_type:
          subjectType,
        subject_id:subjectId,
        body,
        mentions:
          asArray(
            req.body?.mentions
          ),
        visibility:
          cleanText(
            req.body?.visibility ||
            'team',
            30
          )
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      comment:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The team comment could not be posted.'
    });
  }
});

router.post('/votes', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const subjectType =
      cleanText(
        req.body?.subjectType,
        60
      );

    const subjectId =
      req.body?.subjectId;

    const vote =
      cleanText(
        req.body?.vote,
        40
      );

    if (
      !subjectType ||
      !subjectId ||
      !vote
    ) {
      return res.status(400).json({
        error:
          'subjectType, subjectId and vote are required.'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('scout_decision_votes')
      .upsert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        subject_type:
          subjectType,
        subject_id:subjectId,
        vote,
        rationale:
          cleanText(
            req.body?.rationale,
            2000
          ) || null
      }, {
        onConflict:
          'scout_id,subject_type,subject_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      vote:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The vote could not be saved.'
    });
  }
});

router.get('/shortlists', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_shortlists')
      .select('*')
      .order(
        'updated_at',
        { ascending:false }
      );

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query;

    if (error) throw error;

    const lists = data || [];

    const listIds = lists.map(
      (list) => list.id
    );

    let items = [];

    if (listIds.length) {
      const itemResult =
        await supabase
          .from(
            'scout_shortlist_players'
          )
          .select('*')
          .in(
            'shortlist_id',
            listIds
          )
          .order(
            'created_at',
            { ascending:false }
          );

      if (itemResult.error) {
        throw itemResult.error;
      }

      items =
        itemResult.data || [];
    }

    const players =
      await loadPlayers(
        context,
        items.map(
          (item) => item.player_id
        )
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    const itemsByList = {};

    items.forEach((item) => {
      if (
        !itemsByList[
          item.shortlist_id
        ]
      ) {
        itemsByList[
          item.shortlist_id
        ] = [];
      }

      itemsByList[
        item.shortlist_id
      ].push({
        ...item,
        player:
          byId[item.player_id] ||
          null
      });
    });

    res.json({
      data:lists.map((list) => ({
        ...list,
        players:
          itemsByList[list.id] ||
          []
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Shortlists could not be loaded.'
    });
  }
});

router.post('/shortlists', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const name =
      cleanText(
        req.body?.name,
        180
      );

    if (!name) {
      return res.status(400).json({
        error:
          'A shortlist name is required.'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('scout_shortlists')
      .insert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        name,
        description:
          cleanText(
            req.body?.description,
            1200
          ) || null,
        context:
          req.body?.context ||
          {},
        is_shared:
          req.body?.isShared !==
          false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      shortlist:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The shortlist could not be created.'
    });
  }
});

router.post('/shortlists/:id/players', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let shortlistQuery = supabase
      .from('scout_shortlists')
      .select('id')
      .eq('id', req.params.id);

    shortlistQuery = applyScope(
      shortlistQuery,
      context
    );

    const {
      data:shortlist,
      error:shortlistError
    } = await shortlistQuery
      .maybeSingle();

    if (shortlistError) {
      throw shortlistError;
    }

    if (!shortlist) {
      return res.status(404).json({
        error:
          'Shortlist not found.'
      });
    }

    if (!req.body?.playerId) {
      return res.status(400).json({
        error:
          'playerId is required.'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from(
        'scout_shortlist_players'
      )
      .upsert({
        shortlist_id:
          shortlist.id,
        player_id:
          req.body.playerId,
        added_by:
          context.scout.id,
        note:
          cleanText(
            req.body?.note,
            1000
          ) || null
      }, {
        onConflict:
          'shortlist_id,player_id'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      item:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The player could not be added to the shortlist.'
    });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    let query = supabase
      .from('scout_reports')
      .select('*')
      .order(
        'created_at',
        { ascending:false }
      )
      .limit(150);

    query = applyScope(
      query,
      context
    );

    const {
      data,
      error
    } = await query;

    if (error) throw error;

    const rows = data || [];

    const playerIds = rows
      .filter(
        (row) =>
          row.subject_type ===
            'player' &&
          row.subject_id
      )
      .map(
        (row) => row.subject_id
      );

    const players =
      await loadPlayers(
        context,
        playerIds
      );

    const byId =
      Object.fromEntries(
        players.map((player) => [
          player.id,
          player
        ])
      );

    res.json({
      data:rows.map((row) => ({
        ...row,
        player:
          row.subject_type ===
          'player'
            ? byId[
                row.subject_id
              ] || null
            : null
      }))
    });
  } catch (error) {
    res.status(500).json({
      error:
        'Reports could not be loaded.'
    });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const reportType =
      cleanText(
        req.body?.reportType,
        80
      );

    const subjectType =
      cleanText(
        req.body?.subjectType,
        80
      );

    const title =
      cleanText(
        req.body?.title,
        220
      );

    if (
      !reportType ||
      !subjectType ||
      !title
    ) {
      return res.status(400).json({
        error:
          'reportType, subjectType and title are required.'
      });
    }

    let snapshot =
      req.body?.snapshot || {};

    if (
      !Object.keys(snapshot).length &&
      subjectType === 'player' &&
      req.body?.subjectId
    ) {
      const bundle =
        await playerBundle(
          context,
          req.body.subjectId
        );

      snapshot = {
        player:bundle.player,
        verdict:bundle.verdict,
        evidence:bundle.evidence,
        positionFit:
          bundle.positionFit,
        analysis:bundle.analysis,
        timeline:bundle.timeline
      };
    }

    const {
      data,
      error
    } = await supabase
      .from('scout_reports')
      .insert({
        scout_id:
          context.scout.id,
        scout_team_id:
          context.scout
            .scout_team_id ||
          null,
        report_type:
          reportType,
        subject_type:
          subjectType,
        subject_id:
          req.body?.subjectId ||
          null,
        title,
        config:
          req.body?.config ||
          {},
        snapshot,
        file_name:
          cleanText(
            req.body?.fileName,
            260
          ) || null
      })
      .select()
      .single();

    if (error) throw error;

    await recordUsage(
      context,
      'intelligence_report',
      1,
      {
        reportType,
        subjectType,
        subjectId:
          req.body?.subjectId ||
          null
      }
    );

    res.status(201).json({
      report:data
    });
  } catch (error) {
    res.status(500).json({
      error:
        'The report could not be created.'
    });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const context =
      await loadContext(req);

    const usage =
      await usageSnapshot(context);

    res.json(usage);
  } catch (error) {
    res.status(500).json({
      error:
        'Usage could not be loaded.'
    });
  }
});

module.exports = router;
