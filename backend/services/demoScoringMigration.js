'use strict';

/*
 * Idempotent migration for the fictional Supabase demo-player catalogue.
 * Real players are never given invented ratings by this service.
 */
const { supabase } = require('../db/supabase');
const engines = require('../engines');
const scoringService = require('./playerScoringService');

const POSITION_SEQUENCE = [
  'ST','RW','AM','CB','CM','RB','LW','LB','GK','DM','CF','RWB','LM','LWB','RM'
];

let activeRun = null;

function hash(value) {
  let result = 2166136261;
  for (const character of String(value || 'scoutlink')) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function toTen(value, fallback = null) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  const converted = number > 10 ? number / 10 : number;
  return Math.max(1, Math.min(10, Math.round(converted)));
}

function completeRatings(player, position, index) {
  const group = engines.utils.getPositionGroup(position);
  const keys = engines.utils.attributesForGroup(group);
  const existing = engines.utils.collectRatings(player, keys);
  const base = toTen(player.overall_rating, 7);
  const flat = {};

  keys.forEach(key => {
    const current = existing[key] == null ? null : toTen(Number(existing[key]) / 10, null);
    const variation = (hash(`${player.id || index}:${key}`) % 5) - 2;
    flat[key] = current || Math.max(4, Math.min(10, Math.round(base + variation * 0.55)));
  });

  if (group === 'Goalkeeper') return { goalkeeper:flat };

  const general = {};
  const specific = {};
  const generalSet = new Set(engines.config.GENERAL_ATTRIBUTES);
  Object.entries(flat).forEach(([key, value]) => {
    if (generalSet.has(key)) general[key] = value;
    else specific[key] = value;
  });
  return { general, [group.toLowerCase()]:specific };
}

function canonicalPlayerPayload(player, index) {
  const position = engines.utils.getPrimaryPosition(player) || POSITION_SEQUENCE[index % POSITION_SEQUENCE.length];
  const group = engines.utils.getPositionGroup(position);
  const ageGroup = engines.utils.normaliseAgeGroup(player.age_group) || `U${12 + (index % 5)}`;
  const declared = engines.utils.unique([
    position,
    ...engines.utils.normalisePositions(player.positions),
    ...engines.utils.normalisePositions(player.alternative_positions)
  ]).slice(0, 3);

  return {
    age:Number(ageGroup.slice(1)),
    age_group:ageGroup,
    position_group:group,
    specific_position:position,
    primary_position:position,
    positions:declared,
    alternative_positions:declared.filter(item => item !== position),
    attribute_ratings:completeRatings(player, position, index),
    attribute_rating_scale:'ten',
    attribute_assessment_version:`${engines.config.ATTRIBUTE_RUBRIC_VERSION}-demo`,
    attribute_assessed_at:player.attribute_assessed_at || player.updated_at || player.created_at || new Date().toISOString(),
    scoring_version:engines.config.SCORING_VERSION
  };
}

function hasCompleteRequiredRatings(player) {
  const position = engines.utils.getPrimaryPosition(player);
  const group = engines.utils.getPositionGroup(position);
  if (!position || !group || player.attribute_rating_scale !== 'ten') return false;
  const required = engines.utils.attributesForGroup(group);
  const collected = engines.utils.collectRatings(player, required);
  return required.every(key => Number.isFinite(Number(collected[key])));
}

function needsMigration(player, force) {
  return Boolean(
    force ||
    player.scoring_version !== engines.config.SCORING_VERSION ||
    !hasCompleteRequiredRatings(player) ||
    !engines.utils.getPrimaryPosition(player) ||
    player.position_group !== engines.utils.getPositionGroup(player)
  );
}

async function updateOne(player, index, facts) {
  const canonical = canonicalPlayerPayload(player, index);
  const preview = { ...player, ...canonical };
  const snapshot = scoringService.scoringInputSnapshot(preview, facts, null, {});
  const analysis = scoringService.calculatePlayerAnalysis(preview, facts, null, {}, {});
  const calculated = scoringService.playerPersistencePayload(analysis, snapshot);
  const payload = {
    ...canonical,
    ...calculated,
    scored_at:analysis.calculatedAt || new Date().toISOString()
  };

  const { error } = await supabase.from('players').update(payload).eq('id', player.id);
  if (error) throw error;

  return {
    id:player.id,
    name:[player.first_name, player.last_name].filter(Boolean).join(' '),
    position:canonical.primary_position,
    group:canonical.position_group,
    overallRating:analysis.overallRating,
    evidenceStatus:analysis.evidenceConfidence?.status || analysis.evidenceConfidence?.label || null
  };
}

async function runMigration({ force = false } = {}) {
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('is_demo', true)
    .eq('is_active', true)
    .order('created_at', { ascending:true });
  if (error) throw error;

  const stale = (players || []).filter(player => needsMigration(player, force));
  if (!stale.length) {
    return { status:'current', total:(players || []).length, migrated:0, failed:0, scoringVersion:engines.config.SCORING_VERSION };
  }

  const ids = stale.map(player => player.id);
  const { data: facts, error:factsError } = await supabase
    .from('match_facts')
    .select('*')
    .in('player_id', ids)
    .order('match_date', { ascending:false });
  if (factsError) throw factsError;

  const factsByPlayer = (facts || []).reduce((mapped, fact) => {
    if (!mapped[fact.player_id]) mapped[fact.player_id] = [];
    if (mapped[fact.player_id].length < 30) mapped[fact.player_id].push(fact);
    return mapped;
  }, {});

  const report = {
    status:'migrated',
    total:(players || []).length,
    requested:stale.length,
    migrated:0,
    failed:0,
    scoringVersion:engines.config.SCORING_VERSION,
    details:[]
  };

  for (let offset = 0; offset < stale.length; offset += 5) {
    const batch = stale.slice(offset, offset + 5);
    const outcomes = await Promise.allSettled(batch.map((player, batchIndex) => {
      const originalIndex = (players || []).findIndex(row => row.id === player.id);
      return updateOne(player, originalIndex >= 0 ? originalIndex : offset + batchIndex, factsByPlayer[player.id] || []);
    }));
    outcomes.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') {
        report.migrated += 1;
        report.details.push(outcome.value);
      } else {
        report.failed += 1;
        report.details.push({ id:batch[index].id, error:outcome.reason?.message || String(outcome.reason) });
      }
    });
  }

  return report;
}

function ensureDemoPlayersV4(options = {}) {
  if (!activeRun) {
    activeRun = runMigration(options).finally(() => { activeRun = null; });
  }
  return activeRun;
}

module.exports = {
  ensureDemoPlayersV4,
  completeRatings,
  canonicalPlayerPayload,
  hasCompleteRequiredRatings
};
