'use strict';

/*
 * ScoutLink V4 player migration and recalculation utility.
 *
 * Usage:
 *   node backend/scripts/recalculatePlayersV4.js --demo-only --dry-run
 *   node backend/scripts/recalculatePlayersV4.js --demo-only
 *   node backend/scripts/recalculatePlayersV4.js --all --dry-run
 *   node backend/scripts/recalculatePlayersV4.js --all
 */

require('dotenv').config();

const { supabase } = require('../db/supabase');
const engines = require('../engines');
const scoringService = require('../services/playerScoringService');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const allPlayers = args.has('--all');
const demoOnly = !allPlayers || args.has('--demo-only');

const POSITION_SEQUENCE = [
  'ST','RW','AM','CB','CM','RB','LW','LB','GK','DM',
  'CF','RWB','LM','LWB','RM'
];

function hash(value) {
  let result = 2166136261;
  for (const character of String(value || 'scoutlink')) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function integerRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const converted = number > 10 ? number / 10 : number;
  return Math.max(1, Math.min(10, Math.round(converted)));
}

function completeDemoRatings(player, position, rowIndex) {
  const group = engines.utils.getPositionGroup(position);
  const keys = engines.utils.attributesForGroup(group);
  const current = engines.utils.collectRatings(player, keys);
  const base = integerRating(player.overall_rating) || 7;
  const flat = {};

  keys.forEach((key, attributeIndex) => {
    const existing = current[key] === null || current[key] === undefined
      ? null
      : integerRating(Number(current[key]) / 10);
    const variation = (hash(`${player.id || rowIndex}:${key}`) % 5) - 2;
    flat[key] = existing || Math.max(4, Math.min(10, Math.round(base + variation * 0.55)));
  });

  if (group === 'Goalkeeper') return { goalkeeper: flat };

  const general = {};
  const specific = {};
  const generalSet = new Set(engines.config.GENERAL_ATTRIBUTES);
  Object.entries(flat).forEach(([key, value]) => {
    if (generalSet.has(key)) general[key] = value;
    else specific[key] = value;
  });
  return { general, [group.toLowerCase()]:specific };
}

function migratedRatings(player, position, isDemo, index) {
  if (isDemo) return completeDemoRatings(player, position, index);

  const group = engines.utils.getPositionGroup(position);
  const keys = engines.utils.attributesForGroup(group);
  const flat = {};
  keys.forEach(key => {
    const score = engines.utils.getAttributeRating(player, key);
    if (score === null || score === undefined) return;
    flat[key] = Math.max(1, Math.min(10, Math.round(Number(score) / 10)));
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

function migrationPayload(player, index) {
  const currentPosition = engines.utils.getPrimaryPosition(player);
  const position = currentPosition || (player.is_demo ? POSITION_SEQUENCE[index % POSITION_SEQUENCE.length] : null);
  if (!position) {
    return { error:'A canonical primary position could not be resolved.' };
  }

  const group = engines.utils.getPositionGroup(position);
  const ageGroup = engines.utils.normaliseAgeGroup(player.age_group);
  if (!ageGroup) {
    return { error:'Age group is outside U7-U16.' };
  }

  const declared = engines.utils.unique([
    position,
    ...engines.utils.normalisePositions(player.positions),
    ...engines.utils.normalisePositions(player.alternative_positions)
  ]).slice(0, 3);

  return {
    value:{
      age:Number(ageGroup.slice(1)),
      age_group:ageGroup,
      position_group:group,
      specific_position:position,
      primary_position:position,
      positions:declared,
      alternative_positions:declared.filter(item => item !== position),
      attribute_ratings:migratedRatings(player, position, Boolean(player.is_demo), index),
      attribute_rating_scale:'ten',
      attribute_assessment_version:player.is_demo
        ? '2026-07-31-demo-v4'
        : '2026-07-31-legacy-v4',
      attribute_assessed_at:player.attribute_assessed_at || player.updated_at || player.created_at || new Date().toISOString(),
      scoring_version:engines.config.SCORING_VERSION
    }
  };
}

async function loadPlayers() {
  let query = supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending:true });
  if (demoOnly) query = query.eq('is_demo', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function run() {
  const rows = await loadPlayers();
  const report = {
    mode:demoOnly ? 'demo-only' : 'all',
    dryRun,
    total:rows.length,
    migrated:0,
    recalculated:0,
    skipped:0,
    failed:0,
    details:[]
  };

  for (let index = 0; index < rows.length; index += 1) {
    const player = rows[index];
    const migration = migrationPayload(player, index);

    if (migration.error) {
      report.skipped += 1;
      report.details.push({ id:player.id, status:'skipped', reason:migration.error });
      continue;
    }

    try {
      if (!dryRun) {
        const { error } = await supabase
          .from('players')
          .update(migration.value)
          .eq('id', player.id);
        if (error) throw error;
      }
      report.migrated += 1;

      let analysis = null;
      if (!dryRun) {
        analysis = await scoringService.recalculatePlayer(player.id);
        report.recalculated += 1;
      } else {
        const previewPlayer = { ...player, ...migration.value };
        const { data: matchHistory, error } = await supabase
          .from('match_facts')
          .select('*')
          .eq('player_id', player.id)
          .order('match_date', { ascending:false })
          .limit(30);
        if (error) throw error;
        analysis = scoringService.calculatePlayerAnalysis(previewPlayer, matchHistory || []);
      }

      report.details.push({
        id:player.id,
        name:[player.first_name, player.last_name].filter(Boolean).join(' '),
        status:dryRun ? 'previewed' : 'migrated',
        position:migration.value.primary_position,
        group:migration.value.position_group,
        ageGroup:migration.value.age_group,
        overallRating:analysis.overallRating,
        evidenceStatus:analysis.evidenceConfidence?.status || analysis.evidenceConfidence?.label || null,
        scoringVersion:analysis.scoringVersion
      });
    } catch (error) {
      report.failed += 1;
      report.details.push({ id:player.id, status:'failed', reason:error.message });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.failed) process.exitCode = 1;
}

run().catch(error => {
  console.error('[V4 recalculation failed]', error);
  process.exitCode = 1;
});
