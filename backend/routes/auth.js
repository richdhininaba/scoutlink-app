'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { hashPassword, verifyPassword, signToken, generateLoginCode } = require('../utils/auth');
const email = require('../services/email');

const TABLE_MAP = { Player:'players', Coach:'coaches', Scout:'scouts', Stratex:'stratex' };
const ROLE_ORDER = ['Stratex','Scout','Coach','Player'];

async function generateUniqueCode() {
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
    return supabase.from(table).select('*').eq('email', em).eq('is_active', true).eq('is_demo', false).maybeSingle()
      .then(r => ({ accountType, table, user: r.data || null, error: r.error }));
  }));
  return rows.filter(r => r.user);
}

async function onboardingStatus(accountType, userId) {
  try {
    const { data } = await supabase.from('onboarding_progress')
      .select('setup_wizard_completed')
      .eq('account_type', accountType).eq('user_id', userId).maybeSingle();
    return data || { setup_wizard_completed: false };
  } catch(e) {
    return { setup_wizard_completed: true };
  }
}

function rolePayload(accounts) {
  return accounts.map(a => ({
    accountType: a.accountType,
    label: a.accountType === 'Stratex' ? 'Stratex admin dashboard' : a.accountType + ' dashboard',
    userId: a.user.id,
    firstName: a.user.first_name,
    lastName: a.user.last_name
  }));
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    isSuper: user.is_super_user || false,
    adminRole: user.admin_role || user.role || null,
    isDemo: !!user.is_demo,
    teamName: user.team_name || user.club_name || null
  };
}

function accountDescription(accountType, demo) {
  if (accountType === 'Stratex') return 'Manage registrations, users, organisations, showcases and platform operations.';
  if (accountType === 'Coach') return demo ? 'Walk through squad management, player creation, fixtures and match facts.' : 'Manage your squad, player profiles, fixtures, match facts and video evidence.';
  if (accountType === 'Scout') return demo ? 'Explore player search, profiles, pipeline, predictions, exports and coach chat.' : 'Search players, register interest, run predictions and manage your pipeline.';
  if (accountType === 'Player') return demo ? 'Preview the player profile, notifications and video reel experience.' : 'View and maintain your player-facing profile.';
  return 'Open this ScoutLink experience.';
}

async function accountForEmail(accountType, emailAddr) {
  const table = TABLE_MAP[accountType];
  if (!table) return null;
  const { data } = await supabase.from(table).select('*')
    .eq('email', String(emailAddr || '').toLowerCase().trim())
    .eq('is_active', true).eq('is_demo', false).maybeSingle();
  return data || null;
}

function demoEmailPattern(accountType) {
  if (accountType === 'Coach') return 'demo.coach%@scoutlink.app';
  if (accountType === 'Scout') return 'demo.scout%@scoutlink.app';
  if (accountType === 'Player') return 'demo.player%@scoutlink.app';
  return null;
}

async function demoAccountOptions(accountType) {
  const table = TABLE_MAP[accountType];
  if (!table) return [];
  const select = accountType === 'Scout'
    ? 'id,first_name,last_name,email,club_name,is_demo'
    : 'id,first_name,last_name,email,team_name,is_demo';
  let q = supabase.from(table).select(select).eq('is_active', true).eq('is_demo', true);
  const pattern = demoEmailPattern(accountType);
  if (pattern) q = q.like('email', pattern);
  const limit = accountType === 'Player' ? 1 : 5;
  const { data } = await q.order('email').limit(limit);
  return (data || []).map(row => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    teamName: row.team_name || row.club_name || '',
    label: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email
  }));
}

async function demoAccount(accountType, demoUserId) {
  const demoEmails = {
    Coach: 'coach@test.scoutlink.com',
    Scout: 'scout@test.scoutlink.com',
    Player: 'demo.player01@scoutlink.app'
  };
  const table = TABLE_MAP[accountType];
  if (!table) return null;
  if (demoUserId) {
    const { data } = await supabase.from(table).select('*').eq('id', demoUserId).eq('is_active', true).eq('is_demo', true).maybeSingle();
    return data || null;
  }
  const pattern = demoEmailPattern(accountType);
  if (pattern) {
    const { data } = await supabase.from(table).select('*').eq('is_active', true).eq('is_demo', true).like('email', pattern).order('email').limit(1);
    if ((data || [])[0]) return data[0];
  }
  const emailAddr = demoEmails[accountType] || (accountType === 'Player' ? 'player@test.scoutlink.com' : null);
  if (!emailAddr) return null;
  const { data } = await supabase.from(table).select('*').eq('email', emailAddr).eq('is_active', true).eq('is_demo', true).maybeSingle();
  return data || null;
}

