'use strict';

/*
 * ScoutLink Public Demo Routing v2
 *
 * Keeps the isolated public demo inside /public-demo/* URLs, prevents the
 * demo banner/session from leaking onto public registration/auth pages, and
 * keeps internal Coach/Scout/Player navigation inside the public-demo prefix.
 */
(function () {
  var DEMO_FLAG = 'sl_public_demo';
  var DEMO_ROLE = 'sl_public_demo_role';
  var DEMO_PREFIX = '/public-demo';
  var DEMO_KEYS = [
    'sl_public_demo',
    'sl_public_demo_role',
    'sl_public_demo_state',
    'sl_public_demo_seed_players',
    'sl_public_demo_started_at',
    'sl_heap_demo_sid'
  ];

  function safeGet(storage, key) {
    try { return storage.getItem(key); }
    catch (_) { return null; }
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); }
    catch (_) {}
  }

  function normalPath(value) {
    var path = String(value || '/').split('?')[0].split('#')[0] || '/';
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path || '/';
  }

  function currentPath() {
    return normalPath(window.location.pathname || '/');
  }

  function demoActive() {
    return safeGet(sessionStorage, DEMO_FLAG) === '1';
  }

  function demoRole() {
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

    /* Player profile surfaces can be opened from either demo experience. */
    if (path === '/player' || path.indexOf('/player/') === 0) return true;
    return false;
  }

  function clearPublicDemoState() {
    DEMO_KEYS.forEach(function (key) { safeRemove(sessionStorage, key); });

    /* Only remove the temporary demo identity, never a genuine real session. */
    var token = safeGet(localStorage, 'sl_token');
    var rawUser = safeGet(localStorage, 'sl_user');
    var isDemoToken = token === 'public-demo-session';
    var isDemoUser = false;

    try {
      var user = rawUser ? JSON.parse(rawUser) : null;
      var id = user && (user.id || user.userId || user.user_id);
      isDemoUser = /^demo-/i.test(String(id || ''));
    } catch (_) {}

    if (isDemoToken || isDemoUser) {
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

    /*
     * Once the user leaves the actual demo experience for Register, Login,
     * Complete Registration, etc., demo mode ends. This is what prevents the
     * public-demo banner from leaking onto those pages.
     */
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
    if (window.__scoutLinkPublicDemoNavigatePatchV2) return;
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

    window.__scoutLinkPublicDemoNavigatePatchV2 = true;
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

  function boot() {
    normaliseCurrentDemoUrl();
    removeStrayBanner();
    guardBannerPlacement();

    if (demoActive() && isPublicDemoPath(currentPath())) {
      document.body && document.body.classList.add('public-demo-route-v2');
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
    normaliseCurrentDemoUrl();
    removeStrayBanner();
    installNavigatePatch();
    if (demoActive() && isPublicDemoPath(currentPath())) rewriteAnchors(document);
  });

  window.ScoutLinkPublicDemoRoutingV2 = {
    active: demoActive,
    role: demoRole,
    toPublicDemoPath: publicDemoPathFor,
    clear: clearPublicDemoState
  };
}());
