'use strict';
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
if (!config.supabase.url) throw new Error('SUPABASE_URL not set');
// SUPABASE_SERVICE_ROLE_KEY is optional - falls back to anon key
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey || config.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);
module.exports = { supabase, supabaseAnon };
