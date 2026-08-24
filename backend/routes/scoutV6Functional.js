'use strict';

const express = require('express');
const router = express.Router();

const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { analysePlayer, config, utils } = require('../engines');
const { applyRealDataFilter } = require('../utils/demo');
const { getScoutUsageSnapshot } = require('../utils/scoutUsage');
const { createNotifications } = require('../services/notifications');

const VALID_PIPELINE_STAGES = new Set([
  'watching',
  'interested',
  'shortlisted',
  'approached',
  'trial_pending',
  'negotiating',
  'signed',
  'rejected',
  'closed'
]);

const DISPLAY_STAGE_MAP = Object.freeze({
  watching: 'Watching',
  interested: 'Monitoring',
  shortlisted: 'Shortlisted',
  approached: 'Progressed',
  trial_pending: 'Trial Pending',
  negotiating: 'Progressed',
  signed: 'Progressed',
  rejected: 'Closed',
  closed: 'Closed'
});

const INPUT_STAGE_MAP = Object.freeze({
  watching: 'watching',
  monitoring: 'interested',
  interested: 'interested',
  shortlisted: 'shortlisted',
  'trial pending': 'trial_pending',
  trial_pending: 'trial_pending',
  progressed: 'approached',
  approached: 'approached',
  negotiating: 'negotiating',
  signed: 'signed',
  rejected: 'rejected',
  closed: 'closed'
});


/*
 * Scout Setup options come directly from the active V4 scoring configuration.
 * The UI is therefore never allowed to invent a formation, playing style,
 * required role, team need or long-term development plan that the engine
 * cannot consume.
 */
function catalogueOptions(catalogue, extra) {
  return Object.entries(catalogue || {}).map(([value, item]) => ({
    value,
    label: clean(item?.label || value, 180),
    ...(typeof extra === 'function' ? extra(value, item) : {})
  }));
}

function optionValue(raw, options) {
  const value = clean(raw, 180);
  if (!value) return '';
  const lower = value.toLowerCase();
  const match = (options || []).find(option =>
    String(option.value || '').toLowerCase() === lower ||
    String(option.label || '').toLowerCase() === lower
  );
  return match ? match.value : '';
}

const TEAM_NEED_OPTIONS = Object.freeze(
  catalogueOptions(config.TEAM_NEED_PROFILES)
);

const REQUIRED_ROLE_OPTIONS = Object.freeze(
  catalogueOptions(config.ROLE_PROFILES, (_, item) => ({
    positions: Array.isArray(item?.positions) ? item.positions : []
  })).sort((a, b) => {
    const aPos = (a.positions || [])[0] || '';
    const bPos = (b.positions || [])[0] || '';
    return aPos.localeCompare(bPos) || a.label.localeCompare(b.label);
  })
);

const PLAYING_STYLE_OPTIONS = Object.freeze(
  catalogueOptions(config.STYLE_PROFILES)
);

const DEVELOPMENT_PLAN_OPTIONS = Object.freeze(
  catalogueOptions(config.DEVELOPMENT_PLANS)
);

const FORMATION_OPTIONS = Object.freeze((() => {
  const seen = new Set();
  const rows = [];
  const formats = Object.keys(config.FORMATION_POSITIONS || {})
    .sort((a, b) => {
      if (a === '11v11') return -1;
      if (b === '11v11') return 1;
      return a.localeCompare(b);
    });

  formats.forEach(matchFormat => {
    Object.keys(config.FORMATION_POSITIONS?.[matchFormat] || {}).forEach(value => {
      if (seen.has(value)) return;
      seen.add(value);
      rows.push({
        value,
        label: value,
        matchFormat
      });
    });
  });

  return rows;
})());

function formationMatchFormat(value) {
  const direct = FORMATION_OPTIONS.find(option => option.value === value);
  return direct?.matchFormat || '11v11';
}

function canonicalTeamNeed(value) {
  const direct = optionValue(value, TEAM_NEED_OPTIONS);
  if (direct) return direct;

  const normalised = clean(value, 180)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const candidates = [
    [/goal|finish|scor|offensive/, 'goal_output'],
    [/chance|creativ|final_pass/, 'chance_creation'],
    [/progress|carry|build/, 'ball_progression'],
    [/retain|retention|pressure|technical/, 'pressure_resistance'],
    [/one.*one|tackle|defensive_base|defensive_output/, 'defensive_one_v_one'],
    [/defensive.*transition|recovery/, 'defensive_transition'],
    [/aerial|physical_presence/, 'aerial_security'],
    [/press/, 'press_effectiveness'],
    [/goalkeeper.*distribution|distribution/, 'goalkeeper_distribution'],
    [/goalkeeper.*command|commanding_goalkeeper/, 'goalkeeper_command'],
    [/wide|pace|speed/, 'wide_threat']
  ];

  const mapped = candidates.find(([pattern]) => pattern.test(normalised));
  return mapped && TEAM_NEED_OPTIONS.some(option => option.value === mapped[1])
    ? mapped[1]
    : '';
}

function canonicalRequiredRole(value) {
  return optionValue(value, REQUIRED_ROLE_OPTIONS);
}

function canonicalPlayingStyle(value) {
  return optionValue(value, PLAYING_STYLE_OPTIONS);
}

function canonicalDevelopmentPlan(value) {
  const direct = optionValue(value, DEVELOPMENT_PLAN_OPTIONS);
  if (direct) return direct;

  const normalised = clean(value, 180).toLowerCase();
  const candidates = [
    [/goalkeeper|keeper/, 'goalkeeper_command'],
    [/final|goal|attack/, 'final_third_output'],
    [/defen|tactical/, 'defensive_intelligence'],
    [/athletic|physical|transition/, 'athletic_transition'],
    [/technical|possession/, 'technical_possession'],
    [/balanced|growth/, 'balanced']
  ];

  const mapped = candidates.find(([pattern]) => pattern.test(normalised));
  return mapped && DEVELOPMENT_PLAN_OPTIONS.some(option => option.value === mapped[1])
    ? mapped[1]
    : '';
}

function setupOptionsFor() {
  return {
    teamNeeds: TEAM_NEED_OPTIONS,
    requiredRoles: REQUIRED_ROLE_OPTIONS,
    formations: FORMATION_OPTIONS,
    playingStyles: PLAYING_STYLE_OPTIONS,
    developmentPlans: DEVELOPMENT_PLAN_OPTIONS,
    limits: {
      teamNeedsMax: 3,
      requiredRoleMax: 1,
      formationMax: 1,
      playingStyleMax: 1,
      developmentPlanMax: 1
    }
  };
}

const COMPARISON_CONTEXTS = Object.freeze({
  'immediate starter': {
    readiness: 0.22,
    compatibility: 0.18,
    positionFit: 0.16,
    matchOutput: 0.14,
    evidence: 0.12,
    riskProtection: 0.10,
    potential: 0.04,
    financial: 0.04
  },
  'development prospect': {
    potential: 0.24,
    compatibility: 0.18,
    positionFit: 0.15,
    evidence: 0.12,
    readiness: 0.10,
    matchOutput: 0.08,
    riskProtection: 0.07,
    financial: 0.06
  },
  'high-press role': {
    compatibility: 0.20,
    positionFit: 0.18,
    matchOutput: 0.16,
    readiness: 0.14,
    riskProtection: 0.12,
    evidence: 0.10,
    potential: 0.06,
    financial: 0.04
  },
  'possession role': {
    positionFit: 0.22,
    compatibility: 0.20,
    readiness: 0.16,
    matchOutput: 0.12,
    evidence: 0.10,
    potential: 0.08,
    riskProtection: 0.07,
    financial: 0.05
  },
  'specific tactical role': {
    positionFit: 0.24,
    compatibility: 0.22,
    readiness: 0.14,
    evidence: 0.12,
    matchOutput: 0.10,
    riskProtection: 0.08,
    potential: 0.06,
    financial: 0.04
  },
  'resale upside': {
    financial: 0.24,
    potential: 0.22,
    evidence: 0.14,
    compatibility: 0.12,
    positionFit: 0.10,
    readiness: 0.08,
    riskProtection: 0.06,
    matchOutput: 0.04
  },
  'low financial risk': {
    riskProtection: 0.24,
    evidence: 0.20,
    financial: 0.18,
    readiness: 0.12,
    compatibility: 0.10,
    positionFit: 0.08,
    potential: 0.05,
    matchOutput: 0.03
  },
  'squad depth': {
    positionFit: 0.20,
    compatibility: 0.18,
    readiness: 0.16,
    potential: 0.14,
    evidence: 0.12,
    matchOutput: 0.08,
    riskProtection: 0.07,
    financial: 0.05
  }
});

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function pdfText(value) {
  return String(value == null ? '' : value)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .trim();
}

function buildComparisonPdf(comparison) {
  const rows = [
    'ScoutLink Player Comparison',
    '',
    `Decision context: ${comparison.context?.label || 'Immediate Starter'}`,
    `${comparison.playerA?.name || 'Player A'}: ${comparison.playerA?.totalScore ?? '-'} / 100`,
    `${comparison.playerB?.name || 'Player B'}: ${comparison.playerB?.totalScore ?? '-'} / 100`,
    `Decision-score margin: ${comparison.decisionScoreMargin ?? '-'}`,
    '',
    ...(comparison.categories || []).map(row =>
      `${row.category}: ${comparison.playerA?.name || 'A'} ${row.playerA ?? '-'} / ${comparison.playerB?.name || 'B'} ${row.playerB ?? '-'} · weight ${row.weight ?? '-'}% · ${row.winner === 'Draw' ? 'draw' : `leader ${row.winner || '-'}`}`
    ),
    '',
    comparison.recommendation || '',
    '',
    'Decision-support notice: This comparison supports recruitment judgement and should be read alongside live observation and the underlying evidence.'
  ].filter((line, index, all) => line || index === 1 || (index > 0 && all[index - 1]));

  const lines = [];
  rows.forEach(row => {
    const words = String(row || '').split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }
    let line = '';
    words.forEach(word => {
      const next = (line + ' ' + word).trim();
      if (line && next.length > 92) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
  });

  const content = ['BT', '/F1 11 Tf', '48 790 Td', '14 TL'];
  lines.slice(0, 50).forEach((line, index) => {
    if (index) content.push('T*');
    content.push(`(${pdfText(line)}) Tj`);
  });
  content.push('ET');
  const stream = content.join('\n');
  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function clean(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, max);
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  return Math.max(0, Math.floor(number(value, fallback)));
}

function clamp(value, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, number(value)));
}

