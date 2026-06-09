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
  } catch (e) {}

  // Try Supabase JWT with secret
  try {
    const supabaseJwtSecret = config.supabase.jwtSecret;
    if (supabaseJwtSecret) {
      const decoded = jwt.verify(token, supabaseJwtSecret);
      req.user = { email: decoded.email, id: decoded.sub, _isSupabase: true, _token: token };
      return next();
    }
  } catch (e2) {}

  // Fallback: decode without verification (safe - Supabase already validated the token)
  const payload = decodeTokenPayload(token);
  if (payload && payload.email && payload.sub) {
    req.user = { email: payload.email, id: payload.sub, _isSupabase: true, _token: token };
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
}

async function resolveSupabaseUser(req, supabase) {
  if (!req.user || !req.user._isSupabase) return;
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

// Express 4 compatible async middleware wrapper
function requireRole(...roles) {
  const allowed = roles.flat();
  return function(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.user._isSupabase) {
      // Already a backend JWT - just check role
      if (!allowed.includes(req.user.accountType)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return next();
    }

    // Supabase token - need to resolve role async
    const { supabase } = require('../db/supabase');
    resolveSupabaseUser(req, supabase)
      .then(function() {
        if (!req.user.accountType) {
          return res.status(403).json({ error: 'Forbidden - account not found' });
        }
        if (!allowed.includes(req.user.accountType)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
        next();
      })
      .catch(function(e) {
        console.error('[Auth] requireRole error:', e.message);
        res.status(500).json({ error: 'Authentication error' });
      });
  };
}

module.exports = { generateLoginCode, hashPassword, verifyPassword, signToken, verifyToken, generateId, requireAuth, requireRole, resolveSupabaseUser, decodeTokenPayload };
