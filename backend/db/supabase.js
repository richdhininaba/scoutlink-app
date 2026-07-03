'use strict';
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const config = require('../config');
if (!config.supabase.url) throw new Error('SUPABASE_URL not set');
if (!config.supabase.serviceRoleKey) {
  console.warn('[Supabase] Service role credentials are not configured; RLS-protected admin writes will fail.');
}

const serverSupabaseOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: WebSocket },
};

// Backend routes use privileged server credentials when configured. The anon client below is for browser-compatible checks only.
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey, serverSupabaseOptions);
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey, serverSupabaseOptions);
module.exports = { supabase, supabaseAnon };