function round(value, places = 1) {
  const power = 10 ** places;
  return Math.round(number(value) * power) / power;
}

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function playerName(player) {
  return [player?.first_name, player?.last_name].filter(Boolean).join(' ') || 'Player';
}

function scoutName(scout) {
  return [scout?.first_name, scout?.last_name].filter(Boolean).join(' ') || 'Scout';
}

function stageDisplay(stage) {
  return DISPLAY_STAGE_MAP[String(stage || '').toLowerCase()] || clean(stage, 60) || 'Watching';
}

function stageValue(value) {
  const raw = clean(value, 80).toLowerCase().replace(/-/g, ' ');
  return INPUT_STAGE_MAP[raw] || INPUT_STAGE_MAP[raw.replace(/\s+/g, '_')] || null;
}

function dateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function score10(value) {
  const parsed = number(value, NaN);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 10 ? round(parsed / 10, 1) : round(parsed, 1);
}

function score100(value, fallback = 0) {
  const parsed = number(value, NaN);
  if (!Number.isFinite(parsed)) return fallback;
  return round(parsed <= 10 && parsed > 0 ? parsed * 10 : parsed, 1);
}

function attributeLabel(key) {
  return config.ATTRIBUTE_DEFINITIONS?.[key]?.label ||
    String(key || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
}

function accountScope(context) {
  return context.scout.scout_team_id
    ? { column: 'scout_team_id', value: context.scout.scout_team_id }
    : { column: 'scout_id', value: context.scout.id };
}

async function loadContext(userId) {
  const { data: scout, error } = await supabase
    .from('scouts')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!scout) {
    const issue = new Error('Scout account not found.');
    issue.status = 404;
    throw issue;
  }

  let team = null;
  if (scout.scout_team_id) {
    const result = await supabase
      .from('scout_teams')
      .select('*')
      .eq('id', scout.scout_team_id)
      .maybeSingle();
    if (result.error) throw result.error;
    team = result.data || null;
  }

  return {
    scout,
    team,
    prefs: scout.scout_preferences || {}
  };
}

