'use strict';

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const config = require('../config');

if (!config.supabase.url) {
  throw new Error('SUPABASE_URL not set');
}

if (!config.supabase.serviceRoleKey) {
  console.warn(
    '[Supabase] Service role credentials are not configured; RLS-protected admin writes will fail.'
  );
}

const serverSupabaseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    transport: WebSocket
  }
};

const PLAYER_AVATAR_FIELDS = new Set([
  'avatar_config',
  'avatarConfig',
  'avatar_url',
  'avatarUrl',
  'avatar_seed',
  'avatarSeed',
  'avatar_style',
  'avatarStyle'
]);

/*
 * Older Scout routes still use explicit player select lists. Keep those routes
 * on the authoritative V4 scoring contract until every legacy select has been
 * removed. This only appends saved evidence/output columns; it never exposes
 * proprietary scoring weights or formulas.
 */
const PLAYER_V4_READ_COLUMNS = Object.freeze([
  'alternative_positions',
  'attribute_ratings',
  'attribute_rating_scale',
  'attribute_assessment_version',
  'attribute_assessed_at',
  'attribute_assessed_by',
  'overall_breakdown',
  'position_ratings',
  'evidence_confidence',
  'prediction_analysis',
  'value_analysis',
  'scoring_input_snapshot',
  'scoring_result',
  'scoring_version',
  'scored_at'
]);

function stripAvatarFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripAvatarFields);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output = {};
  Object.keys(value).forEach((key) => {
    if (PLAYER_AVATAR_FIELDS.has(key)) return;
    output[key] = stripAvatarFields(value[key]);
  });
  return output;
}

function stripAvatarColumns(columns) {
  if (typeof columns !== 'string') return columns;

  return columns
    .split(',')
    .map((column) => column.trim())
    .filter((column) => {
      const plain = column
        .replace(/^[^:]+:/, '')
        .replace(/[()]/g, '')
        .trim();

      return ![
        'avatar_config',
        'avatar_url',
        'avatar_seed',
        'avatar_style'
      ].includes(plain);
    })
    .join(',');
}

function ensurePlayerV4ReadColumns(columns) {
  if (typeof columns !== 'string') return columns;

  const cleaned = stripAvatarColumns(columns);
  if (!cleaned || cleaned.trim() === '*' || cleaned.includes('*')) {
    return cleaned;
  }

  const selected = new Set(
    cleaned
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean)
      .map((column) => column.replace(/^[^:]+:/, '').trim())
  );

  const additions = PLAYER_V4_READ_COLUMNS.filter((column) => !selected.has(column));
  return additions.length ? [cleaned, ...additions].filter(Boolean).join(',') : cleaned;
}

function wrapPlayerBuilder(builder) {
  if (!builder || typeof builder !== 'object') return builder;

  return new Proxy(builder, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      return function playerSafeBuilderMethod(...args) {
        if (property === 'select' && args.length) {
          args[0] = ensurePlayerV4ReadColumns(args[0]);
        }

        if (
          ['insert', 'update', 'upsert'].includes(property) &&
          args.length
        ) {
          args[0] = stripAvatarFields(args[0]);
        }

        const result = value.apply(target, args);
        return result === target || (
          result &&
          typeof result === 'object' &&
          typeof result.then === 'function'
        )
          ? wrapPlayerBuilder(result)
          : result;
      };
    }
  });
}

function avatarSafeClient(client) {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'from') {
        return function from(table) {
          const builder = target.from(table);
          return table === 'players'
            ? wrapPlayerBuilder(builder)
            : builder;
        };
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function'
        ? value.bind(target)
        : value;
    }
  });
}

const rawSupabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey || config.supabase.anonKey,
  serverSupabaseOptions
);

const rawSupabaseAnon = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  serverSupabaseOptions
);

const supabase = avatarSafeClient(rawSupabase);
const supabaseAnon = avatarSafeClient(rawSupabaseAnon);

module.exports = {
  supabase,
  supabaseAnon,
  stripPlayerAvatarFields: stripAvatarFields,
  stripPlayerAvatarColumns: stripAvatarColumns,
  ensurePlayerV4ReadColumns
};
