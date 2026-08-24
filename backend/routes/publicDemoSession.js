'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { signToken } = require('../utils/auth');

const PUBLIC_DEMO_ACCOUNTS = Object.freeze({
  Scout: Object.freeze({
    table: 'scouts',
    email: 'demo.scout01@scoutlink.app'
  }),
  Coach: Object.freeze({
    table: 'coaches',
    email: 'demo.coach01@scoutlink.app'
  })
});

function publicUser(user, accountType) {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    accountType,
    teamName: user.team_name || user.club_name || null,
    isSuper: Boolean(user.is_super_user),
    isDemo: true,
    publicDemo: true
  };
}

router.post('/session', async (req, res) => {
  try {
    const requested = String(req.body?.accountType || req.body?.role || '').trim().toLowerCase();
    const accountType = requested === 'scout'
      ? 'Scout'
      : requested === 'coach'
        ? 'Coach'
        : '';

    if (!accountType) {
      return res.status(400).json({
        error: 'accountType must be Scout or Coach.'
      });
    }

    const config = PUBLIC_DEMO_ACCOUNTS[accountType];

    const { data: user, error } = await supabase
      .from(config.table)
      .select('*')
      .eq('email', config.email)
      .eq('is_demo', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({
        error: `${accountType} public demo profile is not available.`
      });
    }

    /*
     * This is a real signed backend JWT, but it is permanently marked as a
     * demo session. All routes that use isDemoSession/applyRealDataFilter
     * therefore stay inside demo rows.
     *
     * Keep the public token deliberately short-lived. A visitor can request a
     * fresh session from the public demo launcher at any time.
     */
    const token = signToken({
      id: user.id,
      email: user.email,
      accountType,
      role: accountType,
      demoMode: true,
      publicDemo: true
    }, '4h');

    res.set('Cache-Control', 'no-store');
    return res.json({
      token,
      accountType,
      demoMode: true,
      publicDemo: true,
      user: publicUser(user, accountType)
    });
  } catch (error) {
    console.error('[Public demo session]', error);
    return res.status(500).json({
      error: 'The public demo session could not be started.'
    });
  }
});

module.exports = router;