async function loadTeamScouts(context) {
  let query = supabase
    .from('scouts')
    .select('id,first_name,last_name,email,phone,club_name,is_super_user,is_active,registration_complete,last_login,scout_preferences')
    .eq('is_active', true)
    .order('is_super_user', { ascending: false })
    .order('first_name', { ascending: true });

  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('id', context.scout.id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadPlayersForScope(req, limit = 300) {
  let query = supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('overall_rating', { ascending: false })
    .limit(Math.max(1, Math.min(300, integer(limit, 300))));

  query = applyRealDataFilter(query, req);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadFactsForPlayers(playerIds, perPlayer = 20) {
  if (!playerIds.length) return {};
  const { data, error } = await supabase
    .from('match_facts')
    .select('*')
    .in('player_id', playerIds)
    .order('match_date', { ascending: false })
    .limit(Math.min(5000, Math.max(500, playerIds.length * perPlayer)));

  if (error) throw error;
  const mapped = {};
  (data || []).forEach(row => {
    mapped[row.player_id] = mapped[row.player_id] || [];
    if (mapped[row.player_id].length < perPlayer) mapped[row.player_id].push(row);
  });
  return mapped;
}

async function loadTeamsForPlayers(players) {
  const ids = unique(players.map(player => player.team_id));
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('school_academy_teams')
    .select('*')
    .in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data || []).map(team => [team.id, team]));
}

function safeAnalysis(player, context, facts) {
  /*
   * Compatibility is evaluated from the current Scout's canonical personal
   * setup. The setup is normalised here so legacy demo preferences do not
   * silently feed unsupported labels into the V4 engine.
   */
  const resolved = personalSetupFromPrefs(
    context.prefs || {},
    context.team || {}
  );

  const canonicalSetup = {
    ...((context.prefs && context.prefs.setup) || {}),
    teamNeeds: resolved.teamNeeds,
    teamWeaknesses: resolved.teamNeeds,
    requiredRole: resolved.requiredRole,
    roleExpectations: resolved.requiredRole ? [resolved.requiredRole] : [],
    formation: resolved.formation,
    playingStyle: resolved.playingStyle,
    developmentPlan: resolved.developmentPlan,
    longTermGoals: resolved.developmentPlan ? [resolved.developmentPlan] : [],
    matchFormat: formationMatchFormat(resolved.formation)
  };

  const prefs = {
    ...(context.prefs || {}),
    teamNeeds: resolved.teamNeeds,
    teamWeaknesses: resolved.teamNeeds,
    requiredRole: resolved.requiredRole,
    roleExpectations: resolved.requiredRole ? [resolved.requiredRole] : [],
    formation: resolved.formation,
    playingStyle: resolved.playingStyle,
    developmentPlan: resolved.developmentPlan,
    longTermGoals: resolved.developmentPlan ? [resolved.developmentPlan] : [],
    matchFormat: canonicalSetup.matchFormat,
    setup: canonicalSetup
  };

  try {
    return analysePlayer(
      player,
      context.team || {},
      facts || [],
      prefs
    ) || {};
  } catch (error) {
    console.warn(
      '[Scout V6 analysis skipped]',
      player?.id,
      error.message
    );
    return {
      compatibilityScore: null,
      compatibility: null,
      compatibilityBreakdown: null,
      overallRating: number(player?.overall_rating, 0),
      overallBreakdown: player?.overall_breakdown || {},
      positionRatings: player?.position_ratings || {},
      predictionDetails: player?.prediction_analysis || {},
      valueAnalysis: player?.value_analysis || {}
    };
  }
}

function attributeProfile(player, analysis = {}) {
  const ratings = player?.attribute_ratings && typeof player.attribute_ratings === 'object'
    ? player.attribute_ratings
    : {};
  const group = utils.getPositionGroup(player) || player.position_group || 'Attacker';
  const key = String(group).toLowerCase() === 'goalkeeper'
    ? 'goalkeeper'
    : String(group).toLowerCase() === 'defender'
      ? 'defender'
      : String(group).toLowerCase() === 'midfielder'
        ? 'midfielder'
        : 'attacker';

  function rows(object) {
    return Object.entries(object || {})
      .filter(([, value]) => value !== null && value !== undefined && Number.isFinite(Number(value)))
      .map(([attribute, value]) => ({
        key: attribute,
        label: attributeLabel(attribute),
        value: score10(value)
      }));
  }

  const overall = analysis.overallBreakdown || player.overall_breakdown || {};
  return {
    group,
    groupKey: key,
    general: rows(ratings.general),
    positional: rows(ratings[key]),
    categories: {
      technical: score100(overall.technicalScore, null),
      tactical: score100(overall.tacticalIQScore, null),
      physical: score100(overall.physicalScore, null),
      mental: score100(overall.mentalDevelopmentalScore, null)
    }
  };
}

function compatibilityExplanation(player, analysis, context) {
  const compatibility =
    analysis?.compatibility ||
    analysis?.compatibilityBreakdown ||
    null;

  if (!compatibility) {
    return {
      score: null,
      label: 'No compatibility score',
      summary: 'Compatibility cannot be explained until the Scout setup contains enough team, role and formation information.',
      noScoreReason: 'The current Scout setup does not provide a complete compatibility context.',
      components: [],
      positives: [],
      watchouts: [],
      nextLiveChecks: [],
      setup: {}
    };
  }

  const setup = compatibility.setup || {};
  const score = compatibility.conservativeScore ?? compatibility.finalScore ?? analysis.compatibilityScore ?? null;
  const componentSource = [
    {
      key: 'formation',
      label: 'Formation position fit',
      score: compatibility.formationPositionFit,
      explanation: setup.formation
        ? `${setup.targetPositionLabel || setup.targetPosition || 'The target position'} is assessed against the available ${setup.formation} slot structure.`
        : 'No formation has been supplied.'
    },
    {
      key: 'role',
      label: 'Required role fit',
      score: compatibility.roleFit,
      explanation: setup.requiredRoleLabel
        ? `The player is assessed against the ${setup.requiredRoleLabel} requirements for the target position.`
        : 'No supported required role has been supplied.'
    },
    {
      key: 'style',
      label: 'Playing style fit',
      score: compatibility.tacticalStyleFit,
      explanation: setup.playingStyleLabel
        ? `The player is assessed against the demands of ${setup.playingStyleLabel}.`
        : 'Playing style is not currently part of this Scout setup.'
    },
    {
      key: 'need',
      label: 'Team need fit',
      score: compatibility.needFit ?? compatibility.teamNeedFit,
      explanation: list(setup.teamNeedLabels).length
        ? `The player is assessed against the stated needs: ${list(setup.teamNeedLabels).join(', ')}.`
        : 'No explicit team need is currently supplied.'
    },
    {
      key: 'development',
      label: 'Development pathway',
      score: compatibility.developmentPathwayFit,
      explanation: setup.developmentPlanLabel
        ? `The development component reflects the ${setup.developmentPlanLabel} pathway rather than adding generic age points.`
        : 'The development component uses the current bounded development projection.'
    }
  ];

  const components = componentSource.map(component => ({
    ...component,
    score: component.score === null || component.score === undefined
      ? null
      : round(component.score, 1)
  }));

  const positives = components
    .filter(component => component.score !== null && component.score >= 80)
    .map(component => `${component.label} is strong at ${component.score}/100.`);

  const watchouts = [
    ...components
      .filter(component => component.score !== null && component.score < 70)
      .map(component => `${component.label} is the main constraint at ${component.score}/100.`),
    ...(compatibility.criticalIssues || [])
      .slice(0, 3)
      .map(issue => typeof issue === 'string'
        ? issue
        : `${attributeLabel(issue.key)} is a critical role watchout at ${round(issue.score, 1)}/100.`),
    ...(compatibility.ceilingReasons || []).slice(0, 2)
  ];

  const nextLiveChecks = [];
  const weakest = components
    .filter(component => component.score !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  weakest.forEach(component => {
    if (component.key === 'formation') {
      nextLiveChecks.push('Verify the player in the exact target slot and shape, not only in their familiar role.');
    } else if (component.key === 'role') {
      nextLiveChecks.push('Observe the repeated role behaviours that are currently limiting role fit.');
    } else if (component.key === 'style') {
      nextLiveChecks.push('Test the player when the team reproduces the required playing-style demands.');
    } else if (component.key === 'need') {
      nextLiveChecks.push('Collect live evidence against the stated team weakness rather than unrelated strengths.');
    } else if (component.key === 'development') {
      nextLiveChecks.push('Track whether the development priority repeats across several fixtures before increasing confidence.');
    }
  });

  const range = compatibility.likelyRange;
  const scoreText = score === null ? 'No score' : `${round(score, 1)}/100`;
  const strongest = components
    .filter(component => component.score !== null)
    .sort((a, b) => b.score - a.score)[0];
  const weakestComponent = components
    .filter(component => component.score !== null)
    .sort((a, b) => a.score - b.score)[0];

  let summary = compatibility.explanation ||
    `Compatibility is ${scoreText} for this Scout setup.`;

  if (strongest && weakestComponent) {
    summary = `${scoreText} is the conservative team-specific compatibility result. ${strongest.label} is the strongest current fit (${strongest.score}/100), while ${weakestComponent.label.toLowerCase()} is the clearest constraint (${weakestComponent.score}/100).`;
  }

  return {
    score: score === null ? null : round(score, 1),
    label: compatibility.label || null,
    recommendation: compatibility.recommendation || compatibility.recommendedUse || null,
    summary,
    noScoreReason: compatibility.noScoreReason || null,
    components,
    positives,
    watchouts: unique(watchouts).slice(0, 6),
    nextLiveChecks: unique(nextLiveChecks).slice(0, 4),
    setup: {
      formation: setup.formation || context.prefs.formation || context.team?.formation || null,
      targetPosition: setup.targetPosition || null,
      targetPositionLabel: setup.targetPositionLabel || null,
      requiredRole: setup.requiredRole || null,
      requiredRoleLabel: setup.requiredRoleLabel || null,
      playingStyle: setup.playingStyle || null,
      playingStyleLabel: setup.playingStyleLabel || null,
      teamNeeds: setup.teamNeedLabels || [],
      developmentPlan: setup.developmentPlanLabel || null
    },
    uncertainty: {
      likelyRange: range || null,
      evidenceConfidence: compatibility.evidenceConfidence?.score ?? analysis.evidenceConfidence?.score ?? null,
      note: 'Evidence confidence controls the likely range. It does not add compatibility points.'
    }
  };
}

function normalisePlayer(player, team, facts, analysis, context) {
  const attrs = attributeProfile(player, analysis);
  const compatibility = analysis.compatibilityScore ?? analysis.compatibility?.conservativeScore ?? null;
  const valueIndex = analysis.footballValueIndex ??
    analysis.valueAnalysis?.footballValueIndex ??
    player.value_analysis?.footballValueIndex ??
    null;

  return {
    ...player,
    team: team || null,
    team_city: team?.city || team?.county || null,
    team_country: team?.country || null,
    league_name: team?.league_name || null,
    league_fulltime_url: team?.league_fulltime_url || null,
    team_website_url: team?.team_website_url || null,
    compatibilityScore: compatibility === null ? null : round(compatibility, 1),
    compatibility: analysis.compatibility || null,
    compatibilityBreakdown: analysis.compatibilityBreakdown || analysis.compatibility || null,
    compatibilityContext: analysis.compatibilityContext || null,
    overallBreakdown: analysis.overallBreakdown || player.overall_breakdown || {},
    positionRatings: analysis.positionRatings || player.position_ratings || {},
    predictionDetails: analysis.predictionDetails || player.prediction_analysis || {},
    valueAnalysis: analysis.valueAnalysis || player.value_analysis || {},
    footballValueIndex: valueIndex === null ? null : round(valueIndex, 1),
    evidenceConfidence: analysis.evidenceConfidence || null,
    attributeProfile: attrs,
    compatibilityExplanation: compatibilityExplanation(player, analysis, context),
    recentMatchCount: facts.length,
    _facts: facts
  };
}

async function countSystemPlayers(req) {
  let query = supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  query = applyRealDataFilter(query, req);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function enrichedPlayerList(req, context) {
  const players = await loadPlayersForScope(req, 300);
  const ids = players.map(player => player.id);
  const [factsByPlayer, teamsById] = await Promise.all([
    loadFactsForPlayers(ids, 20),
    loadTeamsForPlayers(players)
  ]);

  return players.map(player => {
    const facts = factsByPlayer[player.id] || [];
    const analysis = safeAnalysis(player, context, facts);
    return normalisePlayer(
      player,
      teamsById[player.team_id] || null,
      facts,
      analysis,
      context
    );
  });
}

function playerMatchesFilter(player, query) {
  const q = clean(query.q, 180).toLowerCase();
  const position = clean(query.position, 20).toUpperCase();
  const ageGroup = clean(query.ageGroup || query.age_group, 20).toUpperCase();
  const region = clean(query.region, 180).toLowerCase();
  const availability = clean(query.availability, 80).toLowerCase();
  const foot = clean(query.foot, 40).toLowerCase();
  const minOverall = number(query.minOverall || query.min_overall, 0);

  if (q) {
    const haystack = [
      playerName(player),
      player.team_name,
      player.primary_position,
      player.specific_position,
      player.position_group,
      player.age_group
    ].filter(Boolean).join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (position && position !== 'ANY' && position !== 'ANY POSITION') {
    const positions = unique([
      player.primary_position,
      player.specific_position,
      ...(Array.isArray(player.positions) ? player.positions : [])
    ]).map(value => String(value).toUpperCase());
    if (!positions.includes(position)) return false;
  }

  if (ageGroup && ageGroup !== 'ANY' && ageGroup !== 'ANY AGE GROUP') {
    if (String(player.age_group || '').toUpperCase() !== ageGroup) return false;
  }

  if (region && region !== 'any' && region !== 'any region') {
    const location = [
      player.team_city,
      player.team_country,
      player.team?.county,
      player.team?.city,
      player.team?.country
    ].filter(Boolean).join(' ').toLowerCase();
    if (!location.includes(region)) return false;
  }

  if (availability && availability !== 'any') {
    if (String(player.availability || '').toLowerCase() !== availability) return false;
  }

  if (foot && foot !== 'any') {
    const playerFoot = String(player.foot || '').toLowerCase();
    if (!playerFoot.includes(foot.replace(' foot', ''))) return false;
  }

  if (minOverall > 0 && number(player.overall_rating) < minOverall) return false;

  return true;
}

function sortPlayers(players, metric) {
  const value = clean(metric, 80).toLowerCase();
  const sorted = players.slice();

  const getter = value.includes('compat')
    ? player => number(player.compatibilityScore, -1)
    : value.includes('potential') || value.includes('prediction')
      ? player => number(player.predictionDetails?.potentialOverall ?? player.predictionDetails?.potentialRating, -1)
      : value.includes('value')
        ? player => number(player.footballValueIndex, -1)
        : value.includes('goal')
          ? player => number(player.goals, -1)
          : value.includes('assist')
            ? player => number(player.assists, -1)
            : player => number(player.overall_rating, -1);

  sorted.sort((a, b) => getter(b) - getter(a));
  return sorted;
}

async function visibleWorkflowEntries(context, playerId) {
  let query = supabase
    .from('scout_player_workflow_entries')
    .select('*')
    .eq('player_id', playerId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(250);

  const scope = accountScope(context);
  query = context.scout.scout_team_id
    ? query.eq('scout_team_id', context.scout.scout_team_id)
    : query.eq('scout_id', context.scout.id);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).filter(entry => {
    if (entry.scout_id === context.scout.id) return true;
    if (context.scout.is_super_user && context.scout.scout_team_id) return true;
    return Array.isArray(entry.shared_with) && entry.shared_with.includes(context.scout.id);
  });

  return enrichScoutAuthors(rows);
}

async function enrichScoutAuthors(rows) {
  const ids = unique((rows || []).flatMap(row => [
    row.scout_id,
    row.created_by,
    ...(Array.isArray(row.shared_with) ? row.shared_with : [])
  ]));
  if (!ids.length) return rows || [];

  const { data, error } = await supabase
    .from('scouts')
    .select('id,first_name,last_name,email,club_name')
    .in('id', ids);

  if (error) throw error;
  const byId = Object.fromEntries((data || []).map(scout => [scout.id, scout]));

  return (rows || []).map(row => ({
    ...row,
    author: byId[row.created_by] || byId[row.scout_id] || null,
    sharedWithScouts: (row.shared_with || []).map(id => byId[id]).filter(Boolean)
  }));
}

async function loadPipelineRows(context) {
  let query = supabase
    .from('recruitment_pipeline')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(200);

  /*
   * The Pipeline page is a personal working list. Team collaboration is
   * surfaced through shared notes/observations, not by multiplying every
   * colleague's pipeline rows into this Scout's headline count.
   */
  query = query.eq('scout_id', context.scout.id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function enrichPipeline(context, rows) {
  const playerIds = unique(rows.map(row => row.player_id));
  const scoutIds = unique(rows.flatMap(row => [row.scout_id, row.assigned_scout_id]));
  const [playersResult, scoutsResult] = await Promise.all([
    playerIds.length
      ? supabase.from('players').select('*').in('id', playerIds)
      : Promise.resolve({ data: [], error: null }),
    scoutIds.length
      ? supabase.from('scouts').select('id,first_name,last_name,email,club_name').in('id', scoutIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (playersResult.error) throw playersResult.error;
  if (scoutsResult.error) throw scoutsResult.error;

  const byPlayer = Object.fromEntries((playersResult.data || []).map(player => [player.id, player]));
  const byScout = Object.fromEntries((scoutsResult.data || []).map(scout => [scout.id, scout]));

  const latestWorkflowByPlayer = {};
  if (playerIds.length) {
    let workflowQuery = supabase
      .from('scout_player_workflow_entries')
      .select('*')
      .in('player_id', playerIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(500);

    workflowQuery = context.scout.scout_team_id
      ? workflowQuery.eq('scout_team_id', context.scout.scout_team_id)
      : workflowQuery.eq('scout_id', context.scout.id);

    const workflowResult = await workflowQuery;
    if (workflowResult.error) throw workflowResult.error;
    (workflowResult.data || []).forEach(entry => {
      if (!latestWorkflowByPlayer[entry.player_id]) {
        latestWorkflowByPlayer[entry.player_id] = entry;
      }
    });
  }

  return rows.map(row => ({
    ...row,
    player: byPlayer[row.player_id] || null,
    scout: byScout[row.scout_id] || null,
    assignedScout: byScout[row.assigned_scout_id] || null,
    latestWorkflow: latestWorkflowByPlayer[row.player_id] || null,
    displayStage: stageDisplay(row.stage)
  }));
}

function canManagePipeline(context, row) {
  if (!row) return false;
  if (row.scout_id === context.scout.id) return true;
  if (row.assigned_scout_id === context.scout.id) return true;
  return Boolean(
    context.scout.is_super_user &&
    context.scout.scout_team_id &&
    row.scout_team_id === context.scout.scout_team_id
  );
}

async function loadFixtureBundle(context, range = {}) {
  const pipelineRows = await loadPipelineRows(context);
  const playerIds = unique(pipelineRows.map(row => row.player_id));
  if (!playerIds.length) return { fixtures: [], pipelineRows: [], players: [] };

  const { data: players, error: playerError } = await supabase
    .from('players')
    .select('id,first_name,last_name,team_id,team_name,age_group,primary_position,specific_position,position_group,assigned_coach_id')
    .in('id', playerIds);
  if (playerError) throw playerError;

  const teamIds = unique((players || []).map(player => player.team_id));
  if (!teamIds.length) return { fixtures: [], pipelineRows, players: players || [] };

  const start = range.start || new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const end = range.end || new Date(Date.now() + 370 * 86400000).toISOString().slice(0, 10);

  const { data: fixtures, error: fixtureError } = await supabase
    .from('fixtures')
    .select('*')
    .in('team_id', teamIds)
    .gte('fixture_date', start)
    .lte('fixture_date', end)
    .order('fixture_date', { ascending: true })
    .order('fixture_time', { ascending: true })
    .limit(500);
  if (fixtureError) throw fixtureError;

  const fixtureIds = (fixtures || []).map(fixture => fixture.id);
  const [attendanceResult, planResult] = await Promise.all([
    fixtureIds.length
      ? supabase.from('fixture_attendance').select('*').in('fixture_id', fixtureIds).eq('scout_id', context.scout.id)
      : Promise.resolve({ data: [], error: null }),
    fixtureIds.length
      ? supabase.from('scout_fixture_plans').select('*').in('fixture_id', fixtureIds).eq('scout_id', context.scout.id)
      : Promise.resolve({ data: [], error: null })
  ]);
  if (attendanceResult.error) throw attendanceResult.error;
  if (planResult.error) throw planResult.error;

  const attendanceByFixture = Object.fromEntries((attendanceResult.data || []).map(row => [row.fixture_id, row]));
  const plansByFixture = {};
  (planResult.data || []).forEach(row => {
    plansByFixture[row.fixture_id] = plansByFixture[row.fixture_id] || [];
    plansByFixture[row.fixture_id].push(row);
  });

  const playersByTeam = {};
  (players || []).forEach(player => {
    playersByTeam[player.team_id] = playersByTeam[player.team_id] || [];
    const pipeline = pipelineRows.find(row => row.player_id === player.id) || null;
    playersByTeam[player.team_id].push({ ...player, pipeline });
  });

  return {
    fixtures: (fixtures || []).map(fixture => ({
      ...fixture,
      attendance: attendanceByFixture[fixture.id] || null,
      plans: plansByFixture[fixture.id] || [],
      pipelinePlayers: playersByTeam[fixture.team_id] || []
    })),
    pipelineRows,
    players: players || []
  };
}

async function latestPlayerAnalysis(req, context, playerId) {
  let query = supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('is_active', true);
  query = applyRealDataFilter(query, req);

  const { data: player, error } = await query.maybeSingle();
  if (error) throw error;
  if (!player) {
    const issue = new Error('Player not found.');
    issue.status = 404;
    throw issue;
  }

  const [factsResult, teamResult] = await Promise.all([
    supabase
      .from('match_facts')
      .select('*')
      .eq('player_id', player.id)
      .order('match_date', { ascending: false })
      .limit(100),
    player.team_id
      ? supabase
          .from('school_academy_teams')
          .select('*')
          .eq('id', player.team_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (factsResult.error) throw factsResult.error;
  if (teamResult.error) throw teamResult.error;

  const facts = factsResult.data || [];
  const analysis = safeAnalysis(player, context, facts);
  return normalisePlayer(player, teamResult.data || null, facts, analysis, context);
}

function comparisonMetricSet(player) {
  const overall = player.overallBreakdown || {};
  const facts = player._facts || [];
  const matchScores = facts
    .map(fact => fact.performance_score ?? fact.overall_rating ?? fact.overall_score)
    .map(value => score100(value, NaN))
    .filter(Number.isFinite);

  const matchOutput = matchScores.length
    ? round(matchScores.reduce((sum, value) => sum + value, 0) / matchScores.length, 1)
    : score100(player.overall_rating, 0);

  return {
    readiness: score100(overall.currentReadiness ?? overall.finalScore ?? player.overall_rating, 0),
    compatibility: score100(player.compatibilityScore, 0),
    positionFit: score100(player.positionRatings?.bestCurrentScore ?? player.overall_rating, 0),
    matchOutput,
    evidence: score100(player.evidenceConfidence?.score, 0),
    riskProtection: score100(overall.mentalDevelopmentalScore ?? overall.currentReadiness ?? player.overall_rating, 0),
    potential: score100(player.predictionDetails?.potentialOverall ?? player.predictionDetails?.potentialRating ?? player.overall_rating, 0),
    financial: score100(player.footballValueIndex, 0)
  };
}

function comparisonCategoryLabel(key) {
  return {
    readiness: 'Readiness',
    compatibility: 'Compatibility',
    positionFit: 'Position fit',
    matchOutput: 'Match output',
    evidence: 'Evidence',
    riskProtection: 'Risk protection',
    potential: 'Potential',
    financial: 'Financial'
  }[key] || key;
}

function buildComparison(a, b, contextLabel) {
  const key = clean(contextLabel, 100).toLowerCase() || 'immediate starter';
  const weights = COMPARISON_CONTEXTS[key] || COMPARISON_CONTEXTS['immediate starter'];
  const aMetrics = comparisonMetricSet(a);
  const bMetrics = comparisonMetricSet(b);

  const categories = Object.entries(weights).map(([metric, weight]) => {
    const aScore = round(aMetrics[metric], 1);
    const bScore = round(bMetrics[metric], 1);
    return {
      key: metric,
      category: comparisonCategoryLabel(metric),
      weight: round(weight * 100, 0),
      playerA: aScore,
      playerB: bScore,
      margin: round(Math.abs(aScore - bScore), 1),
      winner: aScore === bScore ? 'Draw' : aScore > bScore ? 'A' : 'B'
    };
  });

  const totalA = round(categories.reduce((sum, row) => sum + row.playerA * row.weight / 100, 0), 1);
  const totalB = round(categories.reduce((sum, row) => sum + row.playerB * row.weight / 100, 0), 1);
  const winner = totalA === totalB ? null : totalA > totalB ? a : b;

  return {
    context: {
      key,
      label: key.replace(/\b\w/g, letter => letter.toUpperCase())
    },
    playerA: {
      id: a.id,
      name: playerName(a),
      totalScore: totalA,
      metrics: aMetrics
    },
    playerB: {
      id: b.id,
      name: playerName(b),
      totalScore: totalB,
      metrics: bMetrics
    },
    categories,
    decisionScoreMargin: round(Math.abs(totalA - totalB), 1),
    recommendation: winner
      ? `${playerName(winner)} leads in the selected ${key} context. Change the decision context and the category weights may change the recommendation.`
      : `The two players are level in the selected ${key} context. Use the category differences and live evidence to break the tie.`
  };
}

async function uniqueEmailAvailable(email, currentScoutId) {
  for (const table of ['scouts', 'coaches', 'players', 'stratex']) {
    let query = supabase.from(table).select('id').eq('email', email);
    if (table === 'scouts') query = query.neq('id', currentScoutId);
    const { data, error } = await query.limit(1);
    if (error) throw error;
    if ((data || []).length) return false;
  }
  return true;
}

function personalSetupFromPrefs(prefs = {}, team = {}) {
  const setup = prefs.setup && typeof prefs.setup === 'object'
    ? prefs.setup
    : {};
  const teamSetup = team?.scoring_setup && typeof team.scoring_setup === 'object'
    ? team.scoring_setup
    : {};

  const rawNeeds = list(
    setup.teamNeeds ||
    setup.teamWeaknesses ||
    prefs.teamNeeds ||
    prefs.teamWeaknesses ||
    teamSetup.teamNeeds ||
    teamSetup.teamWeaknesses ||
    teamSetup.team_needs ||
    []
  );

  const rawRole =
    setup.requiredRole ||
    prefs.requiredRole ||
    list(setup.roleExpectations || prefs.roleExpectations || teamSetup.roleExpectations || team.role_expectations || [])[0] ||
    '';

  const rawDevelopment =
    setup.developmentPlan ||
    prefs.developmentPlan ||
    list(setup.longTermGoals || prefs.longTermGoals || teamSetup.longTermGoals || team.long_term_goals || [])[0] ||
    '';

  const formation = clean(
    setup.formation ||
    prefs.formation ||
    teamSetup.formation ||
    team.formation,
    60
  );

  return {
    teamNeeds: unique(
      rawNeeds.map(canonicalTeamNeed).filter(Boolean)
    ).slice(0, 3),
    requiredRole: canonicalRequiredRole(rawRole),
    formation: FORMATION_OPTIONS.some(option => option.value === formation)
      ? formation
      : '',
    playingStyle: canonicalPlayingStyle(
      setup.playingStyle ||
      prefs.playingStyle ||
      teamSetup.playingStyle ||
      team.playing_style
    ),
    developmentPlan: canonicalDevelopmentPlan(rawDevelopment),
    preferredPositions: list(
      setup.preferredPositions ||
      prefs.preferredPositions ||
      team.preferred_positions ||
      []
    ),
    priorityAgeGroups: list(
      setup.ageGroups ||
      prefs.priorityAgeGroups ||
      prefs.ageGroups ||
      team.age_groups ||
      []
    ),
    scoutRegion: clean(
      setup.scoutRegion ||
      prefs.scoutRegion ||
      team.scout_region,
      180
    ),
    scoutingRole: clean(prefs.scoutingRole, 120),
    personalFocus: clean(prefs.personalFocus, 600),
    reportingStyle: clean(prefs.reportingStyle, 300),
    minimumAppearances: integer(
      prefs.minimumAppearances ||
      prefs.minAppearances ||
      team.min_appearances,
      0
    ),
    matchFormat: formationMatchFormat(formation),
    updatedAt: prefs.updatedAt || setup.updatedAt || null
  };
}

router.use(requireAuth, requireRole('Scout'));

router.get('/players', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const [players, systemTotal] = await Promise.all([
      enrichedPlayerList(req, context),
      countSystemPlayers(req)
    ]);
    const filtered = sortPlayers(
      players.filter(player => playerMatchesFilter(player, req.query || {})),
      req.query.metric || req.query.sort || 'overall'
    );
    const limit = Math.max(1, Math.min(200, integer(req.query.limit, 150)));
    const regions = unique(players.flatMap(player => [
      player.team?.city,
      player.team?.county,
      player.team?.country
    ]).filter(Boolean)).sort();

    res.set('Cache-Control', 'no-store');
    res.json({
      data: filtered.slice(0, limit),
      total: filtered.length,
      systemTotal,
      filters: {
        regions,
        positions: unique(players.flatMap(player => [
          player.primary_position,
          player.specific_position
        ]).filter(Boolean)).sort(),
        ageGroups: unique(players.map(player => player.age_group).filter(Boolean)).sort(),
        availability: unique(players.map(player => player.availability).filter(Boolean)).sort(),
        feet: unique(players.map(player => player.foot).filter(Boolean)).sort()
      }
    });
  } catch (error) {
    console.error('[Scout V6 players]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Players could not be loaded.'
    });
  }
});


router.get('/global-search', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const q = clean(req.query.q, 180).toLowerCase();

    const pageCatalogue = [
      ['Dashboard', '/scout/dashboard', 'home overview usage compatible players'],
      ['Player Search', '/scout/player-search', 'players discover search filters'],
      ['Rankings', '/scout/rankings', 'rank players overall compatibility development value'],
      ['Pipeline', '/scout/pipeline', 'recruitment watching monitoring shortlist trial'],
      ['Compare Players', '/scout/compare-players', 'compare decision'],
      ['Predictions', '/scout/predictions', 'forecast development position fit match scenario roi'],
      ['Ask Radar', '/scout/radar', 'radar ai'],
      ['Fixtures', '/scout/fixtures', 'calendar matches attendance'],
      ['Events', '/scout/events', 'showcase events attendance'],
      ['Add Usage', '/scout/usage', 'usage top up predictions exports coach interests'],
      ['Exports', '/scout/exports', 'download export history pdf'],
      ['Chat', '/scout/chat', 'messages coaches conversation'],
      ['Notifications', '/scout/notifications', 'alerts unread'],
      ['Settings', '/scout/settings', 'account team seats'],
      ['Scout Setup', '/scout/setup', 'compatibility team needs role formation playing style long term goal'],
      ['Report a Concern', '/scout/report-a-concern', 'support safeguarding concern']
    ].map(([title, path, keywords]) => ({
      id: path,
      title,
      path,
      keywords
    }));

    if (!q || q.length < 2) {
      return res.json({
        data: {
          pages: [],
          players: [],
          fixtures: [],
          events: []
        }
      });
    }

    const [players, fixtureBundle, eventResult] = await Promise.all([
      enrichedPlayerList(req, context),
      loadFixtureBundle(context),
      supabase
        .from('showcase_events')
        .select('*')
        .in('status', ['published', 'confirmed'])
        .order('event_date', { ascending: true })
        .limit(100)
    ]);
    if (eventResult.error) throw eventResult.error;

    const pageRows = pageCatalogue.filter(page =>
      `${page.title} ${page.keywords}`.toLowerCase().includes(q)
    ).slice(0, 8);

    const playerRows = players.filter(player => {
      const haystack = [
        playerName(player),
        player.team_name,
        player.age_group,
        player.primary_position,
        player.specific_position,
        player.position_group
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 10);

    const fixtureRows = (fixtureBundle.fixtures || []).filter(fixture => {
      const haystack = [
        fixture.home_team_name,
        fixture.home_team,
        fixture.team_name,
        fixture.away_team_name,
        fixture.away_team,
        fixture.opponent_name,
        fixture.opponent,
        fixture.venue_name,
        fixture.venue,
        fixture.address,
        fixture.city
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 8);

    const eventRows = (eventResult.data || []).filter(event => {
      const haystack = [
        event.event_name,
        event.name,
        event.title,
        event.venue,
        event.location,
        event.city
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 6);

    res.set('Cache-Control', 'no-store');
    res.json({
      data: {
        pages: pageRows,
        players: playerRows,
        fixtures: fixtureRows,
        events: eventRows
      }
    });
  } catch (error) {
    console.error('[Scout V6 global search]', error);
    res.status(error.status || 500).json({
      error: error.message || 'ScoutLink search could not be completed.'
    });
  }
});

router.get('/players/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const player = await latestPlayerAnalysis(req, context, req.params.id);

    let ownPipelineQuery = supabase
      .from('recruitment_pipeline')
      .select('*')
      .eq('player_id', player.id)
      .eq('scout_id', context.scout.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    let teamPipelineQuery = supabase
      .from('recruitment_pipeline')
      .select('*')
      .eq('player_id', player.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50);

    teamPipelineQuery = context.scout.scout_team_id
      ? teamPipelineQuery.eq('scout_team_id', context.scout.scout_team_id)
      : teamPipelineQuery.eq('scout_id', context.scout.id);

    const [
      ownPipelineResult,
      teamPipelineResult,
      videoResult,
      workflow,
      commentResult,
      observationResult,
      fixtureResult,
      coachResult
    ] = await Promise.all([
      ownPipelineQuery,
      teamPipelineQuery,
      supabase
        .from('player_videos')
        .select('*')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(100),
      visibleWorkflowEntries(context, player.id),
      (async () => {
        let query = supabase
          .from('scout_comments')
          .select('*')
          .eq('subject_type', 'player')
          .eq('subject_id', player.id)
          .order('created_at', { ascending: false })
          .limit(200);
        query = context.scout.scout_team_id
          ? query.eq('scout_team_id', context.scout.scout_team_id)
          : query.eq('scout_id', context.scout.id);
        return query;
      })(),
      (async () => {
        let query = supabase
          .from('scout_observations')
          .select('*')
          .eq('player_id', player.id)
          .order('observation_date', { ascending: false })
          .limit(100);
        query = context.scout.scout_team_id
          ? query.eq('scout_team_id', context.scout.scout_team_id)
          : query.eq('scout_id', context.scout.id);
        return query;
      })(),
      player.team_id
        ? supabase
            .from('fixtures')
            .select('*')
            .eq('team_id', player.team_id)
            .gte('fixture_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
            .order('fixture_date', { ascending: true })
            .limit(100)
        : Promise.resolve({ data: [], error: null }),
      player.assigned_coach_id
        ? supabase
            .from('coaches')
            .select('id,first_name,last_name,team_id,team_name,is_active')
            .eq('id', player.assigned_coach_id)
            .eq('is_active', true)
        : player.team_id
          ? supabase
              .from('coaches')
              .select('id,first_name,last_name,team_id,team_name,is_active')
              .eq('team_id', player.team_id)
              .eq('is_active', true)
              .limit(20)
          : Promise.resolve({ data: [], error: null })
    ]);

    for (const result of [
      ownPipelineResult,
      teamPipelineResult,
      videoResult,
      commentResult,
      observationResult,
      fixtureResult,
      coachResult
    ]) {
      if (result.error) throw result.error;
    }

    const comments = await enrichScoutAuthors(commentResult.data || []);
    const observations = await enrichScoutAuthors(observationResult.data || []);

    res.set('Cache-Control', 'no-store');
    res.json({
      data: {
        player,
        analysis: {
          overallBreakdown: player.overallBreakdown,
          positionRatings: player.positionRatings,
          predictionDetails: player.predictionDetails,
          valueAnalysis: player.valueAnalysis,
          compatibility: player.compatibility,
          evidenceConfidence: player.evidenceConfidence
        },
        compatibilityExplanation: player.compatibilityExplanation,
        attributes: player.attributeProfile,
        recentMatches: player._facts || [],
        videos: videoResult.data || [],
        workflow,
        comments,
        observations,
        pipeline: (ownPipelineResult.data || [])[0] || null,
        teamPipeline: teamPipelineResult.data || [],
        inPipeline: Boolean((ownPipelineResult.data || [])[0]),
        coaches: coachResult.data || [],
        canMessageCoach: Boolean((ownPipelineResult.data || [])[0] && (coachResult.data || []).length),
        fixtures: fixtureResult.data || [],
        externalMatchesUrl: player.league_fulltime_url || player.team_website_url || null
      }
    });
  } catch (error) {
    console.error('[Scout V6 player detail]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Player profile could not be loaded.'
    });
  }
});


router.post('/players/:id/notes', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const content = clean(req.body.content || req.body.body, 5000);
    const visibility = clean(req.body.visibility, 30).toLowerCase() === 'private'
      ? 'private'
      : 'team';

    if (!content) {
      return res.status(400).json({ error: 'Write a scouting note before posting.' });
    }

    await latestPlayerAnalysis(req, context, req.params.id);

    let sharedWith = [];
    if (visibility === 'team' && context.scout.scout_team_id) {
      const teamScouts = await loadTeamScouts(context);
      sharedWith = teamScouts
        .map(scout => scout.id)
        .filter(id => String(id) !== String(context.scout.id));
    }

    const { data: entry, error } = await supabase
      .from('scout_player_workflow_entries')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        player_id: req.params.id,
        pipeline_id: null,
        entry_type: 'note',
        content,
        decision_value: null,
        shared_with: sharedWith,
        metadata: {
          visibility,
          source: 'scout_v6_player_profile'
        },
        is_deleted: false,
        created_by: context.scout.id
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      data: entry,
      message: visibility === 'team'
        ? 'Note posted to your Scout team.'
        : 'Private note saved.'
    });
  } catch (error) {
    console.error('[Scout V6 player note]', error);
    res.status(error.status || 500).json({
      error: error.message || 'The scouting note could not be posted.'
    });
  }
});

router.post('/players/:id/share', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const player = await latestPlayerAnalysis(req, context, req.params.id);
    const requestedIds = unique(list(req.body.scoutIds).map(value => clean(value, 120)))
      .filter(Boolean)
      .filter(id => String(id) !== String(context.scout.id));

    if (!requestedIds.length) {
      return res.status(400).json({ error: 'Choose at least one Scout to share this player with.' });
    }

    const teamScouts = await loadTeamScouts(context);
    const allowedById = Object.fromEntries(teamScouts.map(scout => [scout.id, scout]));
    const selected = requestedIds.map(id => allowedById[id]).filter(Boolean);

    if (selected.length !== requestedIds.length) {
      return res.status(400).json({ error: 'Every selected Scout must belong to your Scout team.' });
    }

    const content = clean(req.body.message, 1200) ||
      `${scoutName(context.scout)} shared ${playerName(player)} for team review.`;

    const { data: entry, error } = await supabase
      .from('scout_player_workflow_entries')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        player_id: player.id,
        pipeline_id: null,
        entry_type: 'share',
        content,
        decision_value: null,
        shared_with: requestedIds,
        metadata: {
          source: 'scout_v6_player_share',
          playerName: playerName(player)
        },
        is_deleted: false,
        created_by: context.scout.id
      })
      .select()
      .single();
    if (error) throw error;

    await createNotifications(selected.map(scout => ({
      recipient_id: scout.id,
      recipient_type: 'Scout',
      notification_type: 'recruitment',
      title: `${scoutName(context.scout)} shared a player`,
      body: `${playerName(player)} was shared with you for recruitment review.`,
      data: {
        source: 'scout_v6_player_share',
        playerId: player.id,
        sharedBy: context.scout.id
      }
    }))).catch(errorValue => {
      console.warn('[Scout V6 share notifications skipped]', errorValue.message);
    });

    res.status(201).json({
      data: {
        entry,
        sharedWith: selected.map(scout => ({
          id: scout.id,
          first_name: scout.first_name,
          last_name: scout.last_name,
          email: scout.email
        }))
      },
      message: `Player shared with ${selected.length} Scout${selected.length === 1 ? '' : 's'}.`
    });
  } catch (error) {
    console.error('[Scout V6 share player]', error);
    res.status(error.status || 500).json({
      error: error.message || 'The player could not be shared.'
    });
  }
});

router.get('/players/:id/compatibility-explanation', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const player = await latestPlayerAnalysis(req, context, req.params.id);
    res.set('Cache-Control', 'no-store');
    res.json({
      data: {
        playerId: player.id,
        playerName: playerName(player),
        ...player.compatibilityExplanation
      }
    });
  } catch (error) {
    console.error('[Scout V6 compatibility explanation]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Compatibility explanation could not be loaded.'
    });
  }
});

router.post('/compare', async (req, res) => {
  try {
    const playerAId = clean(req.body.playerAId, 120);
    const playerBId = clean(req.body.playerBId, 120);
    const contextLabel = clean(req.body.context || req.body.contextLabel, 100) || 'Immediate starter';

    if (!playerAId || !playerBId) {
      return res.status(400).json({ error: 'Choose two players to compare.' });
    }
    if (playerAId === playerBId) {
      return res.status(400).json({ error: 'Choose two different players.' });
    }

    const context = await loadContext(req.user.id);
    const [playerA, playerB] = await Promise.all([
      latestPlayerAnalysis(req, context, playerAId),
      latestPlayerAnalysis(req, context, playerBId)
    ]);

    const comparison = buildComparison(playerA, playerB, contextLabel);
    const { data: saved, error } = await supabase
      .from('scout_comparisons')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        player_a_id: playerA.id,
        player_b_id: playerB.id,
        comparison_context: comparison.context,
        result: comparison,
        status: 'saved'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      data: {
        comparisonId: saved.id,
        comparison,
        playerA,
        playerB
      }
    });
  } catch (error) {
    console.error('[Scout V6 compare]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Players could not be compared.'
    });
  }
});

