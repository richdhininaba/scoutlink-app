'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { hashPassword, verifyPassword, signToken, generateLoginCode } = require('../utils/auth');
const email = require('../services/email');

const TABLE_MAP = { Player:'players', Coach:'coaches', Scout:'scouts', Stratex:'stratex' };

// Helper: generate unique login code (no duplicates within a table)
async function generateUniqueCode(table) {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateLoginCode();
    const { data } = await supabase.from(table).select('id').eq('login_code', code).maybeSingle();
    if (!data) return code; // unique
    attempts++;
  }
  throw new Error('Could not generate unique login code');
}

router.post('/login', async (req, res) => {
try {
const { email: rawEmail, loginCode, password, accountType } = req.body;
if (!rawEmail || !accountType) return res.status(400).json({ error: 'email and accountType required' });
const table = TABLE_MAP[accountType];
if (!table) return res.status(400).json({ error: 'Invalid accountType' });
const { data: user } = await supabase.from(table).select('*').eq('email', rawEmail.toLowerCase().trim()).eq('is_active', true).single();
if (!user) return res.status(401).json({ error: 'Invalid login credentials' });

if (loginCode) {
if (!user.login_code) return res.status(401).json({ error: 'No login code set for this account' });
if (user.login_code !== loginCode.toUpperCase()) return res.status(401).json({ error: 'Invalid login code' });
if (user.login_code_expires && new Date(user.login_code_expires) < new Date()) return res.status(401).json({ error: 'Login code expired. Please use forgot password to get a new one.' });
await supabase.from(table).update({ login_code: null, login_code_expires: null, last_login: new Date() }).eq('id', user.id);
} else if (password) {
if (!user.password_hash) return res.status(401).json({ error: 'No password set. Please use your login code to complete registration first.' });
const valid = await verifyPassword(password, user.password_hash);
if (!valid) return res.status(401).json({ error: 'Invalid login credentials' });
await supabase.from(table).update({ last_login: new Date() }).eq('id', user.id);
} else {
return res.status(400).json({ error: 'loginCode or password required' });
}

const token = signToken({ id: user.id, email: user.email, accountType, role: user.role || accountType });
const needsPrefs = accountType === 'Scout' && !user.preferences_set;
const needsRegistration = loginCode && !user.registration_complete;
res.json({ token, accountType, needsPreferences: needsPrefs, needsRegistration,
user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email,
isSuper: user.is_super_user || false } });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Complete registration: set password, mark complete
router.post('/complete-registration', require('../utils/auth').requireAuth, async (req, res) => {
try {
const { newPassword, accountType } = req.body;
if (!newPassword || !accountType) return res.status(400).json({ error: 'newPassword and accountType required' });
if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
const table = TABLE_MAP[accountType];
if (!table || table === 'stratex') return res.status(400).json({ error: 'Invalid accountType' });
// requireAuth middleware already validated token
const userId = req.user.id;
const hash = await hashPassword(newPassword);
const { error } = await supabase.from(table).update({ password_hash: hash, registration_complete: true }).eq('id', userId);
if (error) throw error;
res.json({ message: 'Registration complete. Password set.' });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/forgot-password', async (req, res) => {
try {
const { email: rawEmail, accountType } = req.body;
const table = TABLE_MAP[accountType];
if (!table || table === 'stratex') return res.json({ message: 'If that email exists, a reset code has been sent.' });
const { data: user } = await supabase.from(table).select('id,first_name,email').eq('email', rawEmail.toLowerCase().trim()).single();
if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });
const code = await generateUniqueCode(table);
const exp = new Date(Date.now() + 30*60*1000);
await supabase.from(table).update({ login_code: code, login_code_expires: exp }).eq('id', user.id);
await email.sendResetPassword({ to: user.email, firstName: user.first_name, resetCode: code, accountType });
res.json({ message: 'If that email exists, a reset code has been sent.' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/reset-password', async (req, res) => {
try {
const { email: rawEmail, code, newPassword, accountType } = req.body;
if (!rawEmail||!code||!newPassword||!accountType) return res.status(400).json({ error: 'All fields required' });
if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
const table = TABLE_MAP[accountType];
if (!table) return res.status(400).json({ error: 'Invalid accountType' });
const { data: user } = await supabase.from(table).select('id,login_code,login_code_expires').eq('email', rawEmail.toLowerCase().trim()).single();
if (!user || user.login_code !== code.toUpperCase()) return res.status(400).json({ error: 'Invalid reset code' });
if (user.login_code_expires && new Date(user.login_code_expires) < new Date()) return res.status(400).json({ error: 'Code expired' });
const hash = await hashPassword(newPassword);
await supabase.from(table).update({ password_hash: hash, login_code: null, login_code_expires: null }).eq('id', user.id);
res.json({ message: 'Password updated successfully' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

// Change password (authenticated)
router.post('/change-password', require('../utils/auth').requireAuth, async (req, res) => {
try {
const { password } = req.body;
if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
const accountType = req.user.accountType;
const table = TABLE_MAP[accountType];
if (!table) return res.status(400).json({ error: 'Invalid account type' });
const hash = await hashPassword(password);
const { error } = await supabase.from(table).update({ password_hash: hash }).eq('id', req.user.id);
if (error) throw error;
res.json({ message: 'Password updated' });
} catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;