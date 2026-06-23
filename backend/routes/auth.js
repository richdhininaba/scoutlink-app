'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { hashPassword, verifyPassword, signToken, generateLoginCode } = require('../utils/auth');
const email = require('../services/email');

const TABLE_MAP = { Player:'players', Coach:'coaches', Scout:'scouts', Stratex:'stratex' };
const ROLE_ORDER = ['Stratex','Scout','Coach','Player'];

// Helper: generate unique login code across all user tables
async function generateUniqueCode(table) {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateLoginCode();
    const checks = await Promise.all(['players','coaches','scouts','stratex'].map(t =>
      supabase.from(t).select('id').eq('login_code', code).maybeSingle()
    ));
    if (!checks.some(r => r.data)) return code;
    attempts++;
  }
  throw new Error('Could not generate unique login code');
}

async function findActiveAccounts(emailAddr) {
const em = String(emailAddr || '').toLowerCase().trim();
if (!em) return [];
const rows = await Promise.all(ROLE_ORDER.map(accountType => {
const table = TABLE_MAP[accountType];
return supabase.from(table).select('*').eq('email', em).eq('is_active', true).maybeSingle()
.then(r => ({ accountType, table, user: r.data || null, error: r.error }));
}));
return rows.filter(r => r.user);
}

async function onboardingStatus(accountType, userId) {
try {
const { data } = await supabase.from('onboarding_progress')
.select('setup_wizard_completed,product_tour_completed')
.eq('account_type', accountType).eq('user_id', userId).maybeSingle();
return data || { setup_wizard_completed: false, product_tour_completed: false };
} catch(e) {
return { setup_wizard_completed: true, product_tour_completed: true };
}
}

function rolePayload(accounts, includeDemo) {
const roles = accounts.map(a => ({
accountType: a.accountType,
label: a.accountType === 'Stratex' ? 'Stratex admin dashboard' : a.accountType + ' dashboard',
userId: a.user.id,
firstName: a.user.first_name,
lastName: a.user.last_name
}));
if (includeDemo) {
roles.push(
{ accountType: 'Coach', demo: true, label: 'Test coach walkthrough' },
{ accountType: 'Scout', demo: true, label: 'Test scout walkthrough' },
{ accountType: 'Player', demo: true, label: 'Test player walkthrough' }
);
}
return roles;
}

router.post('/login', async (req, res) => {
try {
const { email: rawEmail, loginCode, password, accountType } = req.body;
if (!rawEmail) return res.status(400).json({ error: 'email required' });

if (!accountType) {
const accounts = await findActiveAccounts(rawEmail);
if (!accounts.length) return res.status(401).json({ error: 'Invalid login credentials' });
if (password) {
const verified = [];
for (const a of accounts) {
if (a.user.password_hash && await verifyPassword(password, a.user.password_hash)) verified.push(a);
}
if (!verified.length) return res.status(401).json({ error: 'Invalid login credentials' });
const hasStratex = verified.some(a => a.accountType === 'Stratex');
if (verified.length > 1 || hasStratex) {
const stx = verified.find(a => a.accountType === 'Stratex');
const stratexToken = stx ? signToken({ id: stx.user.id, email: stx.user.email, accountType: 'Stratex', role: stx.user.role || 'Stratex' }) : null;
return res.json({
requiresRoleSelection: true,
roles: rolePayload(verified, hasStratex),
stratexToken,
stratexUser: stx ? { id: stx.user.id, firstName: stx.user.first_name, lastName: stx.user.last_name, email: stx.user.email, adminRole: stx.user.admin_role || stx.user.role || null } : null
});
}
req.body.accountType = verified[0].accountType;
} else if (loginCode) {
const matched = accounts.filter(a => a.user.login_code === String(loginCode || '').toUpperCase());
if (!matched.length) return res.status(401).json({ error: 'Invalid login code' });
if (matched.length > 1) return res.json({ requiresRoleSelection: true, roles: rolePayload(matched, matched.some(a => a.accountType === 'Stratex')) });
req.body.accountType = matched[0].accountType;
} else {
return res.status(400).json({ error: 'loginCode or password required' });
}
}

const selectedType = req.body.accountType || accountType;
const table = TABLE_MAP[selectedType];
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

const token = signToken({ id: user.id, email: user.email, accountType: selectedType, role: user.role || selectedType });
const needsPrefs = selectedType === 'Scout' && !user.preferences_set;
const onboarding = await onboardingStatus(selectedType, user.id);
const needsRegistration = loginCode && user.registration_complete === false;
res.json({ token, accountType: selectedType, needsPreferences: needsPrefs, needsRegistration,
needsOnboarding: (selectedType === 'Coach' || selectedType === 'Scout') && !onboarding.setup_wizard_completed,
needsTour: (selectedType === 'Coach' || selectedType === 'Scout') && !onboarding.product_tour_completed,
user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email,
isSuper: user.is_super_user || false, adminRole: user.admin_role || user.role || null } });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/test-access', require('../utils/auth').requireAuth, async (req, res) => {
try {
if (req.user.accountType !== 'Stratex') return res.status(403).json({ error: 'Only Stratex admins can open test experiences' });
const accountType = req.body.accountType;
const demoEmails = {
Coach: 'coach@test.scoutlink.com',
Scout: 'scout@test.scoutlink.com',
Player: 'player@test.scoutlink.com'
};
const emailAddr = demoEmails[accountType];
const table = TABLE_MAP[accountType];
if (!emailAddr || !table) return res.status(400).json({ error: 'Choose Coach, Scout or Player test access' });
const { data: user, error } = await supabase.from(table).select('*').eq('email', emailAddr).eq('is_active', true).maybeSingle();
if (error || !user) return res.status(404).json({ error: 'Test ' + accountType.toLowerCase() + ' account is not available' });
const token = signToken({ id: user.id, email: user.email, accountType, role: 'StratexTest' + accountType, demoMode: true, actingStratexId: req.user.id });
res.json({ token, accountType, demoMode: true, user: { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email, isSuper: user.is_super_user || false } });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Complete registration: set password, mark complete
router.post('/complete-registration', require('../utils/auth').requireAuth, async (req, res) => {
try {
const { newPassword, accountType } = req.body;
if (!newPassword || !accountType) return res.status(400).json({ error: 'newPassword and accountType required' });
if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
const table = TABLE_MAP[accountType];
if (!table) return res.status(400).json({ error: 'Invalid accountType' });
// requireAuth middleware already validated token
const userId = req.user.id;
const hash = await hashPassword(newPassword);
const updateData = { password_hash: hash };
if (['players','coaches','scouts','stratex'].includes(table)) updateData.registration_complete = true;
const { error } = await supabase.from(table).update(updateData).eq('id', userId);
if (error) throw error;
res.json({ message: 'Registration complete. Password set.' });
} catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.post('/forgot-password', async (req, res) => {
try {
const { email: rawEmail, accountType } = req.body;
const table = TABLE_MAP[accountType];
if (!table) return res.json({ message: 'If that email exists, a reset code has been sent.' });
const { data: user } = await supabase.from(table).select('id,first_name,email').eq('email', rawEmail.toLowerCase().trim()).single();
if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });
const code = await generateUniqueCode(table);
const exp = new Date(Date.now() + 30*60*1000);
await supabase.from(table).update({ login_code: code, login_code_expires: exp }).eq('id', user.id);
await email.sendResetPassword({ to: user.email, email: user.email, firstName: user.first_name, resetCode: code, accountType });
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