router.post('/compare/export', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const supplied = req.body && req.body.comparison && req.body.comparison.comparison
      ? req.body.comparison.comparison
      : req.body?.comparison;
    const playerAId = clean(supplied?.playerA?.id, 120);
    const playerBId = clean(supplied?.playerB?.id, 120);
    const contextLabel = clean(supplied?.context?.label || supplied?.context?.key, 100) || 'Immediate starter';

    if (!playerAId || !playerBId || playerAId === playerBId) {
      return res.status(400).json({ error: 'Run a valid two-player comparison before exporting.' });
    }

    const usageBefore = await getScoutUsageSnapshot(context);
    if (!usageBefore.exports || usageBefore.exports.remaining <= 0) {
      return res.status(402).json({
        error: 'You have reached your export allowance.',
        usage: usageBefore
      });
    }

    const [playerA, playerB] = await Promise.all([
      latestPlayerAnalysis(req, context, playerAId),
      latestPlayerAnalysis(req, context, playerBId)
    ]);
    const comparison = buildComparison(playerA, playerB, contextLabel);
    const buffer = buildComparisonPdf(comparison);
    const filename = `scoutlink-comparison-${new Date().toISOString().slice(0, 10)}.pdf`;

    const { data: log, error } = await supabase
      .from('scout_exports')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        player_id: null,
        prediction_log_id: null,
        export_type: 'PDF',
        source: 'comparison_v6_pdf',
        file_name: filename,
        payload: {
          playerAId: playerA.id,
          playerBId: playerB.id,
          comparison,
          format: 'PDF',
          source: 'comparison_v6_pdf'
        }
      })
      .select()
      .single();
    if (error) throw error;

    const usageAfter = await getScoutUsageSnapshot(context);
    res.status(201).json({
      data: {
        exportId: log.id,
        filename,
        mime: 'application/pdf',
        contentBase64: buffer.toString('base64'),
        exportsRemaining: usageAfter.exports?.remaining ?? Math.max(0, usageBefore.exports.remaining - 1),
        planLimit: usageAfter.exports?.limit ?? usageBefore.exports.limit
      }
    });
  } catch (error) {
    console.error('[Scout V6 compare export]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Comparison PDF could not be created.'
    });
  }
});

