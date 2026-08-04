'use strict';

/*
 * ScoutLink Scout hydration gate V1.
 *
 * This script runs before the Scout page renderers. It keeps the approved
 * static/sample shell hidden until the live-data renderer has completed its
 * loading cycle. It never changes player data or page markup.
 */
(function scoutHydrationGateV1() {
  if (window.__scoutHydrationGateV1) return;
  window.__scoutHydrationGateV1 = true;

  var startedAt = Date.now();
  var sawLoading = false;
  var released = false;
  var settleTimer = null;
  var pollTimer = null;
  var observer = null;

  function storageValue(storage, key) {
    try { return storage.getItem(key) || ''; } catch (_) { return ''; }
  }

  function activeRole() {
    var candidates = [
      storageValue(sessionStorage, 'sl_public_demo_role'),
      storageValue(sessionStorage, 'sl_admin_demo_role'),
      storageValue(sessionStorage, 'sl_preview_role'),
      storageValue(sessionStorage, 'demoRole'),
      storageValue(sessionStorage, 'sl_active_experience'),
      window.Auth && window.Auth.type,
      storageValue(localStorage, 'sl_type')
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      var role = String(candidates[index] || '').trim().toLowerCase();
      if (role) return role;
    }
    return '';
  }

  function pathName() {
    return String(window.location.pathname || '/').replace(/\/+$/, '').toLowerCase();
  }

  function isScoutRoute() {
    var path = pathName();
    return path.indexOf('/scout') === 0 ||
      (path === '/player/profile' && activeRole() === 'scout') ||
      (document.body && document.body.classList.contains('scout-profile-route'));
  }

  function appHost() {
    return document.getElementById('scoutExperienceApp');
  }

  function roots() {
    var found = [document];
    var visited = new Set();

    function visit(root) {
      if (!root || visited.has(root)) return;
      visited.add(root);
      if (!root.querySelectorAll) return;
      root.querySelectorAll('*').forEach(function (element) {
        if (element.shadowRoot) {
          found.push(element.shadowRoot);
          visit(element.shadowRoot);
        }
      });
    }

    visit(document);
    return found;
  }

  function deepQuery(selector) {
    var available = roots();
    for (var index = 0; index < available.length; index += 1) {
      var match = available[index].querySelector && available[index].querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  function deepText() {
    return roots().map(function (root) {
      var node = root.querySelector && root.querySelector('.slv10-exact-root,.slv6-approved,.profile-route-error');
      return node ? String(node.textContent || '') : '';
    }).join(' ').replace(/\s+/g, ' ').trim();
  }

  function loadingNow() {
    var app = appHost();
    var path = pathName();
    if (!app) return true;
    if (deepQuery('.si64-loading')) return true;
    if (path === '/player/profile' && deepQuery('.profile-route-loading')) return true;
    if (app.classList.contains('is-loading')) {
      /* Pipeline keeps its historical class even after the exact runtime has
         finished. The exact runtime flag is the authoritative completion
         signal for that route. */
      if (path.indexOf('/scout/pipeline') === 0 && window.__slc2ExactReady && Date.now() - startedAt > 800) {
        return false;
      }
      return true;
    }
    return false;
  }

  function profileReady() {
    var player = window._profilePlayer;
    if (!player || !player.id) return false;

    var marker = deepQuery(
      '.full-profile-head,.profile-head,[data-player-attributes],#decisionSummary'
    );
    if (!marker) return false;

    var text = deepText().toLowerCase();
    if (!text) return false;
    if (text.indexOf('loading player details') >= 0) return false;
    if (text.indexOf('preparing the scout experience') >= 0) return false;
    return true;
  }

  function routeContentReady() {
    var path = pathName();
    var text = deepText().toLowerCase();

    if (path === '/player/profile') return profileReady();
    if (text.indexOf('scoutlink could not load') >= 0 || deepQuery('.profile-route-error,.empty.structured')) {
      return true;
    }
    if (path.indexOf('/scout/dashboard') === 0) {
      return Boolean(deepQuery('[data-dashboard-compatible],.dashboard-compatible-panel,.dashboard-home'));
    }
    if (path.indexOf('/scout/player-search') === 0) {
      var summary = deepQuery('[data-search-summary]');
      if (summary && /loading/i.test(String(summary.textContent || ''))) return false;
      return Boolean(deepQuery('[data-search-results],.search-results,.search-table'));
    }
    return Boolean(deepQuery('.slv10-exact-root,.slv6-approved'));
  }

  function release() {
    if (released) return;
    released = true;
    window.clearTimeout(settleTimer);
    window.clearInterval(pollTimer);
    if (observer) observer.disconnect();

    document.documentElement.classList.remove('sl-scout-hydration-pending');
    document.documentElement.removeAttribute('data-sl-hydration-slow');
    if (document.body) {
      document.body.dataset.slHydrationReady = '1';
      document.body.dataset.slHydrationState = 'ready';
    }

    var app = appHost();
    if (app) {
      app.setAttribute('aria-busy', 'false');
      app.style.removeProperty('visibility');
      app.style.removeProperty('opacity');
      app.style.removeProperty('pointer-events');
    }

    document.dispatchEvent(new CustomEvent('scoutlink:hydration-ready', {
      detail: { path: pathName() }
    }));
  }

  function scheduleRelease() {
    if (released || settleTimer) return;
    settleTimer = window.setTimeout(function () {
      settleTimer = null;
      if (!loadingNow() && routeContentReady()) release();
    }, 180);
  }

  function check() {
    if (released || !isScoutRoute()) return;
    var app = appHost();
    if (!app) return;

    document.documentElement.classList.add('sl-scout-hydration-pending');
    if (document.body) document.body.dataset.slHydrationState = 'pending';

    var loading = loadingNow();
    if (loading) sawLoading = true;

    if (!loading && routeContentReady()) {
      if (sawLoading || window.__slc2ExactReady || Date.now() - startedAt > 3000) {
        scheduleRelease();
      }
    }

    if (Date.now() - startedAt > 12000) {
      document.documentElement.dataset.slHydrationSlow = '1';
    }
  }

  function start() {
    if (!isScoutRoute()) return;
    document.documentElement.classList.add('sl-scout-hydration-pending');
    if (document.body) document.body.dataset.slHydrationState = 'pending';

    observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-busy', 'data-scout-route']
    });

    pollTimer = window.setInterval(check, 80);
    check();
  }

  document.addEventListener('scoutlink:profile-ready', check);
  document.addEventListener('scoutlink:scout-profile-rendered', check);
  document.addEventListener('scoutlink:data-ready', check);
  window.addEventListener('pageshow', check);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}());
