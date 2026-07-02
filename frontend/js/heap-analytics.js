'use strict';

(function () {
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
    return !!(window.heap && typeof window.heap.addEventProperties === 'function');
  }

  function safe(value) {
    if (value === undefined || value === '') return null;
    if (typeof value === 'string') return value.trim() || null;
    return value;
  }

  function safeBool(value) {
    return !!value;
  }

  function pick(obj, keys) {
    if (!obj) return null;
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return null;
  }

  function route() {
    return window.location.pathname || '/';
  }

  function appArea() {
    var path = route().toLowerCase();
    if (path.indexOf('/coach') === 0 || path.indexOf('coach-') > -1 || path.indexOf('add-player') > -1 || path.indexOf('match-facts') > -1) return 'coach';
    if (path.indexOf('/scout') === 0 || path.indexOf('scout-') > -1 || path.indexOf('player-search') > -1 || path.indexOf('compare-players') > -1) return 'scout';
    if (path.indexOf('/player') === 0 || path.indexOf('player-') > -1) return 'player';
    if (path.indexOf('/stratex') === 0 || path.indexOf('stratex-') > -1 || path.indexOf('/experience-select') === 0) return 'stratex';
    return 'public';
  }

  function deviceType() {
    var w = window.innerWidth || 0;
    if (w <= 767) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
  }

  function viewportGroup() {
    var w = window.innerWidth || 0;
    if (w <= 375) return 'phone_small';
    if (w <= 430) return 'phone_large';
    if (w <= 767) return 'mobile';
    if (w <= 1024) return 'tablet';
    if (w <= 1440) return 'desktop';
    return 'wide_desktop';
  }

  function environment() {
    var host = window.location.hostname;
    if (/localhost|127\.0\.0\.1/i.test(host)) return 'local';
    if (/vercel\.app$/i.test(host)) return 'preview';
    return 'production';
  }

  function publicDemoRole() {
    try { return sessionStorage.getItem('sl_public_demo_role'); } catch (_) { return null; }
  }

  function isPublicDemo() {
    if (typeof window.isPublicDemoMode === 'function') return window.isPublicDemoMode();
    try { return sessionStorage.getItem('sl_public_demo') === '1'; } catch (_) { return false; }
  }

  function isDemo() {
    if (typeof window.isDemoMode === 'function') return window.isDemoMode();
    try { return localStorage.getItem('sl_demo_mode') === '1' || isPublicDemo(); } catch (_) { return isPublicDemo(); }
  }

  function demoSessionId() {
    var key = 'sl_heap_demo_sid';
    try {
      var existing = sessionStorage.getItem(key);
      if (existing) return existing;
      var id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      if (window.crypto && crypto.getRandomValues) {
        var bytes = new Uint32Array(2);
        crypto.getRandomValues(bytes);
        id = 's' + bytes[0].toString(36) + bytes[1].toString(36);
      }
      sessionStorage.setItem(key, id);
      return id;
    } catch (_) {
      return null;
    }
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
    return { user: user || {}, role: role || appArea() };
  }

  function stableUserId(ctx) {
    if (isPublicDemo()) {
      var role = String(publicDemoRole() || ctx.role || 'demo').toLowerCase();
      var sid = demoSessionId();
      return sid ? 'public_demo_' + role + '_' + sid : null;
    }
    var candidate = pick(ctx.user, ['id', 'userId', 'user_id', 'auth_id', 'supabase_id', 'contact_id', 'crm_id']);
    candidate = candidate == null ? '' : String(candidate).trim();
    if (!candidate || UNSAFE_IDS[candidate.toLowerCase()]) return null;
    return candidate;
  }

  function pageType() {
    var path = route().replace(/^\/frontend\/pages\//, '/');
    if (path === '/' || path.indexOf('/frontend/index.html') === 0) return 'homepage';
    if (path.indexOf('/demo') === 0) return 'public_demo_selector';
    if (path.indexOf('/careers') === 0) return 'careers';
    if (path.indexOf('/login') === 0) return 'login';
    if (path.indexOf('/register') === 0) return 'registration';
    return appArea() + '_page';
  }

  function baseProps(ctx) {
    return {
      app_area: appArea(),
      route: route(),
      clean_route: route().replace(/^\/frontend\/pages\//, '/').replace(/\.html$/i, ''),
      page_type: pageType(),
      role_context: safe(ctx.role),
      selected_experience: safe(ctx.role ? String(ctx.role).toLowerCase() : appArea()),
      demo_mode: isDemo(),
      public_demo: isPublicDemo(),
      public_demo_role: safe(publicDemoRole()),
      device_type: deviceType(),
      viewport_width: window.innerWidth || null,
      viewport_group: viewportGroup(),
      environment: environment()
    };
  }

  function userProps(ctx, id) {
    var u = ctx.user || {};
    return {
      user_id: safe(id),
      role: safe(ctx.role),
      account_type: isPublicDemo() ? 'public_demo' : (isDemo() ? 'internal_demo' : 'real'),
      selected_experience: safe(ctx.role ? String(ctx.role).toLowerCase() : null),
      demo_mode: isDemo(),
      public_demo: isPublicDemo(),
      public_demo_role: safe(publicDemoRole()),
      organisation_id: safe(pick(u, ['organisation_id', 'organization_id', 'club_id'])),
      organisation_name: safe(pick(u, ['organisation_name', 'organization_name', 'clubName', 'club_name'])),
      team_id: safe(pick(u, ['team_id'])),
      team_name: safe(pick(u, ['teamName', 'team_name'])),
      scout_team_id: safe(pick(u, ['scout_team_id'])),
      scout_team_name: safe(pick(u, ['scout_team_name', 'scoutTeamName'])),
      plan_name: safe(pick(u, ['plan_name', 'subscription_plan', 'planName'])),
      subscription_tier: safe(pick(u, ['subscription_tier', 'plan_tier', 'tier'])),
      approval_status: safe(pick(u, ['approval_status', 'status'])),
      is_super_user: safeBool(pick(u, ['is_super_user', 'isSuper'])),
      country: safe(pick(u, ['country', 'scoutCountry'])),
      region: safe(pick(u, ['region', 'scoutRegion', 'city'])),
      age_group: safe(pick(u, ['age_group'])),
      created_at: safe(pick(u, ['created_at'])),
      last_login_at: safe(pick(u, ['last_login', 'last_login_at']))
    };
  }

  function accountProps(ctx) {
    var u = ctx.user || {};
    var id = pick(u, ['organisation_id', 'team_id', 'scout_team_id', 'club_id']);
    if (!id && !isPublicDemo()) return null;
    var role = ctx.role || publicDemoRole() || appArea();
    return {
      account_id: safe(id || ('public_demo_' + String(role).toLowerCase())),
      account_name: safe(pick(u, ['organisation_name', 'teamName', 'team_name', 'scout_team_name', 'clubName']) || (isPublicDemo() ? String(role) + ' public demo' : null)),
      account_type: isPublicDemo() ? 'public_demo' : (isDemo() ? 'internal_demo' : 'real'),
      organisation_type: safe(pick(u, ['organisation_type', 'team_type'])),
      plan_name: safe(pick(u, ['plan_name', 'subscription_plan', 'planName'])),
      subscription_tier: safe(pick(u, ['subscription_tier', 'tier'])),
      active_coaches_count: safe(pick(u, ['active_coaches_count'])),
      active_scouts_count: safe(pick(u, ['active_scouts_count'])),
      players_count: safe(pick(u, ['players_count'])),
      videos_count: safe(pick(u, ['videos_count'])),
      match_facts_count: safe(pick(u, ['match_facts_count'])),
      fixtures_count: safe(pick(u, ['fixtures_count'])),
      pipeline_count: safe(pick(u, ['pipeline_count'])),
      demo_account: isDemo()
    };
  }

  function compact(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (key) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') out[key] = obj[key];
    });
    return out;
  }

  function applyHeapContext() {
    if (!hasHeap()) return;
    var ctx = authContext();
    var id = stableUserId(ctx);
    var base = compact(baseProps(ctx));
    try {
      window.heap.addEventProperties(base);
      if (typeof window.heap.addPageviewProperties === 'function') {
        window.heap.addPageviewProperties(compact({
          route: base.route,
          clean_route: base.clean_route,
          page_title: document.title || null,
          app_area: base.app_area,
          role_context: base.role_context,
          demo_mode: base.demo_mode,
          public_demo: base.public_demo,
          selected_experience: base.selected_experience
        }));
      }
      if (id && typeof window.heap.identify === 'function') window.heap.identify(id);
      if (id && typeof window.heap.addUserProperties === 'function') window.heap.addUserProperties(compact(userProps(ctx, id)));
      var acct = accountProps(ctx);
      if (acct && typeof window.heap.addAccountProperties === 'function') window.heap.addAccountProperties(compact(acct));
    } catch (e) {
      if (window.console && console.warn) console.warn('[ScoutLink Heap] context skipped:', e.message || e);
    }
  }

  window.applyScoutLinkHeapContext = applyHeapContext;
  document.addEventListener('DOMContentLoaded', function () { setTimeout(applyHeapContext, 0); });
  window.addEventListener('pageshow', function () { setTimeout(applyHeapContext, 0); });
  window.addEventListener('resize', function () { clearTimeout(window.__slHeapResize); window.__slHeapResize = setTimeout(applyHeapContext, 250); });
})();
