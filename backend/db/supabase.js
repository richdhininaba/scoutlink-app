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

function wrapPlayerBuilder(builder) {
  if (!builder || typeof builder !== 'object') return builder;

  return new Proxy(builder, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      return function avatarSafeBuilderMethod(...args) {
        if (property === 'select' && args.length) {
          args[0] = stripAvatarColumns(args[0]);
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
  stripPlayerAvatarColumns: stripAvatarColumns
};
