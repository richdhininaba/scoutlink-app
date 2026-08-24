'use strict';

/*
 * ScoutLink Public Demo Routing v3
 *
 * The public demo now uses a short-lived signed backend token for a fixed
 * seeded demo Scout / Coach instead of the old browser-only fake identity.
 * The URL boundary remains /public-demo/* and all genuine signed-in sessions
 * continue to be kept separate by demo-session-boundary-v1.js.
 */
(function () {
  var DEMO_FLAG = 'sl_public_demo';
  var DEMO_ROLE = 'sl_public_demo_role';
  var DEMO_PREFIX = '/public-demo';
  var API =
    window.API ||
    localStorage.getItem('sl_api_url') ||
    'https://scoutlink-api.vercel.app';

  var DEMO_KEYS = [
    'sl_public_demo',
    'sl_public_demo_role',
    'sl_public_demo_state',
    'sl_public_demo_seed_players',
    'sl_public_demo_started_at',
    'sl_heap_demo_sid'
  ];

  var sessionPromise = null;

  function safeGet(storage, key) {
    try { return storage.getItem(key); }
    catch (_) { return null; }
  }

  function safeSet(storage, key, value) {
    try {
      if (value === null || value === undefined) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch (_) {}
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); }
    catch (_) {}
  }

  function parseUser() {
    try {
      return JSON.parse(safeGet(localStorage, 'sl_user') || 'null');
    } catch (_) {
      return null;
    }
  }

  function normalPath(value) {
    var path = String(value || '/').split('?')[0].split('#')[0] || '/';
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path || '/';
  }

  function currentPath() {
    return normalPath(window.location.pathname || '/');
  }

  function publicDemoRoleFromPath(path) {
    path = normalPath(path);
    if (path === '/public-demo/scout' || path.indexOf('/public-demo/scout/') === 0) return 'Scout';
    if (path === '/public-demo/coach' || path.indexOf('/public-demo/coach/') === 0) return 'Coach';
    return '';
  }

  function isSignedDemoUser(user) {
    if (!user) return false;
    if (user.publicDemo === true || user.isDemo === true || user.demoMode === true) return true;
    var id = user.id || user.userId || user.user_id;
    return /^demo-/i.test(String(id || ''));
  }

  function demoActive() {
    return safeGet(sessionStorage, DEMO_FLAG) === '1';
  }

  function demoRole() {
    var pathRole = publicDemoRoleFromPath(currentPath());
    if (pathRole) return pathRole.toLowerCase();

    var role = String(
      safeGet(sessionStorage, DEMO_ROLE) ||
      safeGet(localStorage, 'sl_type') ||
      ''
    ).toLowerCase();

    return role === 'scout' ? 'scout' : 'coach';
  }

  function isPublicDemoPath(path) {
    path = normalPath(path);
    return path === DEMO_PREFIX || path.indexOf(DEMO_PREFIX + '/') === 0;
  }

  function isDemoProductPath(path, role) {
    path = normalPath(path);
    role = role || demoRole();

    if (role === 'scout' && (path === '/scout' || path.indexOf('/scout/') === 0)) return true;
    if (role === 'coach' && (path === '/coach' || path.indexOf('/coach/') === 0)) return true;

    if (path === '/player' || path.indexOf('/player/') === 0) return true;
    return false;
  }

  function hasCorrectSignedSession(role) {
    var token = safeGet(localStorage, 'sl_token');
    var user = parseUser();
    var type = String(safeGet(localStorage, 'sl_type') || '');

    if (!token || token === 'public-demo-session') return false;
    if (!isSignedDemoUser(user)) return false;
    if (String(type).toLowerCase() !== String(role || '').toLowerCase()) return false;

    return true;
  }

  function storeSignedSession(payload, role) {
    var accountType = role === 'Scout' ? 'Scout' : 'Coach';
    var user = payload && payload.user ? payload.user : {};

    user.isDemo = true;
    user.publicDemo = true;
    user.accountType = accountType;

    safeSet(sessionStorage, DEMO_FLAG, '1');
    safeSet(sessionStorage, DEMO_ROLE, accountType);
    safeSet(sessionStorage, 'sl_public_demo_started_at', new Date().toISOString());
    safeSet(sessionStorage, 'sl_public_demo_state', null);
    safeSet(sessionStorage, 'sl_public_demo_seed_players', null);

    safeSet(localStorage, 'sl_token', payload.token);
    safeSet(localStorage, 'sl_user', JSON.stringify(user));
    safeSet(localStorage, 'sl_type', accountType);
    safeSet(localStorage, 'sl_demo_mode', '1');
  }

  async function requestSignedSession(role) {
    role = role === 'Scout' ? 'Scout' : 'Coach';

    if (hasCorrectSignedSession(role)) {
      safeSet(sessionStorage, DEMO_FLAG, '1');
      safeSet(sessionStorage, DEMO_ROLE, role);
      safeSet(localStorage, 'sl_demo_mode', '1');
      return {
        token: safeGet(localStorage, 'sl_token'),
        accountType: role,
        user: parseUser()
      };
    }

    if (sessionPromise) return sessionPromise;

    sessionPromise = fetch(API + '/api/public-demo/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ accountType: role })
    }).then(async function (response) {
      var payload = {};
      try { payload = await response.json(); }
      catch (_) {}

      if (!response.ok || !payload.token || !payload.user) {
        throw new Error(payload.error || 'The public demo could not be started.');
      }

      storeSignedSession(payload, role);
      return payload;
    }).finally(function () {
      sessionPromise = null;
    });

    return sessionPromise;
  }

  async function startPublicDemo(role) {
    var accountType = role === 'Scout' ? 'Scout' : 'Coach';
    await requestSignedSession(accountType);

    var destination = accountType === 'Scout'
      ? '/public-demo/scout/dashboard'
      : '/public-demo/coach/dashboard';

    window.location.href = destination;
  }

  function clearPublicDemoState() {
    DEMO_KEYS.forEach(function (key) { safeRemove(sessionStorage, key); });

    var token = safeGet(localStorage, 'sl_token');
    var user = parseUser();
    var isDemoToken = token === 'public-demo-session';
    var isDemoIdentity = isSignedDemoUser(user);
    var isDemoMode = safeGet(localStorage, 'sl_demo_mode') === '1';

    if (isDemoToken || isDemoIdentity || isDemoMode) {
      ['sl_token','sl_user','sl_type','sl_demo_mode'].forEach(function (key) {
        safeRemove(localStorage, key);
      });
    } else {
      safeRemove(localStorage, 'sl_demo_mode');
    }
  }

  function publicDemoPathFor(path, role) {
    path = normalPath(path);
    role = role || demoRole();

    if (isPublicDemoPath(path)) return path;

    if (role === 'scout' && (path === '/scout' || path.indexOf('/scout/') === 0)) {
      return DEMO_PREFIX + '/scout' + path.slice('/scout'.length);
    }

    if (role === 'coach' && (path === '/coach' || path.indexOf('/coach/') === 0)) {
      return DEMO_PREFIX + '/coach' + path.slice('/coach'.length);
    }

    if (path === '/player' || path.indexOf('/player/') === 0) {
      return DEMO_PREFIX + '/' + role + path;
    }

    return '';
  }

  function rewriteUrl(url) {
    if (!demoActive()) return '';

    var parsed;
    try { parsed = new URL(url, window.location.href); }
    catch (_) { return ''; }

    if (parsed.origin !== window.location.origin) return '';

    var nextPath = publicDemoPathFor(parsed.pathname, demoRole());
    if (!nextPath || nextPath === parsed.pathname) return '';
    return nextPath + parsed.search + parsed.hash;
  }

  function normaliseCurrentDemoUrl() {
    if (!demoActive()) return;

    var path = currentPath();
    if (isPublicDemoPath(path)) return;

    if (isDemoProductPath(path, demoRole())) {
      var next = publicDemoPathFor(path, demoRole());
      if (next && window.history && window.history.replaceState) {
        window.history.replaceState(
          window.history.state,
          '',
          next + window.location.search + window.location.hash
        );
      }
      return;
    }

    if (path !== '/demo' && path !== '/public-demo') {
      clearPublicDemoState();
    }
  }

  function rewriteAnchor(anchor) {
    if (!anchor || !demoActive() || !isPublicDemoPath(currentPath())) return;
    var next = rewriteUrl(anchor.getAttribute('href') || anchor.href || '');
    if (next) anchor.setAttribute('href', next);
  }

  function rewriteAnchors(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('a[href]').forEach(rewriteAnchor);
  }

  function installAnchorBoundary() {
    document.addEventListener('click', function (event) {
      if (!demoActive() || !isPublicDemoPath(currentPath())) return;
      var anchor = event.target && event.target.closest
        ? event.target.closest('a[href]')
        : null;
      if (anchor) rewriteAnchor(anchor);
    }, true);

    var observer = new MutationObserver(function (mutations) {
      if (!demoActive() || !isPublicDemoPath(currentPath())) return;
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) return;
          if (node.matches && node.matches('a[href]')) rewriteAnchor(node);
          rewriteAnchors(node);
        });
      });
    });

    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  function installNavigatePatch() {
    if (window.__scoutLinkPublicDemoNavigatePatchV3) return;
    if (typeof window.navigateClean !== 'function') return;

    var originalNavigateClean = window.navigateClean;

    window.navigateClean = function (href) {
      var next = rewriteUrl(href);
      if (next) {
        window.location.href = next;
        return;
      }
      return originalNavigateClean.apply(this, arguments);
    };

    window.__scoutLinkPublicDemoNavigatePatchV3 = true;
  }

  function removeStrayBanner() {
    if (isPublicDemoPath(currentPath())) return;
    var banner = document.getElementById('publicDemoBanner');
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
  }

  function guardBannerPlacement() {
    var observer = new MutationObserver(function () {
      if (!isPublicDemoPath(currentPath())) removeStrayBanner();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }

  function exposeSignedLauncher() {
    window.startPublicDemo = startPublicDemo;
  }

  function bootstrapDirectPublicDemo() {
    var role = publicDemoRoleFromPath(currentPath());
    if (!role) return;

    if (hasCorrectSignedSession(role)) {
      safeSet(sessionStorage, DEMO_FLAG, '1');
      safeSet(sessionStorage, DEMO_ROLE, role);
      safeSet(localStorage, 'sl_demo_mode', '1');
      return;
    }

    /*
     * Direct links such as /public-demo/scout/dashboard are supported too.
     * Hide the incomplete shell, obtain the real signed demo identity, then
     * reload the exact URL once so all application scripts start authenticated.
     */
    if (document.documentElement) {
      document.documentElement.style.visibility = 'hidden';
    }

    requestSignedSession(role)
      .then(function () {
        window.location.replace(
          window.location.pathname +
          window.location.search +
          window.location.hash
        );
      })
      .catch(function (error) {
        if (document.documentElement) {
          document.documentElement.style.visibility = '';
        }
        console.error('[Public demo bootstrap]', error);
      });
  }

  function boot() {
    exposeSignedLauncher();
    bootstrapDirectPublicDemo();

    normaliseCurrentDemoUrl();
    removeStrayBanner();
    guardBannerPlacement();

    if (demoActive() && isPublicDemoPath(currentPath())) {
      document.body && document.body.classList.add('public-demo-route-v3');
      installNavigatePatch();
      installAnchorBoundary();
      rewriteAnchors(document);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot();
      window.setTimeout(installNavigatePatch, 0);
    });
  } else {
    boot();
    window.setTimeout(installNavigatePatch, 0);
  }

  window.addEventListener('pageshow', function () {
    exposeSignedLauncher();
    normaliseCurrentDemoUrl();
    removeStrayBanner();
    installNavigatePatch();
    if (demoActive() && isPublicDemoPath(currentPath())) rewriteAnchors(document);
  });

  window.ScoutLinkPublicDemoRoutingV2 = {
    active: demoActive,
    role: demoRole,
    toPublicDemoPath: publicDemoPathFor,
    clear: clearPublicDemoState,
    start: startPublicDemo
  };
}());
