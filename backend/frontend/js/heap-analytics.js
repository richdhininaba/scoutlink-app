'use strict';

(function () {
  var CURRENT_SCRIPT = document.currentScript;
  var EXPERIENCE_SHELL_SCRIPT_ID = 'experienceShellV1Script';
  var UNSAFE_IDS = {
    '': true,
    user: true,
    guest: true,
    coach: true,
    scout: true,
    player: true,
    stratex: true,
    'marcus reed': true,
    'noah patel': true
  };

  function hasHeap() {
    return !!(window.heap && typeof window.heap.addUserProperties === 'function');
  }

  function safe(value) {
    if (value === undefined || value === '') return null;
    if (typeof value === 'string') return value.trim() || null;
    return value;
  }

  function pick(obj, keys) {
    if (!obj) return null;
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
  }

  function isPublicDemo() {
    if (typeof window.isPublicDemoMode === 'function') return window.isPublicDemoMode();
    try { return sessionStorage.getItem('sl_public_demo') === '1'; } catch (_) { return false; }
  }

  function isDemo() {
    if (typeof window.isDemoMode === 'function') return window.isDemoMode();
    try { return localStorage.getItem('sl_demo_mode') === '1' || isPublicDemo(); } catch (_) { return isPublicDemo(); }
  }

  function publicDemoRole() {
    try { return sessionStorage.getItem('sl_public_demo_role'); } catch (_) { return null; }
  }

  function selectedExperience(role) {
    if (role) return String(role);
    var path = String(window.location.pathname || '').toLowerCase();
    if (path.indexOf('/coach') === 0 || path.indexOf('coach-') > -1) return 'Coach';
    if (path.indexOf('/scout') === 0 || path.indexOf('scout-') > -1) return 'Scout';
    if (path.indexOf('/player') === 0 || path.indexOf('player-') > -1) return 'Player';
    if (path.indexOf('/admin') === 0 || path.indexOf('/company/admin') === 0 || path.indexOf('/stratex') === 0 || path.indexOf('stratex-') > -1) return 'Stratex';
    return null;
  }

  function authContext() {
    var Auth = window.Auth || {};
    var user = Auth.user || null;
    var role = Auth.type || null;
    if (!user) {
      try { user = JSON.parse(localStorage.getItem('sl_user') || 'null'); } catch (_) {}
    }
    if (!role) {
      try { role = localStorage.getItem('sl_type'); } catch (_) {}
    }
    return { user: user || {}, role: role || null };
  }

  function stableUserId(ctx) {
    if (isPublicDemo()) return null;
    var candidate = pick(ctx.user, ['id', 'userId', 'user_id', 'auth_id', 'supabase_id']);
    candidate = candidate == null ? '' : String(candidate).trim();
    if (!candidate || UNSAFE_IDS[candidate.toLowerCase()]) return null;
    return candidate;
  }

  function displayName(u) {
    return safe(pick(u, ['name', 'displayName'])) ||
      [safe(pick(u, ['firstName', 'first_name'])), safe(pick(u, ['lastName', 'last_name']))].filter(Boolean).join(' ') ||
      null;
  }

  function userProps(ctx) {
    var u = ctx.user || {};
    var role = safe(ctx.role);
    return {
      Role: role,
      AccountType: safe(pick(u, ['accountType', 'account_type'])) || role,
      SelectedExperience: selectedExperience(role),
      DemoMode: !!isDemo(),
      PublicDemo: !!isPublicDemo(),
      PublicDemoRole: safe(publicDemoRole()),
      TeamId: safe(pick(u, ['team_id', 'scout_team_id'])),
      ApprovalStatus: safe(pick(u, ['approval_status', 'status'])),
      IsSuperUser: !!pick(u, ['is_super_user', 'isSuper'])
    };
  }

  function compact(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (key) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') out[key] = obj[key];
    });
    return out;
  }

  function isExperienceRoute() {
    var path = String(window.location.pathname || '').toLowerCase();
    var role = '';
    try {
      role = String(
        (window.Auth && window.Auth.type) ||
        localStorage.getItem('sl_type') ||
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('demoRole') ||
        ''
      ).toLowerCase();
    } catch (_) {}

    return path.indexOf('/coach') === 0 ||
      path.indexOf('/scout') === 0 ||
      path.indexOf('/player') === 0 ||
      path.indexOf('/admin') === 0 ||
      path.indexOf('/company/admin') === 0 ||
      path.indexOf('/stratex') === 0 ||
      path.indexOf('coach-') > -1 ||
      path.indexOf('scout-') > -1 ||
      path.indexOf('player-') > -1 ||
      path.indexOf('stratex-') > -1 ||
      ['coach', 'scout', 'player', 'stratex'].indexOf(role) >= 0;
  }

  function loadExperienceShell() {
    if (!isExperienceRoute() || document.getElementById(EXPERIENCE_SHELL_SCRIPT_ID)) return;

    var script = document.createElement('script');
    script.id = EXPERIENCE_SHELL_SCRIPT_ID;
    script.async = false;

    try {
      script.src = CURRENT_SCRIPT && CURRENT_SCRIPT.src
        ? new URL('experience-shell-v1.js?v=20260730-1', CURRENT_SCRIPT.src).href
        : '/frontend/js/experience-shell-v1.js?v=20260730-1';
    } catch (_) {
      script.src = '/frontend/js/experience-shell-v1.js?v=20260730-1';
    }

    (document.head || document.documentElement).appendChild(script);
  }

  function applyHeapContext() {
    if (!hasHeap()) return;
    var ctx = authContext();
    var id = stableUserId(ctx);
    if (!id) return;
    try {
      if (typeof window.heap.identify === 'function') window.heap.identify(id);
      window.heap.addUserProperties(compact(userProps(ctx)));
    } catch (e) {
      if (window.console && console.warn) console.warn('[ScoutLink Heap] user context skipped:', e.message || e);
    }
  }

  loadExperienceShell();
  window.applyScoutLinkHeapContext = applyHeapContext;
  document.addEventListener('DOMContentLoaded', function () { setTimeout(applyHeapContext, 0); });
  window.addEventListener('pageshow', function () { setTimeout(applyHeapContext, 0); });
})();