router.post('/exports/:id/download', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    let query = supabase
      .from('scout_exports')
      .select('*')
      .eq('id', req.params.id)
      .eq('source', 'comparison_v6_pdf');
    query = context.scout.scout_team_id
      ? query.eq('scout_team_id', context.scout.scout_team_id)
      : query.eq('scout_id', context.scout.id);
    const { data: log, error } = await query.maybeSingle();
    if (error) throw error;
    if (!log) return res.status(404).json({ error: 'Comparison PDF export not found.' });

    const comparison = log.payload?.comparison;
    if (!comparison) return res.status(409).json({ error: 'The saved comparison payload is unavailable.' });
    const buffer = buildComparisonPdf(comparison);
    res.json({
      data: {
        filename: log.file_name || 'scoutlink-comparison.pdf',
        mime: 'application/pdf',
        contentBase64: buffer.toString('base64'),
        historicalDownload: true
      }
    });
  } catch (error) {
    console.error('[Scout V6 comparison history download]', error);
    res.status(error.status || 500).json({ error: error.message || 'Saved comparison PDF could not be downloaded.' });
  }
});

router.get('/pipeline', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const rows = await enrichPipeline(context, await loadPipelineRows(context));
    res.set('Cache-Control', 'no-store');
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('[Scout V6 pipeline]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Pipeline could not be loaded.'
    });
  }
});