async function buildExperienceList(user) {
  if (user.accountType === 'Stratex') {
    const [demoCoaches, demoScouts, demoPlayers] = await Promise.all([
      demoAccountOptions('Coach'),
      demoAccountOptions('Scout'),
      demoAccountOptions('Player')
    ]);
    return [
      { accountType: 'Stratex', label: 'Stratex Admin', description: accountDescription('Stratex'), demo: false, admin: true },
      { accountType: 'Coach', label: 'Coach demo', description: accountDescription('Coach', true), demo: true, demoUsers: demoCoaches },
      { accountType: 'Scout', label: 'Scout demo', description: accountDescription('Scout', true), demo: true, demoUsers: demoScouts },
      { accountType: 'Player', label: 'Player demo', description: accountDescription('Player', true), demo: true, demoUsers: demoPlayers }
    ];
  }
  const accounts = await findActiveAccounts(user.email);
  return accounts.map(a => ({
    accountType: a.accountType,
    label: a.accountType,
    description: accountDescription(a.accountType),
    demo: false,
    current: a.accountType === user.accountType
  }));
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
        if (hasStratex) {
          req.body.accountType = 'Stratex';
        } else if (verified.length > 1) {
          return res.json({ requiresRoleSelection: true, roles: rolePayload(verified) });
        } else {
          req.body.accountType = verified[0].accountType;
        }
      } else if (loginCode) {
        const matched = accounts.filter(a => a.user.login_code === String(loginCode || '').toUpperCase());
        if (!matched.length) return res.status(401).json({ error: 'Invalid login code' });
        const stxMatched = matched.find(a => a.accountType === 'Stratex');
        if (stxMatched) req.body.accountType = 'Stratex';
        else if (matched.length > 1) return res.json({ requiresRoleSelection: true, roles: rolePayload(matched) });
        else req.body.accountType = matched[0].accountType;
      } else {
        return res.status(400).json({ error: 'loginCode or password required' });
      }
    }

    const selectedType = req.body.accountType || accountType;
    const table = TABLE_MAP[selectedType];
    if (!table) return res.status(400).json({ error: 'Invalid accountType' });
    const { data: user } = await supabase.from(table).select('*')
      .eq('email', rawEmail.toLowerCase().trim()).eq('is_active', true).eq('is_demo', false).single();
    if (!user) return res.status(401).json({ error: 'Invalid login credentials' });

    if (loginCode) {
      if (!user.login_code) return res.status(401).json({ error: 'No login code set for this account' });
      if (user.login_code !== loginCode.toUpperCase()) return res.status(401).json({ error: 'Invalid login code' });
      if (user.login_code_expires && new Date(user.login_code_expires) < new Date()) {
        return res.status(401).json({ error: 'Login code expired. Please use password reset to get a new one.' });
      }
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
    res.json({
      token,
      accountType: selectedType,
      needsPreferences: needsPrefs,
      needsRegistration,
      needsOnboarding: (selectedType === 'Coach' || selectedType === 'Scout') && !onboarding.setup_wizard_completed,
      user: publicUser(user)
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/experiences', require('../utils/auth').requireAuth, async (req, res) => {
  try {
    const experiences = await buildExperienceList(req.user);
    res.json({
      data: experiences,
      current: req.user.accountType,
      demoMode: !!req.user.demoMode,
      showSwitcher: experiences.length > 1 || req.user.accountType === 'Stratex' || !!req.user.demoMode
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/switch-experience', require('../utils/auth').requireAuth, async (req, res) => {
  try {
    const accountType = req.body.accountType;
    const includeTour = req.body.includeTour === true;
    if (!TABLE_MAP[accountType]) return res.status(400).json({ error: 'Invalid accountType' });
    let user = null;
    let demoMode = false;
    let role = accountType;
    if (req.body.demo === true) {
      if (req.user.accountType !== 'Stratex') return res.status(403).json({ error: 'Only Stratex admins can open demo experiences' });
      if (accountType === 'Stratex') return res.status(400).json({ error: 'The admin experience is not a demo account' });
      user = await demoAccount(accountType, req.body.demoUserId);
      if (!user) return res.status(404).json({ error: accountType + ' demo is not available' });
      demoMode = true;
      role = 'StratexTest' + accountType;
    } else {
      user = await accountForEmail(accountType, req.user.email);
      if (!user) return res.status(404).json({ error: 'That experience is not available for this account' });
    }
    const tokenPayload = { id: user.id, email: user.email, accountType, role, demoMode };
    if (demoMode) tokenPayload.actingStratexId = req.user.id;
    const token = signToken(tokenPayload);
    res.json({ token, accountType, demoMode, includeTour, user: publicUser(user) });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/test-access', require('../utils/auth').requireAuth, async (req, res) => {
  try {
    if (req.user.accountType !== 'Stratex') return res.status(403).json({ error: 'Only Stratex admins can open test experiences' });
    req.body.demo = true;
    req.url = '/switch-experience';
    const accountType = req.body.accountType;
    const user = await demoAccount(accountType, req.body.demoUserId);
    if (!user) return res.status(404).json({ error: 'Test ' + String(accountType || '').toLowerCase() + ' account is not available' });
    const token = signToken({ id: user.id, email: user.email, accountType, role: 'StratexTest' + accountType, demoMode: true, actingStratexId: req.user.id });
    res.json({ token, accountType, demoMode: true, includeTour: req.body.includeTour === true, user: publicUser(user) });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete-registration', require('../utils/auth').requireAuth, async (req, res) => {
  try {
    const { newPassword, accountType } = req.body;
    if (!newPassword || !accountType) return res.status(400).json({ error: 'newPassword and accountType required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const table = TABLE_MAP[accountType];
    if (!table) return res.status(400).json({ error: 'Invalid accountType' });
    const userId = req.user.id;
    const hash = await hashPassword(newPassword);
    const updateData = { password_hash: hash };
    if (['players','coaches','scouts','stratex'].includes(table)) updateData.registration_complete = true;
    const { error } = await supabase.from(table).update(updateData).eq('id', userId);
    if (error) throw error;
    res.json({ message: 'Registration complete. Password set.' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/*
 * V5 password reset:
 * - the public form no longer asks users to choose Player / Coach / Scout / Stratex.
 * - the API resolves active non-demo accounts by email.
 * - if one email maps to more than one real workspace, the reset code is sent
 *   without revealing that fact. After the user proves possession of the code,
 *   reset-password returns the eligible role choices.
 */
router.post('/forgot-password', async (req, res) => {
  const generic = { message: 'If that email exists, a reset code has been sent.' };
  try {
    const rawEmail = String(req.body.email || '').toLowerCase().trim();
    if (!rawEmail) return res.json(generic);
    const accounts = await findActiveAccounts(rawEmail);
    if (!accounts.length) return res.json(generic);

    const code = await generateUniqueCode();
    const exp = new Date(Date.now() + 30 * 60 * 1000);
    await Promise.all(accounts.map(a =>
      supabase.from(a.table).update({ login_code: code, login_code_expires: exp }).eq('id', a.user.id)
    ));

    const first = accounts[0].user;
    const sent = await email.sendResetPassword({
      to: first.email,
      email: first.email,
      firstName: first.first_name,
      resetCode: code,
      accountType: accounts.length === 1 ? accounts[0].accountType : 'ScoutLink'
    }).catch(err => ({ success:false, error:err.message }));

    if (!sent || sent.success === false) {
      console.error('[Forgot password email]', sent && sent.error);
      await Promise.all(accounts.map(a =>
        supabase.from(a.table).update({ login_code: null, login_code_expires: null }).eq('id', a.user.id)
      ));
    }
    return res.json(generic);
  } catch(err) {
    console.error('[Forgot password]', err);
    return res.json(generic);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const rawEmail = String(req.body.email || '').toLowerCase().trim();
    const code = String(req.body.code || '').trim().toUpperCase();
    const newPassword = String(req.body.newPassword || '');
    const requestedType = req.body.accountType || '';

    if (!rawEmail || !code || !newPassword) return res.status(400).json({ error: 'Email, reset code and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const accounts = await findActiveAccounts(rawEmail);
    const now = Date.now();
    const matched = accounts.filter(a =>
      a.user.login_code === code &&
      (!a.user.login_code_expires || new Date(a.user.login_code_expires).getTime() >= now)
    );

    if (!matched.length) return res.status(400).json({ error: 'Invalid or expired reset code' });

    if (!requestedType && matched.length > 1) {
      return res.json({ requiresRoleSelection:true, roles:rolePayload(matched) });
    }

    const selected = requestedType
      ? matched.find(a => a.accountType === requestedType)
      : matched[0];
    if (!selected) return res.status(400).json({ error: 'That reset code is not valid for the selected workspace.' });

    const hash = await hashPassword(newPassword);
    const { error } = await supabase.from(selected.table)
      .update({ password_hash: hash, login_code: null, login_code_expires: null })
      .eq('id', selected.user.id);
    if (error) throw error;

    /* Invalidate the same reset challenge on any other role sharing this email. */
    await Promise.all(matched.filter(a => a !== selected).map(a =>
      supabase.from(a.table).update({ login_code: null, login_code_expires: null }).eq('id', a.user.id)
    ));

    res.json({ message: 'Password updated successfully', accountType:selected.accountType });
  } catch(err) {
    console.error('[Reset password]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
  } catch(err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
