'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

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

function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = verifyToken(h.split(' ')[1]); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.flat().includes(req.user.accountType)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
module.exports = { generateLoginCode, hashPassword, verifyPassword, signToken, verifyToken, generateId, requireAuth, requireRole };