router.patch('/pipeline/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const { data: row, error } = await supabase
      .from('recruitment_pipeline')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!row || !canManagePipeline(context, row)) {
      return res.status(404).json({ error: 'Pipeline entry not found.' });
    }

    const updates = { updated_at: new Date().toISOString() };

    if (Object.prototype.hasOwnProperty.call(req.body, 'stage')) {
      const stage = stageValue(req.body.stage);
      if (!stage || !VALID_PIPELINE_STAGES.has(stage)) {
        return res.status(400).json({ error: 'Choose a valid pipeline stage.' });
      }
      updates.stage = stage;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'note') ||
        Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
      updates.notes = clean(req.body.note ?? req.body.notes, 4000) || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'interestLevel')) {
      updates.interest_level = Math.max(1, Math.min(10, integer(req.body.interestLevel, 5)));
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'nextAction')) {
      updates.next_action = clean(req.body.nextAction, 600) || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'nextActionDueAt')) {
      updates.next_action_due_at = req.body.nextActionDueAt || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'recruitmentRisk')) {
      updates.recruitment_risk = clean(req.body.recruitmentRisk, 120) || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'evidenceConfidence')) {
      updates.evidence_confidence = clean(req.body.evidenceConfidence, 120) || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'assignedScoutId')) {
      const assignedScoutId = clean(req.body.assignedScoutId, 120) || null;
      if (assignedScoutId) {
        const teamScouts = await loadTeamScouts(context);
        if (!teamScouts.some(scout => scout.id === assignedScoutId)) {
          return res.status(400).json({ error: 'Assigned Scout must belong to this Scout team.' });
        }
      }
      updates.assigned_scout_id = assignedScoutId;
    }

    const { data: updated, error: updateError } = await supabase
      .from('recruitment_pipeline')
      .update(updates)
      .eq('id', row.id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (updates.notes) {
      await supabase
        .from('scout_player_workflow_entries')
        .insert({
          scout_id: context.scout.id,
          scout_team_id: context.scout.scout_team_id || null,
          player_id: row.player_id,
          pipeline_id: row.id,
          entry_type: 'note',
          content: updates.notes,
          shared_with: [],
          metadata: {
            source: 'pipeline_update',
            stage: updates.stage || row.stage
          },
          created_by: context.scout.id
        });
    }

    res.json({
      data: {
        ...updated,
        displayStage: stageDisplay(updated.stage)
      },
      message: 'Pipeline entry updated.'
    });
  } catch (error) {
    console.error('[Scout V6 pipeline update]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Pipeline entry could not be updated.'
    });
  }
});

router.get('/fixtures', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const bundle = await loadFixtureBundle(context, {
      start: clean(req.query.start, 20) || null,
      end: clean(req.query.end, 20) || null
    });
    res.set('Cache-Control', 'no-store');
    res.json({ data: bundle.fixtures, total: bundle.fixtures.length });
  } catch (error) {
    console.error('[Scout V6 fixtures]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Fixtures could not be loaded.'
    });
  }
});

