'use strict';
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const config = require('../config');
if (!config.supabase.url) throw new Error('SUPABASE_URL not set');

function createServiceRoleJwt() {
  if (!config.supabase.jwtSecret) return null;
  const refMatch = String(config.supabase.url || '').match(/^https:\/\/([^.]+)\.supabase\.co/i);
  const projectRef = refMatch ? refMatch[1] : undefined;
  return jwt.sign(
    {
      role: 'service_role',
      iss: 'supabase',
      ref: projectRef,
    },
    config.supabase.jwtSecret,
    { expiresIn: '10y' }
  );
}

const backendKey = config.supabase.serviceRoleKey || createServiceRoleJwt();
if (!backendKey) {
  console.warn('[Supabase] Service role credentials are not configured; RLS-protected admin writes will fail.');
}

// Backend routes use privileged server credentials when configured. The anon client below is for browser-compatible checks only.
const supabase = createClient(config.supabase.url, backendKey || config.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const supabaseAnon = createClient(config.supabase.url, config.supabase.anonKey);
module.exports = { supabase, supabaseAnon };
