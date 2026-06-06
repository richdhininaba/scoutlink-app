'use strict';
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
if (!config.supabase.url) throw new Error('SUPABASE_URL not set');
if (!config.supabase.serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);
module.exports = { supabase, supabaseAnon };