router.get('/fixtures/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const bundle = await loadFixtureBundle(context);
    const fixture = bundle.fixtures.find(item => String(item.id) === String(req.params.id));
    if (!fixture) return res.status(404).json({ error: 'Fixture not found.' });
    res.json({ data: fixture });
  } catch (error) {
    console.error('[Scout V6 fixture detail]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Fixture details could not be loaded.'
    });
  }
});

router.post('/fixtures/:id/attendance', async (req, res) => {
  try {
    const status = clean(req.body.status, 40).toLowerCase();
    if (!['attending', 'not_attending', 'maybe'].includes(status)) {
      return res.status(400).json({ error: 'Choose attending, maybe or not attending.' });
    }

    const context = await loadContext(req.user.id);
    const { data: fixture, error: fixtureError } = await supabase
      .from('fixtures')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (fixtureError) throw fixtureError;
    if (!fixture) return res.status(404).json({ error: 'Fixture not found.' });

    const { data: existing, error: existingError } = await supabase
      .from('fixture_attendance')
      .select('id')
      .eq('fixture_id', fixture.id)
      .eq('scout_id', context.scout.id)
      .maybeSingle();
    if (existingError) throw existingError;

    const payload = {
      fixture_id: fixture.id,
      scout_id: context.scout.id,
      coach_id: fixture.coach_id || null,
      status,
      updated_at: new Date().toISOString()
    };

    const query = existing
      ? supabase.from('fixture_attendance').update(payload).eq('id', existing.id)
      : supabase.from('fixture_attendance').insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw error;

    if (fixture.coach_id) {
      await createNotifications([{
        recipient_id: fixture.coach_id,
        recipient_type: 'Coach',
        notification_type: 'fixture_attendance',
        title: 'Scout fixture attendance updated',
        body: `${scoutName(context.scout)} marked ${status.replace(/_/g, ' ')} for the fixture against ${fixture.opponent_name || fixture.opponent || 'the opponent'}.`,
        data: {
          source: 'fixture_attendance',
          fixtureId: fixture.id,
          scoutId: context.scout.id,
          status
        }
      }]).catch(errorValue => console.warn('[Scout V6 attendance notification skipped]', errorValue.message));
    }

    res.json({ data, message: 'Fixture attendance saved.' });
  } catch (error) {
    console.error('[Scout V6 attendance]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Attendance could not be saved.'
    });
  }
});

router.post('/fixtures/:id/plan', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const playerId = clean(req.body.playerId, 120);
    const assignedScoutId = clean(req.body.assignedScoutId, 120) || context.scout.id;
    const priority = Math.max(0, Math.min(100, integer(req.body.priority, 70)));
    const objective = clean(req.body.objective, 1500);
    const travelNotes = clean(req.body.travelNotes, 2000);
    const status = clean(req.body.status, 50).toLowerCase() || 'planned';

    if (!playerId || !objective) {
      return res.status(400).json({ error: 'Choose a pipeline player and add an observation objective.' });
    }
    if (!['planned', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Choose a valid fixture-plan status.' });
    }

    const teamScouts = await loadTeamScouts(context);
    if (!teamScouts.some(scout => scout.id === assignedScoutId)) {
      return res.status(400).json({ error: 'Assigned Scout must belong to this Scout team.' });
    }

    const bundle = await loadFixtureBundle(context);
    const fixture = bundle.fixtures.find(item => String(item.id) === String(req.params.id));
    if (!fixture) return res.status(404).json({ error: 'Fixture not found.' });

    const eligiblePlayer = fixture.pipelinePlayers.find(item => String(item.id) === playerId);
    if (!eligiblePlayer) {
      return res.status(400).json({ error: 'Choose a pipeline player connected to this fixture.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('scout_fixture_plans')
      .select('id')
      .eq('scout_id', context.scout.id)
      .eq('fixture_id', fixture.id)
      .eq('player_id', playerId)
      .maybeSingle();
    if (existingError) throw existingError;

    const payload = {
      scout_id: context.scout.id,
      scout_team_id: context.scout.scout_team_id || null,
      fixture_id: fixture.id,
      player_id: playerId,
      assigned_scout_id: assignedScoutId,
      priority,
      objective,
      travel_notes: travelNotes || null,
      status,
      updated_at: new Date().toISOString()
    };

    const query = existing
      ? supabase.from('scout_fixture_plans').update(payload).eq('id', existing.id)
      : supabase.from('scout_fixture_plans').insert(payload);

    const { data, error } = await query.select().single();
    if (error) throw error;

    if (assignedScoutId !== context.scout.id) {
      await createNotifications([{
        recipient_id: assignedScoutId,
        recipient_type: 'Scout',
        notification_type: 'recruitment',
        title: 'Fixture observation assigned',
        body: `${scoutName(context.scout)} assigned you to observe ${playerName(eligiblePlayer)}.`,
        data: {
          source: 'scout_fixture_plan',
          fixtureId: fixture.id,
          playerId,
          planId: data.id
        }
      }]).catch(errorValue => console.warn('[Scout V6 fixture-plan notification skipped]', errorValue.message));
    }

    res.status(existing ? 200 : 201).json({
      data,
      message: existing ? 'Fixture plan updated.' : 'Fixture plan created.'
    });
  } catch (error) {
    console.error('[Scout V6 fixture plan]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Fixture plan could not be saved.'
    });
  }
});

router.get('/events', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const { data: events, error } = await supabase
      .from('showcase_events')
      .select('*')
      .in('status', ['published', 'confirmed'])
      .order('event_date', { ascending: true })
      .limit(100);
    if (error) throw error;

    const ids = (events || []).map(event => event.id);
    const attendanceResult = ids.length
      ? await supabase
          .from('showcase_attendance')
          .select('*')
          .in('event_id', ids)
          .eq('scout_id', context.scout.id)
      : { data: [], error: null };
    if (attendanceResult.error) throw attendanceResult.error;

    const attendanceByEvent = Object.fromEntries((attendanceResult.data || []).map(row => [row.event_id, row]));
    const rows = (events || []).map(event => ({
      ...event,
      attendance: attendanceByEvent[event.id] || null
    }));

    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('[Scout V6 events]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Events could not be loaded.'
    });
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const { data: event, error } = await supabase
      .from('showcase_events')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const [attendanceResult, showcasePlayersResult, pipelineRows] = await Promise.all([
      supabase
        .from('showcase_attendance')
        .select('*')
        .eq('event_id', event.id)
        .eq('scout_id', context.scout.id)
        .maybeSingle(),
      supabase
        .from('showcase_players')
        .select('id,player_id,status,added_at')
        .eq('event_id', event.id),
      loadPipelineRows(context)
    ]);
    if (attendanceResult.error) throw attendanceResult.error;
    if (showcasePlayersResult.error) throw showcasePlayersResult.error;

    const pipelinePlayerIds = unique(pipelineRows.map(row => row.player_id));
    const eventPlayerIds = unique((showcasePlayersResult.data || []).map(row => row.player_id));
    const relevantIds = eventPlayerIds.length
      ? eventPlayerIds.filter(id => pipelinePlayerIds.includes(id))
      : pipelinePlayerIds.slice(0, 20);

    const playerResult = relevantIds.length
      ? await supabase
          .from('players')
          .select('id,first_name,last_name,age_group,primary_position,specific_position,position_group,team_name')
          .in('id', relevantIds)
      : { data: [], error: null };
    if (playerResult.error) throw playerResult.error;

    const pipelineByPlayer = Object.fromEntries(pipelineRows.map(row => [row.player_id, row]));

    res.json({
      data: {
        event,
        attendance: attendanceResult.data || null,
        trackedPlayers: (playerResult.data || []).map(player => ({
          ...player,
          pipeline: pipelineByPlayer[player.id] || null
        }))
      }
    });
  } catch (error) {
    console.error('[Scout V6 event detail]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Event details could not be loaded.'
    });
  }
});

router.post('/events/:id/attendance', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const status = clean(req.body.status, 40).toLowerCase();
    if (!['confirmed', 'cancelled', 'waitlisted'].includes(status)) {
      return res.status(400).json({ error: 'Choose confirmed, waitlisted or cancelled.' });
    }

    const { data: event, error: eventError } = await supabase
      .from('showcase_events')
      .select('id,event_name')
      .eq('id', req.params.id)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const { data: existing, error: existingError } = await supabase
      .from('showcase_attendance')
      .select('id')
      .eq('event_id', event.id)
      .eq('scout_id', context.scout.id)
      .maybeSingle();
    if (existingError) throw existingError;

    const payload = {
      event_id: event.id,
      scout_id: context.scout.id,
      status,
      confirmed_at: status === 'confirmed' ? new Date().toISOString() : null
    };
    const query = existing
      ? supabase.from('showcase_attendance').update(payload).eq('id', existing.id)
      : supabase.from('showcase_attendance').insert(payload);
    const { data, error } = await query.select().single();
    if (error) throw error;

    res.json({ data, message: 'Event attendance updated.' });
  } catch (error) {
    console.error('[Scout V6 event attendance]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Event attendance could not be updated.'
    });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const teamScouts = await loadTeamScouts(context);
    const usage = await getScoutUsageSnapshot(context);
    const seatLimit = number(usage?.limits?.seats ?? context.team?.plan_limits?.seats, 0) ||
      ({ Core: 1, Plus: 5, Elite: 10 }[context.team?.subscription_plan || context.scout.subscription_plan] || teamScouts.length);

    res.set('Cache-Control', 'no-store');
    res.json({
      data: {
        scout: context.scout,
        team: context.team,
        teamScouts,
        seats: {
          used: teamScouts.length,
          limit: seatLimit,
          remaining: Math.max(0, seatLimit - teamScouts.length)
        },
        personalSetup: personalSetupFromPrefs(context.prefs)
      }
    });
  } catch (error) {
    console.error('[Scout V6 settings]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Settings could not be loaded.'
    });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const fullName = clean(req.body.fullName, 220);
    const email = clean(req.body.email, 254).toLowerCase();
    const organisation = clean(req.body.organisation, 240);
    const phone = clean(req.body.phone, 80);

    const updates = { updated_at: new Date().toISOString() };

    if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      updates.first_name = parts.shift() || context.scout.first_name;
      updates.last_name = parts.join(' ') || context.scout.last_name;
    }

    if (email && email !== String(context.scout.email || '').toLowerCase()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }
      if (!(await uniqueEmailAvailable(email, context.scout.id))) {
        return res.status(409).json({ error: 'That email address is already registered on ScoutLink.' });
      }
      updates.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      updates.phone = phone || null;
    }

    const { data: scout, error } = await supabase
      .from('scouts')
      .update(updates)
      .eq('id', context.scout.id)
      .select()
      .single();
    if (error) throw error;

    let team = context.team;
    if (organisation && context.scout.is_super_user && context.scout.scout_team_id) {
      const result = await supabase
        .from('scout_teams')
        .update({
          team_name: organisation,
          club_name: organisation,
          updated_at: new Date().toISOString()
        })
        .eq('id', context.scout.scout_team_id)
        .select()
        .single();
      if (result.error) throw result.error;
      team = result.data;
    }

    res.json({ data: { scout, team }, message: 'Settings saved.' });
  } catch (error) {
    console.error('[Scout V6 settings update]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Settings could not be saved.'
    });
  }
});

