'use strict';

(function () {
  var CURRENT_SCRIPT = document.currentScript;
  var ASSET_VERSION = '20260731-6';
  var EXPERIENCE_SHELL_SCRIPT_ID = 'experienceShellV6Script';
  var PLAYER_INITIALS_SCRIPT_ID = 'playerInitialsV1Script';
  var COACH_LAYOUT_CSS_ID = 'coachLayoutCoreV1Css';
  var SCOUT_CORE_CSS_ID = 'scoutExperienceCoreV2Css';
  var SCOUT_CORE_SCRIPT_ID = 'scoutExperienceCoreV2Script';
  var PREDICTION_CSS_ID = 'scoutPredictionOverlaysV2Css';
  var PREDICTION_SCRIPT_ID = 'scoutPredictionOverlaysV2Script';
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
    return !!(
      window.heap &&
      typeof window.heap.addUserProperties === 'function'
    );
  }

  function safe(value) {
    if (value === undefined || value === '') return null;
    if (typeof value === 'string') return value.trim() || null;
    return value;
  }

  function pick(object, keys) {
    if (!object) return null;

    for (var index = 0; index < keys.length; index += 1) {
      var value = object[keys[index]];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }

    return null;
  }

  function isPublicDemo() {
    if (typeof window.isPublicDemoMode === 'function') {
      return window.isPublicDemoMode();
    }

    try {
      return sessionStorage.getItem('sl_public_demo') === '1';
    } catch (_) {
      return false;
    }
  }

  function isDemo() {
    if (typeof window.isDemoMode === 'function') {
      return window.isDemoMode();
    }

    try {
      return (
        localStorage.getItem('sl_demo_mode') === '1' ||
        isPublicDemo()
      );
    } catch (_) {
      return isPublicDemo();
    }
  }

  function publicDemoRole() {
    try {
      return sessionStorage.getItem('sl_public_demo_role');
    } catch (_) {
      return null;
    }
  }

  function selectedExperience(role) {
    if (role) return String(role);

    var routePath = String(
      window.location.pathname || ''
    ).toLowerCase();

    if (
      routePath.indexOf('/admin') === 0 ||
      routePath.indexOf('/company/admin') === 0 ||
      routePath.indexOf('/stratex') === 0 ||
      routePath.indexOf('stratex-') > -1
    ) {
      return 'Stratex';
    }

    if (
      routePath.indexOf('/coach') === 0 ||
      routePath.indexOf('coach-') > -1
    ) {
      return 'Coach';
    }

    if (
      routePath.indexOf('/scout') === 0 ||
      routePath.indexOf('scout-') > -1
    ) {
      return 'Scout';
    }

    if (
      routePath.indexOf('/player') === 0 ||
      routePath.indexOf('player-') > -1
    ) {
      return 'Player';
    }

    return null;
  }

  function authContext() {
    var Auth = window.Auth || {};
    var user = Auth.user || null;
    var role = Auth.type || null;

    if (!user) {
      try {
        user = JSON.parse(
          localStorage.getItem('sl_user') || 'null'
        );
      } catch (_) {}
    }

    if (!role) {
      try {
        role = localStorage.getItem('sl_type');
      } catch (_) {}
    }

    return {
      user: user || {},
      role: role || null
    };
  }

  function stableUserId(context) {
    if (isPublicDemo()) return null;

    var candidate = pick(
      context.user,
      [
        'id',
        'userId',
        'user_id',
        'auth_id',
        'supabase_id'
      ]
    );

    candidate =
      candidate == null
        ? ''
        : String(candidate).trim();

    if (
      !candidate ||
      UNSAFE_IDS[candidate.toLowerCase()]
    ) {
      return null;
    }

    return candidate;
  }

  function userProperties(context) {
    var user = context.user || {};
    var role = safe(context.role);

    return {
      Role: role,
      AccountType:
        safe(
          pick(user, ['accountType', 'account_type'])
        ) || role,
      SelectedExperience: selectedExperience(role),
      DemoMode: !!isDemo(),
      PublicDemo: !!isPublicDemo(),
      PublicDemoRole: safe(publicDemoRole()),
      TeamId: safe(
        pick(user, ['team_id', 'scout_team_id'])
      ),
      ApprovalStatus: safe(
        pick(user, ['approval_status', 'status'])
      ),
      IsSuperUser: !!pick(
        user,
        ['is_super_user', 'isSuper']
      )
    };
  }

  function compact(object) {
    var output = {};

    Object.keys(object || {}).forEach(function (key) {
      if (
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ''
      ) {
        output[key] = object[key];
      }
    });

    return output;
  }

  function experienceRole() {
    try {
      return String(
        sessionStorage.getItem('sl_public_demo_role') ||
        sessionStorage.getItem('sl_admin_demo_role') ||
        sessionStorage.getItem('sl_preview_role') ||
        sessionStorage.getItem('demoRole') ||
        (window.Auth && window.Auth.type) ||
        localStorage.getItem('sl_type') ||
        ''
      ).toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function isExperienceRoute() {
    var routePath = String(
      window.location.pathname || ''
    ).toLowerCase();
    var role = experienceRole();

    return (
      routePath.indexOf('/coach') === 0 ||
      routePath.indexOf('/scout') === 0 ||
      routePath.indexOf('/player') === 0 ||
      routePath.indexOf('/admin') === 0 ||
      routePath.indexOf('/company/admin') === 0 ||
      routePath.indexOf('/stratex') === 0 ||
      routePath.indexOf('coach-') > -1 ||
      routePath.indexOf('scout-') > -1 ||
      routePath.indexOf('player-') > -1 ||
      routePath.indexOf('stratex-') > -1 ||
      ['coach', 'scout', 'player', 'stratex']
        .indexOf(role) >= 0
    );
  }


  function isCoachRuntimeRoute() {
    var routePath = String(
      window.location.pathname || ''
    ).toLowerCase();
    var role = experienceRole();

    return (
      routePath.indexOf('/coach') === 0 ||
      routePath.indexOf('coach-') > -1 ||
      (
        (
          routePath.indexOf('/player/profile') === 0 ||
          routePath.indexOf('player-profile') > -1 ||
          routePath.indexOf('/admin') === 0 ||
          routePath.indexOf('/company/admin') === 0 ||
          routePath.indexOf('/stratex') === 0 ||
          routePath.indexOf('stratex-') > -1
        ) &&
        role === 'coach'
      )
    );
  }

  function isScoutRuntimeRoute() {
    var routePath = String(
      window.location.pathname || ''
    ).toLowerCase();
    var role = experienceRole();

    return (
      isPublicDemo() ||
      routePath.indexOf('/scout') === 0 ||
      routePath.indexOf('scout-') > -1 ||
      routePath.indexOf('/player/profile') === 0 ||
      routePath.indexOf('player-profile') > -1 ||
      routePath.indexOf('/admin') === 0 ||
      routePath.indexOf('/company/admin') === 0 ||
      routePath.indexOf('/stratex') === 0 ||
      routePath.indexOf('stratex-') > -1 ||
      routePath.indexOf('/experience-select') === 0 ||
      role === 'scout' ||
      role === 'stratex'
    );
  }

  function resolveFromCurrent(relativePath, fallback) {
    try {
      return CURRENT_SCRIPT && CURRENT_SCRIPT.src
        ? new URL(relativePath, CURRENT_SCRIPT.src).href
        : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function loadScript(id, relativePath, fallback) {
    if (document.getElementById(id)) return;

    var script = document.createElement('script');
    script.id = id;
    script.async = false;
    script.src = resolveFromCurrent(
      relativePath + '?v=' + ASSET_VERSION,
      fallback + '?v=' + ASSET_VERSION
    );

    (
      document.head ||
      document.documentElement
    ).appendChild(script);
  }

  function loadStylesheet(id, relativePath, fallback) {
    if (document.getElementById(id)) return;

    var stylesheet = document.createElement('link');
    stylesheet.id = id;
    stylesheet.rel = 'stylesheet';
    stylesheet.href = resolveFromCurrent(
      relativePath + '?v=' + ASSET_VERSION,
      fallback + '?v=' + ASSET_VERSION
    );

    (
      document.head ||
      document.documentElement
    ).appendChild(stylesheet);
  }

  function loadPlayerInitials() {
    loadScript(
      PLAYER_INITIALS_SCRIPT_ID,
      'player-initials-v1.js',
      '/frontend/js/player-initials-v1.js'
    );
  }

  function loadExperienceShell() {
    if (!isExperienceRoute()) return;

    loadScript(
      EXPERIENCE_SHELL_SCRIPT_ID,
      'experience-shell-v1.js',
      '/frontend/js/experience-shell-v1.js'
    );
  }


  function loadCoachLayout() {
    if (!isCoachRuntimeRoute()) return;

    loadStylesheet(
      COACH_LAYOUT_CSS_ID,
      '../css/coach-layout-core-v1.css',
      '/frontend/css/coach-layout-core-v1.css'
    );
  }

  function loadScoutRuntime() {
    if (!isScoutRuntimeRoute()) return;

    loadStylesheet(
      PREDICTION_CSS_ID,
      '../css/scout-prediction-overlays-v2.css',
      '/frontend/css/scout-prediction-overlays-v2.css'
    );
    loadScript(
      PREDICTION_SCRIPT_ID,
      'scout-prediction-overlays-v2.js',
      '/frontend/js/scout-prediction-overlays-v2.js'
    );
    loadStylesheet(
      SCOUT_CORE_CSS_ID,
      '../css/scout-experience-core-v2.css',
      '/frontend/css/scout-experience-core-v2.css'
    );
    loadScript(
      SCOUT_CORE_SCRIPT_ID,
      'scout-experience-core-v2.js',
      '/frontend/js/scout-experience-core-v2.js'
    );
  }

  function applyHeapContext() {
    if (!hasHeap()) return;

    var context = authContext();
    var id = stableUserId(context);
    if (!id) return;

    try {
      if (typeof window.heap.identify === 'function') {
        window.heap.identify(id);
      }

      window.heap.addUserProperties(
        compact(userProperties(context))
      );
    } catch (error) {
      if (
        window.console &&
        console.warn
      ) {
        console.warn(
          '[ScoutLink Heap] user context skipped:',
          error.message || error
        );
      }
    }
  }

  function loadAll() {
    loadPlayerInitials();
    loadExperienceShell();
    loadCoachLayout();
    loadScoutRuntime();
  }

  loadAll();

  window.applyScoutLinkHeapContext =
    applyHeapContext;

  document.addEventListener(
    'DOMContentLoaded',
    function () {
      loadAll();
      window.setTimeout(applyHeapContext, 0);
    }
  );

  window.addEventListener(
    'pageshow',
    function () {
      loadAll();
      window.setTimeout(applyHeapContext, 0);
    }
  );

  window.addEventListener('storage', loadAll);
}());
