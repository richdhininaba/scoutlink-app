'use strict';

/* Shared ScoutLink runtime loader and Heap identity bridge. */
(function () {
  var CURRENT_SCRIPT = document.currentScript;
  var ASSET_VERSION = '20260804-2';
  var UNSAFE_IDS = {'':true,user:true,guest:true,coach:true,scout:true,player:true,stratex:true,'marcus reed':true,'noah patel':true};

  function safe(value) {
    if (value === undefined || value === null || value === '') return null;
    return typeof value === 'string' ? value.trim() || null : value;
  }
  function pick(object, keys) {
    for (var index = 0; object && index < keys.length; index += 1) {
      var value = object[keys[index]];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return null;
  }
  function isPublicDemo() {
    try {
      return (typeof window.isPublicDemoMode === 'function' && window.isPublicDemoMode()) || sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) { return false; }
  }
  function isDemo() {
    try {
      return (typeof window.isDemoMode === 'function' && window.isDemoMode()) || localStorage.getItem('sl_demo_mode') === '1' || isPublicDemo();
    } catch (_) { return isPublicDemo(); }
  }
  function experienceRole() {
    try {
      return String(
        sessionStorage.getItem('sl_public_demo_role') || sessionStorage.getItem('sl_admin_demo_role') ||
        sessionStorage.getItem('sl_preview_role') || sessionStorage.getItem('demoRole') ||
        (window.Auth && window.Auth.type) || localStorage.getItem('sl_type') || ''
      ).toLowerCase();
    } catch (_) { return ''; }
  }
  function routePath() { return String(window.location.pathname || '').toLowerCase(); }
  function isExperienceRoute() {
    var path = routePath(), role = experienceRole();
    return /\/(coach|scout|player|admin|stratex)(\/|$)/.test(path) || path.indexOf('/company/admin') === 0 ||
      /(?:coach|scout|player|stratex)-/.test(path) || ['coach','scout','player','stratex'].indexOf(role) >= 0;
  }
  function isCoachRuntimeRoute() {
    var path = routePath(), role = experienceRole();
    return path.indexOf('/coach') === 0 || path.indexOf('coach-') > -1 ||
      ((path.indexOf('/player/profile') === 0 || path.indexOf('player-profile') > -1 || path.indexOf('/admin') === 0 ||
        path.indexOf('/company/admin') === 0 || path.indexOf('/stratex') === 0 || path.indexOf('stratex-') > -1) && role === 'coach');
  }
  function isScoutRuntimeRoute() {
    var path = routePath(), role = experienceRole();
    return isPublicDemo() || path.indexOf('/scout') === 0 || path.indexOf('scout-') > -1 ||
      path.indexOf('/player/profile') === 0 || path.indexOf('player-profile') > -1 ||
      path.indexOf('/admin') === 0 || path.indexOf('/company/admin') === 0 || path.indexOf('/stratex') === 0 ||
      path.indexOf('stratex-') > -1 || path.indexOf('/experience-select') === 0 || role === 'scout' || role === 'stratex';
  }
  function isProfileRoute() {
    var path = routePath();
    return path.indexOf('/player/profile') === 0 || path.indexOf('player-profile') > -1;
  }

  function resolve(relativePath, fallback) {
    try { return CURRENT_SCRIPT && CURRENT_SCRIPT.src ? new URL(relativePath, CURRENT_SCRIPT.src).href : fallback; }
    catch (_) { return fallback; }
  }
  function loadScript(id, relativePath, fallback) {
    if (document.getElementById(id)) return;
    var script = document.createElement('script');
    script.id = id;
    script.async = false;
    script.src = resolve(relativePath + '?v=' + ASSET_VERSION, fallback + '?v=' + ASSET_VERSION);
    (document.head || document.documentElement).appendChild(script);
  }
  function loadStylesheet(id, relativePath, fallback) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = resolve(relativePath + '?v=' + ASSET_VERSION, fallback + '?v=' + ASSET_VERSION);
    (document.head || document.documentElement).appendChild(link);
  }

  function loadAll() {
    loadScript('dataMediaGuardV1Script','data-media-guard-v1.js','/js/data-media-guard-v1.js');
    loadScript('scoringV4ClientScript','scoring-v4-client.js','/js/scoring-v4-client.js');
    loadScript('playerInitialsV1Script','player-initials-v1.js','/js/player-initials-v1.js');

    if (isExperienceRoute()) {
      loadScript('experienceShellV7Script','experience-shell-v1.js','/js/experience-shell-v1.js');
    }
    if (isCoachRuntimeRoute()) {
      loadStylesheet('coachLayoutCoreV1Css','../css/coach-layout-core-v1.css','/css/coach-layout-core-v1.css');
    }
    if (isScoutRuntimeRoute()) {
      loadStylesheet('scoutPredictionOverlaysV2Css','../css/scout-prediction-overlays-v2.css','/css/scout-prediction-overlays-v2.css');
      loadScript('scoutPredictionOverlaysV2Script','scout-prediction-overlays-v2.js','/js/scout-prediction-overlays-v2.js');
      loadStylesheet('scoutExperienceCoreV2Css','../css/scout-experience-core-v2.css','/css/scout-experience-core-v2.css');
      loadScript('scoutExperienceCoreV2Script','scout-experience-core-v2.js','/js/scout-experience-core-v2.js');
      loadScript('scoutScoringV4Script','scout-scoring-v4.js','/js/scout-scoring-v4.js');
    }
    if (isDemo()) {
      loadScript('demoScoringV4AuthoritativeScript','demo-scoring-v4-authoritative.js','/js/demo-scoring-v4-authoritative.js');
      loadScript('demoScoringV4Script','demo-scoring-v4.js','/js/demo-scoring-v4.js');
    }
    if (isProfileRoute()) {
      loadScript('scoutProfileRuntimeV1Script','scout-profile-runtime-v1.js','/js/scout-profile-runtime-v1.js');
      loadScript('coachProfileV4OutputFixesScript','coach-profile-v4-output-fixes.js','/js/coach-profile-v4-output-fixes.js');
    }
  }

  function authContext() {
    var Auth = window.Auth || {};
    var user = Auth.user || null;
    var role = Auth.type || null;
    if (!user) { try { user = JSON.parse(localStorage.getItem('sl_user') || 'null'); } catch (_) {} }
    if (!role) { try { role = localStorage.getItem('sl_type'); } catch (_) {} }
    return {user:user || {},role:role || null};
  }
  function stableUserId(context) {
    if (isPublicDemo()) return null;
    var candidate = pick(context.user,['id','userId','user_id','auth_id','supabase_id']);
    candidate = candidate == null ? '' : String(candidate).trim();
    return !candidate || UNSAFE_IDS[candidate.toLowerCase()] ? null : candidate;
  }
  function selectedExperience(role) {
    if (role) return String(role);
    var path = routePath();
    if (path.indexOf('/admin') === 0 || path.indexOf('/company/admin') === 0 || path.indexOf('/stratex') === 0) return 'Stratex';
    if (path.indexOf('/coach') === 0) return 'Coach';
    if (path.indexOf('/scout') === 0) return 'Scout';
    if (path.indexOf('/player') === 0) return 'Player';
    return null;
  }
  function compact(object) {
    return Object.keys(object || {}).reduce(function (result,key) {
      if (object[key] !== undefined && object[key] !== null && object[key] !== '') result[key] = object[key];
      return result;
    },{});
  }
  function applyHeapContext() {
    if (!window.heap || typeof window.heap.addUserProperties !== 'function') return;
    var context = authContext();
    var id = stableUserId(context);
    if (!id) return;
    var user = context.user || {}, role = safe(context.role);
    try {
      if (typeof window.heap.identify === 'function') window.heap.identify(id);
      window.heap.addUserProperties(compact({
        Role:role,
        AccountType:safe(pick(user,['accountType','account_type'])) || role,
        SelectedExperience:selectedExperience(role),
        DemoMode:!!isDemo(),
        PublicDemo:!!isPublicDemo(),
        PublicDemoRole:safe((function () { try { return sessionStorage.getItem('sl_public_demo_role'); } catch (_) { return null; } }())),
        TeamId:safe(pick(user,['team_id','scout_team_id'])),
        ApprovalStatus:safe(pick(user,['approval_status','status'])),
        IsSuperUser:!!pick(user,['is_super_user','isSuper'])
      }));
    } catch (error) {
      if (window.console && console.warn) console.warn('[ScoutLink Heap] user context skipped:',error.message || error);
    }
  }

  loadAll();
  window.applyScoutLinkHeapContext = applyHeapContext;
  document.addEventListener('DOMContentLoaded',function () { loadAll(); setTimeout(applyHeapContext,0); });
  window.addEventListener('pageshow',function () { loadAll(); setTimeout(applyHeapContext,0); });
  window.addEventListener('storage',loadAll);
}());