router.get('/setup', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const personalSetup = personalSetupFromPrefs(
      context.prefs,
      context.team || {}
    );

    res.set('Cache-Control', 'no-store');
    res.json({
      data: {
        personalSetup,
        scoutPreferences: context.prefs,
        team: context.team,
        options: setupOptionsFor(),
        note:
          'Scout Setup uses five compatibility inputs. Team needs allow up to three selections. Required role, formation, playing style and long-term development plan are single-select.'
      }
    });
  } catch (error) {
    console.error('[Scout V6 setup]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Scout Setup could not be loaded.'
    });
  }
});

router.patch('/setup', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const current = context.prefs || {};
    const currentResolved = personalSetupFromPrefs(
      current,
      context.team || {}
    );

    if (
      Array.isArray(req.body.requiredRole) ||
      Array.isArray(req.body.formation) ||
      Array.isArray(req.body.playingStyle) ||
      Array.isArray(req.body.developmentPlan)
    ) {
      return res.status(400).json({
        error:
          'Required role, formation, playing style and long-term goal each allow one selection only.'
      });
    }

    const teamNeeds = unique(
      list(req.body.teamNeeds ?? currentResolved.teamNeeds)
        .map(canonicalTeamNeed)
        .filter(Boolean)
    );

    if (!teamNeeds.length) {
      return res.status(400).json({
        error: 'Choose at least one team weakness / recruitment need.'
      });
    }

    if (teamNeeds.length > 3) {
      return res.status(400).json({
        error: 'Choose no more than three team weaknesses.'
      });
    }

    const requiredRole = canonicalRequiredRole(
      req.body.requiredRole ?? currentResolved.requiredRole
    );
    if (!requiredRole) {
      return res.status(400).json({
        error: 'Choose one supported required role.'
      });
    }

    const formation = clean(
      req.body.formation ?? currentResolved.formation,
      60
    );
    if (!FORMATION_OPTIONS.some(option => option.value === formation)) {
      return res.status(400).json({
        error: 'Choose one formation supported by the compatibility engine.'
      });
    }

    const playingStyle = canonicalPlayingStyle(
      req.body.playingStyle ?? currentResolved.playingStyle
    );
    if (!playingStyle) {
      return res.status(400).json({
        error: 'Choose one playing style supported by the compatibility engine.'
      });
    }

    const developmentPlan = canonicalDevelopmentPlan(
      req.body.developmentPlan ?? currentResolved.developmentPlan
    );
    if (!developmentPlan) {
      return res.status(400).json({
        error: 'Choose one supported long-term development goal.'
      });
    }

    const preferredPositions = unique(
      list(req.body.preferredPositions || currentResolved.preferredPositions)
        .map(value => clean(value, 20).toUpperCase())
    ).slice(0, 10);
    const priorityAgeGroups = unique(
      list(req.body.priorityAgeGroups || currentResolved.priorityAgeGroups)
        .map(value => clean(value, 20).toUpperCase())
    ).slice(0, 10);
    const scoutRegion = clean(
      req.body.scoutRegion ?? currentResolved.scoutRegion,
      180
    );
    const scoutingRole = clean(
      req.body.scoutingRole ?? currentResolved.scoutingRole,
      120
    );
    const personalFocus = clean(
      req.body.personalFocus ?? currentResolved.personalFocus,
      600
    );
    const reportingStyle = clean(
      req.body.reportingStyle ?? currentResolved.reportingStyle,
      300
    );
    const minimumAppearances = integer(
      req.body.minimumAppearances ?? currentResolved.minimumAppearances,
      0
    );
    const matchFormat = formationMatchFormat(formation);
    const updatedAt = new Date().toISOString();

    const setup = {
      ...(current.setup && typeof current.setup === 'object'
        ? current.setup
        : {}),
      teamNeeds,
      teamWeaknesses: teamNeeds,
      requiredRole,
      roleExpectations: [requiredRole],
      formation,
      playingStyle,
      developmentPlan,
      longTermGoals: [developmentPlan],
      preferredPositions,
      ageGroups: priorityAgeGroups,
      scoutRegion,
      matchFormat,
      updatedAt
    };

    const next = {
      ...current,
      teamNeeds,
      teamWeaknesses: teamNeeds,
      requiredRole,
      roleExpectations: [requiredRole],
      formation,
      playingStyle,
      developmentPlan,
      longTermGoals: [developmentPlan],
      preferredPositions,
      priorityAgeGroups,
      scoutRegion,
      scoutingRole,
      personalFocus,
      reportingStyle,
      minimumAppearances,
      matchFormat,
      setup,
      updatedAt,
      compatibilityRecalculationRequired: true
    };

    const { data, error } = await supabase
      .from('scouts')
      .update({
        scout_preferences: next,
        preferences_set: true,
        updated_at: updatedAt
      })
      .eq('id', context.scout.id)
      .select('scout_preferences')
      .single();
    if (error) throw error;

    const saved = personalSetupFromPrefs(
      data.scout_preferences || next,
      context.team || {}
    );

    res.json({
      data: {
        personalSetup: saved,
        scoutPreferences: data.scout_preferences || next,
        options: setupOptionsFor()
      },
      message:
        'Your five-input Scout Setup has been saved and will be used for Scout-specific compatibility.',
      compatibilityRecalculationRequired: true
    });
  } catch (error) {
    console.error('[Scout V6 setup update]', error);
    res.status(error.status || 500).json({
      error: error.message || 'Scout Setup could not be saved.'
    });
  }
});

router.post('/concerns', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);
    const concerns = clean(req.body.concerns || req.body.subjectType, 120) || 'Something else';
    const subjectId = clean(req.body.subjectId, 120) || null;
    const details = clean(req.body.details || req.body.body, 6000);
    const urgency = clean(req.body.urgency, 120) || 'No immediate risk';

    if (!details) {
      return res.status(400).json({ error: 'Describe what happened before submitting the concern.' });
    }

    const severity = /today|immediate|urgent/i.test(urgency)
      ? 'critical'
      : /week/i.test(urgency)
        ? 'warning'
        : 'info';

    const { data: event, error } = await supabase
      .from('scout_activity_events')
      .insert({
        scout_id: context.scout.id,
        scout_team_id: context.scout.scout_team_id || null,
        player_id: concerns.toLowerCase().includes('player') && isUuid(subjectId) ? subjectId : null,
        event_type: 'concern_reported',
        title: `Confidential Scout concern · ${concerns}`,
        body: details,
        severity,
        data: {
          confidential: true,
          concerns,
          subjectId,
          urgency,
          submittedBy: scoutName(context.scout),
          teamName: context.team?.team_name || context.scout.club_name || null
        }
      })
      .select()
      .single();
    if (error) throw error;

    const { data: admins, error: adminError } = await supabase
      .from('stratex')
      .select('id')
      .eq('is_active', true);
    if (adminError) throw adminError;

    await createNotifications((admins || []).map(admin => ({
      recipient_id: admin.id,
      recipient_type: 'Stratex',
      notification_type: 'admin_message',
      title: 'Confidential Scout concern submitted',
      body: `${scoutName(context.scout)} submitted a ${urgency.toLowerCase()} concern concerning ${concerns.toLowerCase()}.`,
      data: {
        source: 'scout_concern',
        concernEventId: event.id,
        scoutId: context.scout.id,
        urgency,
        confidential: true
      }
    }))).catch(errorValue => console.warn('[Scout V6 concern notification skipped]', errorValue.message));

    res.status(201).json({
      data: { id: event.id, submittedAt: event.created_at },
      message: 'Your concern was submitted confidentially to Stratex.'
    });
  } catch (error) {
    console.error('[Scout V6 concern]', error);
    res.status(error.status || 500).json({
      error: error.message || 'The concern could not be submitted.'
    });
  }
});

router.delete('/chat/messages/:id', async (req, res) => {
  try {
    const context = await loadContext(req.user.id);

    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select('id,thread_id,sender_id,sender_type,created_at')
      .eq('id', req.params.id)
      .maybeSingle();
    if (messageError) throw messageError;
    if (!message) return res.status(404).json({ error: 'Message not found.' });

    if (String(message.sender_id) !== String(context.scout.id) || message.sender_type !== 'Scout') {
      return res.status(403).json({ error: 'You can only delete messages you sent.' });
    }

    const { data: thread, error: threadError } = await supabase
      .from('chat_threads')
      .select('id,scout_id,created_at')
      .eq('id', message.thread_id)
      .maybeSingle();
    if (threadError) throw threadError;
    if (!thread || String(thread.scout_id) !== String(context.scout.id)) {
      return res.status(403).json({ error: 'You do not have access to this conversation.' });
    }

    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', message.id);
    if (deleteError) throw deleteError;

    const { data: latest, error: latestError } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('thread_id', thread.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    await supabase
      .from('chat_threads')
      .update({
        last_message_at: latest?.created_at || thread.created_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', thread.id);

    res.json({ data: { id: message.id }, message: 'Message deleted.' });
  } catch (error) {
    console.error('[Scout V6 delete chat message]', error);
    res.status(error.status || 500).json({
      error: error.message || 'The message could not be deleted.'
    });
  }
});


module.exports = router;
