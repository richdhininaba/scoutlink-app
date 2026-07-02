'use strict';
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
if (!config.supabase.url) throw new Error('SUPABASE_URL not set');
if (!config.supabase.serviceRoleKey) {
  console.warn('[Supabase] Service role key is not configured; RLS-protected admin writes will fail.');
}
// Backend routes use the privileged key when configured. The anon client below is for browser-compatible checks only.
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);
module.exports = { supabase, supabaseAnon };
